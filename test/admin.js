process.env.NODE_ENV = 'test';

var mongoose = require('mongoose');
var server = require('../server.js');
var Admin = require('../models/admin.js');

var chai = require('chai');
var chaiHttp = require('chai-http');

var should = chai.should();
chai.use(chaiHttp);

var testAdmins = {
  simple1: {
    name: 'Testy McTestface',
    item: {
      read: true,
      write: false,
    },
    checkout: {
      read: false,
      write: false
    },
    patron: {
      read: false,
      write: true
    },
    signIn: true,
    signOut: true
  },
  simple2: {
    name: 'Another Name',
    item: {
      read: false,
      write: false,
    },
    checkout: {
      read: false,
      write: true
    },
    patron: {
      read: true,
      write: false
    },
    signIn: false,
    signOut: false
  },
  unicode: {
    name: 'Úñí¢öðè ïß ©öół 😃😃😃',
    item: {
      read: true,
      write: false,
    },
    checkout: {
      read: false,
      write: false
    },
    patron: {
      read: false,
      write: true
    },
    signIn: true,
    signOut: true
  },
  empty: {
    name: '',
    item: {
      read: false,
      write: false,
    },
    checkout: {
      read: false,
      write: false
    },
    patron: {
      read: false,
      write: false
    },
    signIn: false,
    signOut: false
  },
  whitespace: {
    name: '             \t\t    \n\t       ',
    item: {
      read: true,
      write: true,
    },
    checkout: {
      read: true,
      write: true
    },
    patron: {
      read: true,
      write: true
    },
    signIn: true,
    signOut: true
  },
};

function populateDB(docs, callbackSuccess, callbackErr) {
  var docArr = Array.isArray(docs) ? docs : [docs];
  
  var promises = [];
  for (var doc of docArr) {
    promises.push(new Admin(doc).save());
  }
  
  Promise.all(promises).then(function() {
    callbackSuccess(docs, ...arguments);
  }, callbackErr);
}

function checkAndSanitizeResponseDoc(doc) {
  doc.should.have.property('id');
  doc.should.not.have.property('_id');
  delete doc.id;

  doc.should.have.property('created');
  doc.should.have.property('updated');
  new Date(doc.updated).should.be.at.most(new Date(doc.created));
  delete doc.updated;
  delete doc.created;
  
  return doc;
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
          res.body.should.have.lengthOf(0);
          done();
        });
    });
    it('can retrieve a single admin', done => {
      populateDB(testAdmins.simple1, admin => {
        // try to GET the data back
        chai.request(server)
          .get('/v0/admins')
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.an('array');
            res.body.should.have.lengthOf(1);
            
            var resAdmin = checkAndSanitizeResponseDoc(res.body[0]);
            resAdmin.should.deep.equal(admin);
            
            done();
          });
      }, done);
    });
  });
});