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

function testStatusReturned(path, status, done, admins = [], method = 'get') {
  // call the relevant HTTP method name function
  populateDB(Array.from(admins), () => {
    chai.request(server)[method](path).end((err, res) => {
      res.should.have.status(status);
      done();
    });
  });
}

function getStatusTester(path, status, admins = [], method = 'get') {
  return done => testStatusReturned(path, status, done, admins, method);
}

function testPaging(path, testDocs, values, done) {
  if (values.maxItems === undefined) values.maxItems = docs.length;
  
  populateDB(Array.from(testDocs), docs => {
    chai.request(server)
    .get(path)
    .end((err, res) => {
      res.should.have.status(values.status);
      res.body.should.have.property('hasMore').that.is.equal(values.hasMore);
      res.body.should.have.property('maxItems').that.is.equal(values.maxItems);
      res.body.should.have.property('remainingItems')
        .that.is.equal(values.remainingItems);
      
      if (values.range) {
        res.headers.should.have.property('range').that.is.equal(values.range);
      } else {
        res.headers.should.not.have.property('range');
      }
      
      done();
    });
  }, done);
}

function getPagingTester(path, docs, values) {
  return done => testPaging(path, docs, values, done);
}

function* generateAdmins(num) {
  for (var i = 0; i < num; i++) {
    yield {
      name: 'GeneratedTestAdmin-' + num,
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
    };
  }
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
    
    it('has correct paging on no admins, no query string',
      getPagingTester(path, [], {
        status: 200,
        hasMore: false,
        maxItems: 0,
        remainingItems: 0,
        range: false
      })
    );
    it('has correct paging on one admin, no query string',
      getPagingTester(path, generateAdmins(1), {
        status: 200,
        hasMore: false,
        maxItems: 1,
        remainingItems: 0,
        range: false
      })
    );
    it('has correct paging on two admins, no query string',
      getPagingTester(path, generateAdmins(2), {
        status: 200,
        hasMore: false,
        maxItems: 2,
        remainingItems: 0,
        range: false
      })
    );
    it('has correct paging on 31 admins, no query string',
      getPagingTester(path, generateAdmins(31), {
        status: 206,
        hasMore: true,
        maxItems: 31,
        remainingItems: 1,
        range: '0-29/31'
      })
    );
    it('has correct paging on 30 admins, no query string',
      getPagingTester(path, generateAdmins(30), {
        status: 200,
        hasMore: false,
        maxItems: 30,
        remainingItems: 0,
        range: false
      })
    );
    it('handles explicit page=0, implicit per_page=30, 30 admins',
      getPagingTester(path + '?page=0', generateAdmins(30), {
        status: 200,
        hasMore: false,
        maxItems: 30,
        remainingItems: 0,
        range: false
      })
    );
    it('handles implicit page=0, explicit per_page=30, 30 admins',
      getPagingTester(path + '?per_page=30', generateAdmins(30), {
        status: 200,
        hasMore: false,
        maxItems: 30,
        remainingItems: 0,
        range: false
      })
    );
    it('handles explicit page=0, explicit per_page=30, 30 admins',
      getPagingTester(path + '?page=0&per_page=30', generateAdmins(30), {
        status: 200,
        hasMore: false,
        maxItems: 30,
        remainingItems: 0,
        range: false
      })
    );
    it('handles implicit page=0, explicit per_page=10, 15 admins',
      getPagingTester(path + '?per_page=10', generateAdmins(15), {
        status: 206,
        hasMore: true,
        maxItems: 15,
        remainingItems: 5,
        range: '0-9/15'
      })
    );
    it('handles implicit page=0, explicit per_page=20, 15 admins',
      getPagingTester(path + '?per_page=20', generateAdmins(15), {
        status: 200,
        hasMore: false,
        maxItems: 15,
        remainingItems: 0,
        range: false
      })
    );
    it('handles explicit page=0, explicit per_page=10, 15 admins',
      getPagingTester(path + '?page=0&per_page=10', generateAdmins(15), {
        status: 206,
        hasMore: true,
        maxItems: 15,
        remainingItems: 5,
        range: '0-9/15'
      })
    );
    it('handles explicit page=1, implicit per_page=30, 40 admins',
      getPagingTester(path + '?page=1', generateAdmins(40), {
        status: 206,
        hasMore: false,
        maxItems: 40,
        remainingItems: 0,
        range: '30-39/40'
      })
    );
    it('handles explicit page=1, explicit per_page=10, 15 admins',
      getPagingTester(path + '?page=1&per_page=10', generateAdmins(15), {
        status: 206,
        hasMore: false,
        maxItems: 15,
        remainingItems: 0,
        range: '10-14/15'
      })
    );
    it('handles explicit page=1, implicit per_page=30, 60 admins',
      getPagingTester(path + '?page=1', generateAdmins(60), {
        status: 206,
        hasMore: false,
        maxItems: 60,
        remainingItems: 0,
        range: '30-59/60'
      })
    );
    it('handles explicit page=1, explicit per_page=2, 4 admins',
      getPagingTester(path + '?page=1&per_page=2', generateAdmins(4), {
        status: 206,
        hasMore: false,
        maxItems: 4,
        remainingItems: 0,
        range: '2-3/4'
      })
    );
    it('handles explicit page=2, implicit per_page=30, 100 admins',
      getPagingTester(path + '?page=2', generateAdmins(100), {
        status: 206,
        hasMore: true,
        maxItems: 100,
        remainingItems: 10,
        range: '60-89/100'
      })
    );
    it('handles explicit page=8, explicit per_page=4, 50 admins',
      getPagingTester(path + '?page=8&per_page=4', generateAdmins(50), {
        status: 206,
        hasMore: true,
        maxItems: 50,
        remainingItems: 14,
        range: '32-35/50'
      })
    );
    it('handle explicit page=23, explicit per_page=1, 33 admins',
      getPagingTester(path + '?page=23&per_page=1', generateAdmins(33), {
        status: 206,
        hasMore: true,
        maxItems: 33,
        remainingItems: 9,
        range: '23-23/33'
      })
    );
    it('gives a 422 on page=-1', getStatusTester(path + '?page=-1', 422));
    it('gives a 422 on per_page=-1',
      getStatusTester(path + '?per_page=-1', 422));
    it('gives a 422 on per_page=0', getStatusTester(path + '?per_page=0', 422));
    it('gives a 422 on per_page=201',
      getStatusTester(path + '?per_page=201', 422));
    it('gives a 404 on explicit page=1, implicit per_page=30, 20 admins',
      getStatusTester(path + '?page=1', 404, generateAdmins(20)));
    it('gives a 404 on explicit page=1, explicit per_page=10, 5 admins',
      getStatusTester(path + '?page=1&per_page=10', 404, generateAdmins(5)));
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