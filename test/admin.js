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

function coerceToArray(value) {
  return Array.isArray(value) ? value : [value];
}

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

function baseNoPagingGetResponseCheck(res, testDocs) {
  res.should.have.status(200);
  res.body.should.have.property('data').that.is.an('array');
  res.body.should.have.property('hasMore').that.is.equal(false);
  res.body.should.have.property('maxItems').that.is.equal(testDocs.length);
  res.body.should.have.property('remainingItems').that.is.equal(0);
  
  var data = res.body.data;
  data.should.have.lengthOf(testDocs.length);
  
  return data;
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
  testDocs = coerceToArray(testDocs);
  
  function after() {
    // try to GET the data back
    chai.request(server)
    .get(path)
    .end((err, res) => {
      var data = baseNoPagingGetResponseCheck(res, testDocs);
      
      for (var resDoc of data) {
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

function testSortableGet(path, testDocs, checker, done) {
  testDocs = coerceToArray(testDocs);
  
  populateDB(testDocs, testDocs => {
    chai.request(server)
    .get(path)
    .end((err, res) => {
      var data = baseNoPagingGetResponseCheck(res, testDocs);
      
      var prevDoc = null;
      for (var doc of data) {
        if (prevDoc !== null) {
          checker(prevDoc, doc);
        }
        prevDoc = doc;
      }
      
      done();
    });
  }, done);
}

function getSortTester(path, testDocs, checker) {
  return done => testSortableGet(path, testDocs, checker, done);
}

function testStatusReturned(path, status, done, method = 'get') {
  // call the relevant HTTP method name function
  chai.request(server)[method](path).end((err, res) => {
    res.should.have.status(status);
    done();
  });
}

function getStatusTester(path, status, method = 'get') {
  return done => testStatusReturned(path, status, done, method);
}

describe('Admins', () => {
  beforeEach(done => {
    Admin.remove({}, err => done());
  });
  
  var path = '/v0/admins';
  var allTestAdmins = Object.values(testAdmins);
  
  describe('GET /v0/admins', () => {
    it('should initially get an empty array', getGetTester(path, []));
    it('can retrieve a single admin', getGetTester(path, testAdmins.simple1));
    it('can retrieve multiple admins',
      getGetTester(path, [testAdmins.simple1, testAdmins.simple2]));
    it('accepts unicode in admin names',
      getGetTester(path, testAdmins.unicode));
    it('accepts whitespace in admin names',
      getGetTester(path, testAdmins.whitespace));
    it('can retrieve all of them at once', getGetTester(path, allTestAdmins));
    
    var createdAscSort = (admin, admin2) =>
      new Date(admin.created).should.be.at.most(new Date(admin2.created));
    var createdDescSort = (admin, admin2) =>
      new Date(admin.created).should.be.at.least(new Date(admin2.created));
    it('defaults to sorting ascending by created date',
      getSortTester(path, allTestAdmins, createdAscSort));
    it('can sort descending by created date',
      getSortTester(path + '?direction=desc', allTestAdmins, createdDescSort));
    it('can explicitly sort ascending, defaulting to created date',
      getSortTester(path + '?direction=asc', allTestAdmins, createdAscSort));
    it('can explicitly sort by created date, defaulting to ascending',
      getSortTester(path + '?sort_by=created', allTestAdmins, createdAscSort));
    it('can explicitly sort ascending by created date',
      getSortTester(path + '?sort_by=created&direction=asc', allTestAdmins,
        createdAscSort));
    it('can explicitly sort descending by created date',
      getSortTester(path + '?sort_by=created&direction=desc', allTestAdmins,
        createdDescSort));
    
    var nameAscSort = (admin, admin2) =>
      admin.name.should.be.at.most(admin2.name);
    var nameDescSort = (admin, admin2) =>
      admin.name.should.be.at.least(admin2.name);
    it('can sort ascending by name lexicographically',
      getSortTester(path + '?sort_by=name', allTestAdmins, nameAscSort));
    it('can sort explicitly ascending by name lexicographically',
      getSortTester(path + '?sort_by=name&direction=asc', allTestAdmins,
        nameAscSort));
    it('can sort descending by name lexicographically',
      getSortTester(path + '?sort_by=name&direction=desc', allTestAdmins,
        nameDescSort));
    
    var idAscSort = (admin, admin2) => admin.id.should.be.below(admin2.id);
    var idDescSort = (admin, admin2) => admin.id.should.be.above(admin2.id);
    it('can sort ascending by ID',
      getSortTester(path + '?sort_by=id', allTestAdmins, idAscSort));
    it('can sort explicitly ascending by ID',
      getSortTester(path + '?sort_by=id&direction=asc', allTestAdmins,
        idAscSort));
    it('can sort descending by ID',
      getSortTester(path + '?sort_by=id&direction=desc', allTestAdmins,
        idDescSort));
    
    it('gives a 422 on an invalid sort_by value',
      getStatusTester(path + '?sort_by=INVALID', 422));
    it('gives a 422 on an empty sort_by value',
      getStatusTester(path + '?sort_by=', 422));
    it('gives a 422 on an invalid direction value',
      getStatusTester(path + '?direction=INVALID', 422));
    it('gives a 422 on an empty direction value',
      getStatusTester(path + '?direction=', 422));
    it('gives a 422 on invalid both sort_by and direction',
      getStatusTester(path + '?sort_by=foo&direction=bar', 422));
    it('gives a 422 on empty both sort_by and direction',
      getStatusTester(path + '?sort_by=&direction=', 422));
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