process.env.NODE_ENV = 'test';

var mongoose = require('mongoose');
var server = require('../server.js');
var Admin = require('../models/admin.js');

var chai = require('chai');
var chaiHttp = require('chai-http');
var chaiSubset = require('chai-subset');

var should = chai.should();
chai.use(chaiHttp);
chai.use(chaiSubset);

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

function testGet(path, testDocs) {
  return done => {
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
  };
}

function testResourceGet(path, doc, dbDocs = []) {
  return done => {
    populateDB([doc].concat(Array.from(dbDocs)), (docs, dbDocs) => {
      chai.request(server)
      .get(`${path}/${dbDocs[0]._id}`)
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.an('object');
        
        var resDoc = checkAndSanitizeResponseDoc(res.body);
        delete resDoc.created;
        delete resDoc.updated;
        
        resDoc.should.deep.equal(doc);
        
        done();
      });
    });
  };
}

function testPut(path, model, oldDoc, newDoc, dbDocs = []) {
  return done => {
    populateDB([oldDoc].concat(Array.from(dbDocs)), (docs, dbDocs) => {
      var id = dbDocs[0]._id;
      chai.request(server)
      .put(`${path}/${id}`)
      .send(newDoc)
      .end((err, res) => {
        res.should.have.status(204);
        res.body.should.deep.equal({});
        res.should.have.property('text').that.equal('');
        
        // check the database was updated
        model.findById(id, (err, dbDoc) => {
          should.not.exist(err);
          dbDoc.should.containSubset(newDoc);
          done();
        });
      });
    });
  };
}

function testPatch(path, model, oldDoc, patch, patchApplier, dbDocs = []) {
  return done => {
    populateDB([oldDoc].concat(Array.from(dbDocs)), (docs, dbDocs) => {
      var id = dbDocs[0]._id;
      chai.request(server)
      .patch(`${path}/${id}`)
      .send(patch)
      .end((err, res) => {
        res.should.have.status(200);
        
        var newDoc = JSON.parse(JSON.stringify(oldDoc));
        patchApplier(newDoc);
        res.body.should.containSubset(newDoc);
        res.body.should.not.have.property('_id');
        res.body.should.not.have.property('__v');
        
        model.findById(id, (err, doc) => {
          should.not.exist(err);
          doc.should.containSubset(newDoc);
          done();
        });
      });
    });
  };
}

function testSortableGet(path, testDocs, checker) {
  return done => {
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
  };
}

function testStatus(path, status, admins = [], method = 'get', send) {
  return done => {
    populateDB(Array.from(admins), (admins_, dbAdmins) => {
      if (path.includes(':id')) {
        path = path.replace(':id', dbAdmins[0]._id);
      }
      
      var request = chai.request(server);
      request = request[method](path); // call the relevant HTTP method function
      if (send !== undefined) {
        request = request.send(send);
      }
      
      // Content-Type defaults to x-www-form-urlencoded if the JSON's invalid
      request.set('content-type', 'application/json')
      .end((err, res) => {
        res.should.have.status(status);
        done();
      });
    });
  };
}

function testPaging(path, testDocs, values) {
  return done => {
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
  };
}

function testPost(path, doc, model, docsForDB = []) {
  return done => {
    populateDB(Array.from(docsForDB), () => {
      chai.request(server)
      .post(path)
      .send(doc)
      .end((err, res) => {
        res.should.have.status(201);
        res.body.should.deep.equal({});
        res.should.have.property('text').that.is.equal('');
        
        var queryStart = path.lastIndexOf('?');
        var pathRoot = queryStart >= 0 ? path.slice(0, queryStart) : path;
        
        res.header.should.have.property('location')
          .that.match(new RegExp(`^${pathRoot}\\/[\\w\\d]+$`));
        
        var location = res.header.location;
        var id = location.slice(location.lastIndexOf('/') + 1);
        
        // check that it was set in the database
        model.findOne(doc, (err, dbDoc) => {
          should.not.exist(err);
          should.exist(dbDoc);
          dbDoc._id.toString().should.equal(id);
          
          for (var prop in doc) {
            if (!doc.hasOwnProperty(prop)) continue;
            // HACK: fix doc[prop] printing as [object Object], dbDoc[prop] not
            // this was causing the deep.equal assertion to fail
            var dbProp = JSON.parse(JSON.stringify(dbDoc[prop]));
            var docProp = JSON.parse(JSON.stringify(doc[prop]));
            dbProp.should.deep.equal(docProp);
          }
          
          done();
        });
      });
    });
  };
}

function testCollectionDelete(path, model, docsForDB) {
  return done => {
    populateDB(Array.from(docsForDB), () => {
      chai.request(server)
      .delete(path)
      .end((err, res) => {
        res.should.have.status(204);
        res.body.should.deep.equal({});
        res.should.have.property('text').that.is.equal('');
        
        model.count({}, (err, count) => {
          should.not.exist(err);
          count.should.be.equal(0);
          done();
        });
      });
    });
  };
}

function testIDHandling(path, method, send = undefined) {
  it('404s when trying to get a nonexistant admin with an empty database',
    testStatus(path + '/123456789012345678901234', 404, [], method, send));
  it('404s when trying to get a nonexistant admin with a non-empty database',
    testStatus(path + '/123456789012345678901234', 404, generateAdmins(10),
      method, send));
  it('404s on a nonexistant hex ID',
    testStatus(path + '/DeadBeefFeedCabFad123456', 404, [], method, send));
  it('gives a 400 on an invalid ID',
    testStatus(path + '/invalid-id-because-chars', 400, [], method, send));
  it('gives a 400 on a too-short ID',
    testStatus(path + '/123', 400, [], method, send));
  it('gives a 400 on a negative ID',
    testStatus(path + '/-123456789012345678901234', 400, [], method, send));
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

function cloneObject(obj) {
  // REVIEW there's probably a better way to do this...
  var newObj = {};
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      newObj[prop] = obj[prop];
    }
  }
  return newObj;
}

function getObjectMissingProperty(obj, prop) {
  var newObj = cloneObject(obj);
  delete newObj[prop];
  return newObj;
}

function* generateObjectsMissingOneProperty(obj) {
  for (var prop in obj) {
    if (!obj.hasOwnProperty(prop)) continue;
    if (typeof obj[prop] === 'object') {
      for (var gen of generateObjectsMissingOneProperty(obj[prop])) {
        var newObj = cloneObject(obj);
        newObj[prop] = gen.obj;
        yield {
          obj: newObj,
          prop: `${prop}.${gen.prop}`
        };
      }
    } else {
      yield {
        obj: getObjectMissingProperty(obj, prop),
        prop: prop
      };
    }
  }
}

describe('Admins', () => {
  beforeEach(done => {
    Admin.remove({}, err => done());
  });
  
  var path = '/v0/admins';
  var allTestAdmins = Object.values(testAdmins);
  
  describe('GET /v0/admins', () => {
    it('should initially get an empty array', testGet(path, []));
    it('can retrieve a single admin', testGet(path, testAdmins.simple1));
    it('can retrieve multiple admins',
      testGet(path, [testAdmins.simple1, testAdmins.simple2]));
    it('accepts unicode in admin names',
      testGet(path, testAdmins.unicode));
    it('accepts whitespace in admin names',
      testGet(path, testAdmins.whitespace));
    it('can retrieve all of them at once', testGet(path, allTestAdmins));
    
    var createdAscSort = (admin, admin2) =>
      new Date(admin.created).should.be.at.most(new Date(admin2.created));
    var createdDescSort = (admin, admin2) =>
      new Date(admin.created).should.be.at.least(new Date(admin2.created));
    it('defaults to sorting ascending by created date',
      testSortableGet(path, allTestAdmins, createdAscSort));
    it('can sort descending by created date',
      testSortableGet(path + '?direction=desc', allTestAdmins,
        createdDescSort));
    it('can explicitly sort ascending, defaulting to created date',
      testSortableGet(path + '?direction=asc', allTestAdmins, createdAscSort));
    it('can explicitly sort by created date, defaulting to ascending',
      testSortableGet(path + '?sort_by=created', allTestAdmins,
        createdAscSort));
    it('can explicitly sort ascending by created date',
      testSortableGet(path + '?sort_by=created&direction=asc', allTestAdmins,
        createdAscSort));
    it('can explicitly sort descending by created date',
      testSortableGet(path + '?sort_by=created&direction=desc', allTestAdmins,
        createdDescSort));
    
    var nameAscSort = (admin, admin2) =>
      admin.name.should.be.at.most(admin2.name);
    var nameDescSort = (admin, admin2) =>
      admin.name.should.be.at.least(admin2.name);
    it('can sort ascending by name lexicographically',
      testSortableGet(path + '?sort_by=name', allTestAdmins, nameAscSort));
    it('can sort explicitly ascending by name lexicographically',
      testSortableGet(path + '?sort_by=name&direction=asc', allTestAdmins,
        nameAscSort));
    it('can sort descending by name lexicographically',
      testSortableGet(path + '?sort_by=name&direction=desc', allTestAdmins,
        nameDescSort));
    
    var idAscSort = (admin, admin2) => admin.id.should.be.below(admin2.id);
    var idDescSort = (admin, admin2) => admin.id.should.be.above(admin2.id);
    it('can sort ascending by ID',
      testSortableGet(path + '?sort_by=id', allTestAdmins, idAscSort));
    it('can sort explicitly ascending by ID',
      testSortableGet(path + '?sort_by=id&direction=asc', allTestAdmins,
        idAscSort));
    it('can sort descending by ID',
      testSortableGet(path + '?sort_by=id&direction=desc', allTestAdmins,
        idDescSort));
    
    it('gives a 422 on an invalid sort_by value',
      testStatus(path + '?sort_by=INVALID', 422));
    it('gives a 422 on an empty sort_by value',
      testStatus(path + '?sort_by=', 422));
    it('gives a 422 on an invalid direction value',
      testStatus(path + '?direction=INVALID', 422));
    it('gives a 422 on an empty direction value',
      testStatus(path + '?direction=', 422));
    it('gives a 422 on invalid both sort_by and direction',
      testStatus(path + '?sort_by=foo&direction=bar', 422));
    it('gives a 422 on empty both sort_by and direction',
      testStatus(path + '?sort_by=&direction=', 422));
    
    it('has correct paging on no admins, no query string',
      testPaging(path, [], {
        status: 200,
        hasMore: false,
        maxItems: 0,
        remainingItems: 0,
        range: false
      })
    );
    it('has correct paging on one admin, no query string',
      testPaging(path, generateAdmins(1), {
        status: 200,
        hasMore: false,
        maxItems: 1,
        remainingItems: 0,
        range: false
      })
    );
    it('has correct paging on two admins, no query string',
      testPaging(path, generateAdmins(2), {
        status: 200,
        hasMore: false,
        maxItems: 2,
        remainingItems: 0,
        range: false
      })
    );
    it('has correct paging on 31 admins, no query string',
      testPaging(path, generateAdmins(31), {
        status: 206,
        hasMore: true,
        maxItems: 31,
        remainingItems: 1,
        range: '0-29/31'
      })
    );
    it('has correct paging on 30 admins, no query string',
      testPaging(path, generateAdmins(30), {
        status: 200,
        hasMore: false,
        maxItems: 30,
        remainingItems: 0,
        range: false
      })
    );
    it('handles explicit page=0, implicit per_page=30, 30 admins',
      testPaging(path + '?page=0', generateAdmins(30), {
        status: 200,
        hasMore: false,
        maxItems: 30,
        remainingItems: 0,
        range: false
      })
    );
    it('handles implicit page=0, explicit per_page=30, 30 admins',
      testPaging(path + '?per_page=30', generateAdmins(30), {
        status: 200,
        hasMore: false,
        maxItems: 30,
        remainingItems: 0,
        range: false
      })
    );
    it('handles explicit page=0, explicit per_page=30, 30 admins',
      testPaging(path + '?page=0&per_page=30', generateAdmins(30), {
        status: 200,
        hasMore: false,
        maxItems: 30,
        remainingItems: 0,
        range: false
      })
    );
    it('handles implicit page=0, explicit per_page=10, 15 admins',
      testPaging(path + '?per_page=10', generateAdmins(15), {
        status: 206,
        hasMore: true,
        maxItems: 15,
        remainingItems: 5,
        range: '0-9/15'
      })
    );
    it('handles implicit page=0, explicit per_page=20, 15 admins',
      testPaging(path + '?per_page=20', generateAdmins(15), {
        status: 200,
        hasMore: false,
        maxItems: 15,
        remainingItems: 0,
        range: false
      })
    );
    it('handles explicit page=0, explicit per_page=10, 15 admins',
      testPaging(path + '?page=0&per_page=10', generateAdmins(15), {
        status: 206,
        hasMore: true,
        maxItems: 15,
        remainingItems: 5,
        range: '0-9/15'
      })
    );
    it('handles explicit page=1, implicit per_page=30, 40 admins',
      testPaging(path + '?page=1', generateAdmins(40), {
        status: 206,
        hasMore: false,
        maxItems: 40,
        remainingItems: 0,
        range: '30-39/40'
      })
    );
    it('handles explicit page=1, explicit per_page=10, 15 admins',
      testPaging(path + '?page=1&per_page=10', generateAdmins(15), {
        status: 206,
        hasMore: false,
        maxItems: 15,
        remainingItems: 0,
        range: '10-14/15'
      })
    );
    it('handles explicit page=1, implicit per_page=30, 60 admins',
      testPaging(path + '?page=1', generateAdmins(60), {
        status: 206,
        hasMore: false,
        maxItems: 60,
        remainingItems: 0,
        range: '30-59/60'
      })
    );
    it('handles explicit page=1, explicit per_page=2, 4 admins',
      testPaging(path + '?page=1&per_page=2', generateAdmins(4), {
        status: 206,
        hasMore: false,
        maxItems: 4,
        remainingItems: 0,
        range: '2-3/4'
      })
    );
    it('handles explicit page=2, implicit per_page=30, 100 admins',
      testPaging(path + '?page=2', generateAdmins(100), {
        status: 206,
        hasMore: true,
        maxItems: 100,
        remainingItems: 10,
        range: '60-89/100'
      })
    );
    it('handles explicit page=8, explicit per_page=4, 50 admins',
      testPaging(path + '?page=8&per_page=4', generateAdmins(50), {
        status: 206,
        hasMore: true,
        maxItems: 50,
        remainingItems: 14,
        range: '32-35/50'
      })
    );
    it('handle explicit page=23, explicit per_page=1, 33 admins',
      testPaging(path + '?page=23&per_page=1', generateAdmins(33), {
        status: 206,
        hasMore: true,
        maxItems: 33,
        remainingItems: 9,
        range: '23-23/33'
      })
    );
    it('gives a 422 on page=-1', testStatus(path + '?page=-1', 422));
    it('gives a 422 on per_page=-1',
      testStatus(path + '?per_page=-1', 422));
    it('gives a 422 on per_page=0', testStatus(path + '?per_page=0', 422));
    it('gives a 422 on per_page=201',
      testStatus(path + '?per_page=201', 422));
    it('gives a 404 on explicit page=1, implicit per_page=30, 20 admins',
      testStatus(path + '?page=1', 404, generateAdmins(20)));
    it('gives a 404 on explicit page=1, explicit per_page=10, 5 admins',
      testStatus(path + '?page=1&per_page=10', 404, generateAdmins(5)));
  });
  describe('POST /v0/admins', () => {
    it('creates a valid admin', testPost(path, testAdmins.simple1, Admin));
    it('creates a valid admin with a unicode name',
      testPost(path, testAdmins.unicode, Admin));
    it('creates a valid admin with a whitespace name',
      testPost(path, testAdmins.whitespace, Admin));
    it("creates a valid admin when there's already an admin in the system",
      testPost(path, testAdmins.simple2, Admin, testAdmins.simple1));
    it("creates a valid admin when there's already one with the same name",
      testPost(path, testAdmins.simple1, Admin, {
        name: testAdmins.simple1.name,
        item: testAdmins.simple2.item,
        checkout: testAdmins.simple2.checkout,
        patron: testAdmins.simple2.patron,
        signIn: true,
        signOut: true
      }));
    it("creates a valid admin when there's already an identical one",
      testPost(path, testAdmins.simple1, Admin, testAdmins.simple1));
    it('creates a valid admin when there are already 100 admins in the system',
      testPost(path, testAdmins.simple1, Admin, generateAdmins(100)));
    
    it('gives a 400 on syntatically invalid input',
      testStatus(path, 400, [], 'post', "I'm invalid"));
    it('gives a 400 on psuedo-valid input',
      testStatus(path, 400, [], 'post', '"Hi!"'));
    it('gives a 422 on an empty object as input',
      testStatus(path, 422, [], 'post', {}));
    it('treats empty input the same as an empty object (422)',
      testStatus(path, 422, [], 'post', ''));
    it('gives a 422 on an array of valid admins as input',
      testStatus(path, 422, [], 'post', Array.from(generateAdmins(5))));
    
    for (var admin of generateObjectsMissingOneProperty(testAdmins.simple1)) {
      it(`gives a 422 when missing "${admin.prop}"`,
        testStatus(path, 422, [], 'post', admin.obj));
    }
  });
  describe('DELETE /v0/admins', () => {
    it('does nothing with no admins in the database',
      testCollectionDelete(path, Admin, []));
    it('deletes 1 admin in the database',
      testCollectionDelete(path, Admin, testAdmins.simple1));
    it('deletes a bunch of edge cases in the database',
      testCollectionDelete(path, Admin, Object.values(testAdmins)));
    it('deletes 100 admins in the database',
      testCollectionDelete(path, Admin, generateAdmins(100)));
  });
  
  describe('GET /v0/admins/:id', () => {
    it('gets a simple admin as the only admin in the database',
      testResourceGet(path, testAdmins.simple1));
    it('gets a unicode admin as the only admin in the database',
      testResourceGet(path, testAdmins.unicode));
    it('gets a whitespace admin as the only admin in the database',
      testResourceGet(path, testAdmins.whitespace));
    it('gets a simple admin with 4 edge-case admins in the database',
      testResourceGet(path, testAdmins.simple2, Object.values(testAdmins)));
    it('gets a unicode admin with 4 edge-case admins in the database',
      testResourceGet(path, testAdmins.unicode, Object.values(testAdmins)));
    it('gets a whitespace admin with 4 edge-case admins in the database',
      testResourceGet(path, testAdmins.whitespace, Object.values(testAdmins)));
    it('gets a simple admin with 100 admins in the database',
      testResourceGet(path, testAdmins.simple1, generateAdmins(100)));
    it('gets a unicode admin with 100 admins in the database',
      testResourceGet(path, testAdmins.unicode, generateAdmins(100)));
    it('gets a whitespace admin with 100 admins in the database',
      testResourceGet(path, testAdmins.whitespace, generateAdmins(100)));
    
    testIDHandling(path, 'get');
  });
  describe('PUT /v0/admins/:id', () => {
    it('replaces a simple admin with another simple admin, empty DB',
      testPut(path, Admin, testAdmins.simple1, testAdmins.simple2));
    it('replaces a simple admin with a unicode admin, empty DB',
      testPut(path, Admin, testAdmins.simple1, testAdmins.unicode));
    it('replaces a simple admin with a whitespace admin, empty DB',
      testPut(path, Admin, testAdmins.simple1, testAdmins.whitespace));
    it('replaces a unicode admin with a simple admin, empty DB',
      testPut(path, Admin, testAdmins.unicode, testAdmins.simple1));
    it('replaces a unicode admin with a whitespace admin, empty DB',
      testPut(path, Admin, testAdmins.unicode, testAdmins.whitespace));
    it('replaces a whitespace admin with a simple admin, empty DB',
      testPut(path, Admin, testAdmins.whitespace, testAdmins.simple1));
    it('replaces a whitespace admin with a unicode admin, empty DB',
      testPut(path, Admin, testAdmins.whitespace, testAdmins.unicode));
      
    it('replaces a simple admin with another simple admin, 1 other in DB',
      testPut(path, Admin, testAdmins.simple1, testAdmins.simple2,
        generateAdmins(1)));
    it('replaces a simple admin with another simple admin, 100 others in DB',
      testPut(path, Admin, testAdmins.simple1, testAdmins.simple2,
        generateAdmins(100)));
    it('replaces a unicode admin with a whitespace admin, 100 others in DB',
      testPut(path, Admin, testAdmins.unicode, testAdmins.whitespace,
        generateAdmins(100)));
    
    var idPath = path + '/:id';
    it('gives a 400 on invalid JSON',
      testStatus(idPath, 400, [testAdmins.simple1], 'put', 'invalid'));
    it('gives a 400 on strictly invalid JSON (parsable by JSON.parse)',
      testStatus(idPath, 400, [testAdmins.simple1], 'put', '"Hi!"'));
    
    for (var unmod of ['created', 'updated', 'id']) {
      var admin = JSON.parse(JSON.stringify(testAdmins.simple1));
      admin[unmod] = unmod === 'id' ? '123456789012345678901234'
        : '2016-10-24T17:00:42-03:00';
      it(`gives a 422 when including "${unmod}"`,
        testStatus(idPath, 422, [testAdmins.simple1], 'put', admin));
    }
    
    for (var admin of generateObjectsMissingOneProperty(testAdmins.simple1)) {
      it(`gives a 422 when missing "${admin.prop}"`,
        testStatus(idPath, 422, [testAdmins.simple1], 'put', admin.obj));
    }
    
    testIDHandling(path, 'put', testAdmins.simple1);
  });
  describe('PATCH /v0/admins/:id', () => {
    it('can patch a simple admin changing name',
      testPatch(path, Admin, testAdmins.simple1, {name: 'Testy 2'},
        admin => admin.name = 'Testy 2'));
    it('can patch a simple admin changing a nested property',
      testPatch(path, Admin, testAdmins.simple1, {patron: {read: true}},
        admin => admin.patron.read = true));
    it('can patch a simple admin changing multiple top-level properties',
      testPatch(path, Admin, testAdmins.simple1,
        {name: 'Foo', signIn: false, signOut: false},
        admin => {
          admin.name = 'Foo';
          admin.signIn = false;
          admin.signOut = false;
        }));
    it('can patch a simple admin changing an entire top-level object property',
      testPatch(path, Admin, testAdmins.simple1,
        {patron: {read: true, write: false}},
        admin => {
          admin.patron.read = true;
          admin.patron.write = false;
        }));
    it('can patch a simple admin changing top-level and deeper properties',
      testPatch(path, Admin, testAdmins.simple1,
        {signIn: false, checkout: {read: true, write: true}},
        admin => {
          admin.signIn = false;
          admin.checkout.read = true;
          admin.checkout.write = true;
        }));
    it('can patch a simple admin changing name to unicode',
      testPatch(path, Admin, testAdmins.simple1, {name: 'Úñí¢öðè ïß ©öół'},
        admin => admin.name = 'Úñí¢öðè ïß ©öół'));
    it('can patch a simple admin changing name to whitespace',
      testPatch(path, Admin, testAdmins.simple1, {name: '   \t\n\t  '},
        admin => admin.name = '   \t\n\t  '));
    it('can patch a unicode admin changing name to normal',
      testPatch(path, Admin, testAdmins.unicode, {name: 'Testy McTestface 2.0'},
        admin => admin.name = 'Testy McTestface 2.0'));
    it('can patch a whitespace admin changing name to normal',
      testPatch(path, Admin, testAdmins.whitespace, {name: 'Testy McTest'},
        admin => admin.name = 'Testy McTest'));
    
    testIDHandling(path, 'patch');
  });
});