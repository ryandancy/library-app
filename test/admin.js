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
  
  return doc;
}

function testGet(path, testDocs, done) {
  testDocs = Array.isArray(testDocs) ? testDocs : [testDocs];
  
  function after() {
    // try to GET the data back
    chai.request(server)
    .get(path)
    .end((err, res) => {
      res.should.have.status(200);
      res.body.should.be.an('array');
      res.body.should.have.lengthOf(testDocs.length);
      
      for (var resDoc of res.body) {
        var doc = checkAndSanitizeResponseDoc(resDoc);
        delete doc.created;
        delete doc.updated;
        testDocs.should.deep.include(doc);
      }
      
      done();
    });
  }
  
  if (testDocs === []) {
    after();
  } else {
    populateDB(testDocs, after, done);
  }
}

function getGetTester(path, testDocs) {
  return done => testGet(path, testDocs, done);
}

describe('Admins', () => {
  beforeEach(done => {
    Admin.remove({}, err => done());
  });
  var path = '/v0/admins';
  describe('GET /v0/admins', () => {
    it('should initially get an empty array', getGetTester(path, []));
    it('can retrieve a single admin', getGetTester(path, testAdmins.simple1));
    it('can retrieve multiple admins',
      getGetTester(path, [testAdmins.simple1, testAdmins.simple2]));
    it('accepts unicode in admin names',
      getGetTester(path, testAdmins.unicode));
    it('accepts whitespace in admin names',
      getGetTester(path, testAdmins.whitespace));
    it('can retrieve all of them at once',
      getGetTester(path, Object.values(testAdmins)));
    // TODO cleanup all the copy + pasting
    it('defaults to sorting ascending by created date', done => {
      populateDB(Object.values(testAdmins), testAdmins => {
        chai.request(server)
        .get(path)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.an('array');
          res.body.should.have.lengthOf(testAdmins.length);
          
          var prevAdmin = null;
          for (var admin of res.body) {
            if (prevAdmin !== null) {
              new Date(prevAdmin.created).should.be
                .at.most(new Date(admin.created));
            }
            prevAdmin = admin;
          }
          
          done();
        });
      }, done);
    });
    it('can sort descending by created date', done => {
      populateDB(Object.values(testAdmins), testAdmins => {
        chai.request(server)
        .get(path + '?direction=desc')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.an('array');
          res.body.should.have.lengthOf(testAdmins.length);
          
          var prevAdmin = null;
          for (var admin of res.body) {
            if (prevAdmin !== null) {
              new Date(prevAdmin.created).should.be
                .at.least(new Date(admin.created));
            }
            prevAdmin = admin;
          }
          
          done();
        });
      }, done);
    });
    it('can explicitly sort by created date, defaulting to ascending', done => {
      populateDB(Object.values(testAdmins), testAdmins => {
        chai.request(server)
        .get(path + '?sort_by=created')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.an('array');
          res.body.should.have.lengthOf(testAdmins.length);
          
          var prevAdmin = null;
          for (var admin of res.body) {
            if (prevAdmin !== null) {
              new Date(prevAdmin.created).should.be
                .at.most(new Date(admin.created));
            }
            prevAdmin = admin;
          }
          
          done();
        });
      }, done);
    });
    it('can explicitly sort ascending by created date', done => {
      populateDB(Object.values(testAdmins), testAdmins => {
        chai.request(server)
        .get(path + '?sort_by=created&direction=asc')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.an('array');
          res.body.should.have.lengthOf(testAdmins.length);
          
          var prevAdmin = null;
          for (var admin of res.body) {
            if (prevAdmin !== null) {
              new Date(prevAdmin.created).should.be
                .at.most(new Date(admin.created));
            }
            prevAdmin = admin;
          }
          
          done();
        });
      }, done);
    });
    it('can explicitly sort descending by created date', done => {
      populateDB(Object.values(testAdmins), testAdmins => {
        chai.request(server)
        .get(path + '?sort_by=created&direction=desc')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.an('array');
          res.body.should.have.lengthOf(testAdmins.length);
          
          var prevAdmin = null;
          for (var admin of res.body) {
            if (prevAdmin !== null) {
              new Date(prevAdmin.created).should.be
                .at.least(new Date(admin.created));
            }
            prevAdmin = admin;
          }
          
          done();
        });
      }, done);
    });
    it('can sort ascending by name lexicographically', done => {
      populateDB(Object.values(testAdmins), testAdmins => {
        chai.request(server)
        .get(path + '?sort_by=name')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.an('array');
          res.body.should.have.lengthOf(testAdmins.length);
          
          var prevAdmin = null;
          for (var admin of res.body) {
            if (prevAdmin !== null) {
              prevAdmin.name.should.be.at.most(admin.name);
            }
            prevAdmin = admin;
          }
          
          done();
        });
      }, done);
    });
    it('can sort explicitly ascending by name lexicographically', done => {
      populateDB(Object.values(testAdmins), testAdmins => {
        chai.request(server)
        .get(path + '?sort_by=name&direction=asc')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.an('array');
          res.body.should.have.lengthOf(testAdmins.length);
          
          var prevAdmin = null;
          for (var admin of res.body) {
            if (prevAdmin !== null) {
              prevAdmin.name.should.be.at.most(admin.name);
            }
            prevAdmin = admin;
          }
          
          done();
        });
      }, done);
    });
    it('can sort descending by name lexicographically', done => {
      populateDB(Object.values(testAdmins), testAdmins => {
        chai.request(server)
        .get(path + '?sort_by=name&direction=desc')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.an('array');
          res.body.should.have.lengthOf(testAdmins.length);
          
          var prevAdmin = null;
          for (var admin of res.body) {
            if (prevAdmin !== null) {
              prevAdmin.name.should.be.at.least(admin.name);
            }
            prevAdmin = admin;
          }
          
          done();
        });
      }, done);
    });
    it('can sort ascending by ID', done => {
      populateDB(Object.values(testAdmins), testAdmins => {
        chai.request(server)
        .get(path + '?sort_by=id')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.an('array');
          res.body.should.have.lengthOf(testAdmins.length);
          
          var prevAdmin = null;
          for (var admin of res.body) {
            if (prevAdmin !== null) {
              prevAdmin.id.should.be.below(admin.id);
            }
            prevAdmin = admin;
          }
          
          done();
        });
      }, done);
    });
    it('can sort explicitly ascending by ID', done => {
      populateDB(Object.values(testAdmins), testAdmins => {
        chai.request(server)
        .get(path + '?sort_by=id&direction=asc')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.an('array');
          res.body.should.have.lengthOf(testAdmins.length);
          
          var prevAdmin = null;
          for (var admin of res.body) {
            if (prevAdmin !== null) {
              prevAdmin.id.should.be.below(admin.id);
            }
            prevAdmin = admin;
          }
          
          done();
        });
      }, done);
    });
    it('can sort descending by ID', done => {
      populateDB(Object.values(testAdmins), testAdmins => {
        chai.request(server)
        .get(path + '?sort_by=id&direction=desc')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.an('array');
          res.body.should.have.lengthOf(testAdmins.length);
          
          var prevAdmin = null;
          for (var admin of res.body) {
            if (prevAdmin !== null) {
              prevAdmin.id.should.be.above(admin.id);
            }
            prevAdmin = admin;
          }
          
          done();
        });
      }, done);
    });
  });
  describe('POST /v0/admins', () => {
    it('creates a valid admin', done => {
      chai.request(server)
      .post(path)
      .send(testAdmins.simple1)
      .end((err, res) => {
        res.should.have.status(201);
        res.body.should.deep.equal({});
        res.should.have.property('text').that.is.equal('');
        res.header.should.have.property('location')
          .that.match(/\/v0\/admins\/[\w\d]+/);
        
        var location = res.header.location;
        var id = location.slice(location.lastIndexOf('/') + 1);
        
        // see if it was set in the database
        Admin.findOne(testAdmins.simple1, (err, admin) => {
          should.not.exist(err);
          should.exist(admin);
          admin._id.toString().should.equal(id);
          done();
        });
      });
    });
  });
});