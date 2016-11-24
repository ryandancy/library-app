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
  delete doc.updated;
  delete doc.created;
  
  return doc;
}

function testGet(testDocs, done) {
  testDocs = Array.isArray(testDocs) ? testDocs : [testDocs];
  
  function after() {
    // try to GET the data back
    chai.request(server)
    .get('/v0/admins')
    .end((err, res) => {
      res.should.have.status(200);
      res.body.should.be.an('array');
      res.body.should.have.lengthOf(testDocs.length);
      
      for (var resDoc of res.body) {
        var doc = checkAndSanitizeResponseDoc(resDoc);
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

function getGetTester(testDocs) {
  return done => testGet(testDocs, done);
}

describe('Admins', () => {
  beforeEach(done => {
    Admin.remove({}, err => done());
  });
  describe('GET /v0/admins', () => {
    it('should initially get an empty array', getGetTester([]));
    it('can retrieve a single admin', getGetTester(testAdmins.simple1));
    it('can retrieve multiple admins',
      getGetTester([testAdmins.simple1, testAdmins.simple2]));
    it('accepts unicode in admin names', getGetTester(testAdmins.unicode));
    it('accepts whitespace in admin names', getGetTester(testAdmins.whitespace));
    it('can retrieve all of them at once',
      getGetTester(Object.values(testAdmins)));
  });
});