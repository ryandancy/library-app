process.env.NODE_ENV = 'test';

var mongoose = require('mongoose');
var server = require('../server.js');
var Admin = require('../models/admin.js');

var chai = require('chai');
var chaiHttp = require('chai-http');
var jsv = require('jsverify');

var should = chai.should();
chai.use(chaiHttp);

var arbReadWritePermission = jsv.record({read: jsv.bool, write: jsv.bool});

var arbAdmin = jsv.record({
  name: jsv.string,
  item: arbReadWritePermission,
  checkout: arbReadWritePermission,
  patron: arbReadWritePermission,
  signIn: jsv.bool,
  signOut: jsv.bool
});

function populateDB(admins, callbackSuccess, callbackErr) {
  var promises = [];
  for (var admin of admins) {
    promises.push(new Admin(admin).save());
  }
  Promise.all(promises).then(callbackSuccess, callbackErr);
}

describe('Admins', () => {
  beforeEach(done => {
    Admin.remove({}, err => done());
  });
  describe('GET /v0/admins', () => {
    it('should initially get an empty array', done => {
      chai.request(server)
        .get('/v0/admins')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.an('array');
          res.body.length.should.be.equal(0);
          done();
        });
    });
    jsv.property('can retrieve some data', jsv.nearray(arbAdmin),
      admins => new Promise(function(resolve, reject) {
        populateDB(admins, () => {
          // try to GET the data back
          chai.request(server)
            .get('/v0/admins')
            .end((err, res) => {
              res.should.have.status(200);
              res.body.should.be.an('array');
              res.body.length.should.be.equal(admins.length);
              for (var admin of res.body) {
                should.exist(admin.id);
                should.not.exist(admin._id);
                delete admin.id;
                admins.should.include(admin);
              }
              resolve();
            });
        }, err => reject(err));
      }));
  });
});