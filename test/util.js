// Contains utility functions for testing

var mongoose = require('mongoose');
var server = require('../server.js');
var Admin = require('../models/admin.js');

var chai = require('chai');
var chaiHttp = require('chai-http');
var chaiSubset = require('chai-subset');

var should = chai.should();
chai.use(chaiHttp);
chai.use(chaiSubset);

var coerceToArray = value => Array.isArray(value) ? value : [value];

function populateDB(docs, model, callbackSuccess, callbackErr) {
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

exports.testGet = (path, model, testDocs) => {
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
      populateDB(testDocs, model, after, done);
    }
  };
}

exports.testResourceGet = (path, model, doc, dbDocs = []) => {
  return done => {
    populateDB([doc].concat(Array.from(dbDocs)), model, (docs, dbDocs) => {
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

exports.testPut = (path, model, oldDoc, newDoc, dbDocs = []) => {
  return done => {
    populateDB([oldDoc].concat(Array.from(dbDocs)), model, (docs, dbDocs) => {
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

exports.testPatch = (path, model, oldDoc, patch, patchApplier, dbDocs = []) => {
  return done => {
    populateDB([oldDoc].concat(Array.from(dbDocs)), model, (docs, dbDocs) => {
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

exports.testDelete = (path, model, doc, dbDocs = []) => {
  return done => {
    populateDB([doc].concat(Array.from(dbDocs)), model, (doc_, dbDocs) => {
      var id = dbDocs[0]._id;
      chai.request(server)
      .delete(`${path}/${id}`)
      .end((err, res) => {
        res.should.have.status(204);
        res.body.should.deep.equal({});
        res.should.have.property('text').that.equal('');
        
        // verify it's not in the database
        model.count({_id: id}, (err, count) => {
          should.not.exist(err);
          count.should.equal(0);
          done();
        });
      });
    });
  };
}

exports.testSortableGet = (path, model, testDocs, checker) => {
  return done => {
    testDocs = coerceToArray(testDocs);
    
    populateDB(testDocs, model, testDocs => {
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

exports.testStatus = (path, model, status, admins=[], method='get', send) => {
  return done => {
    populateDB(Array.from(admins), model, (admins_, dbAdmins) => {
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

exports.testPaging = (path, model, testDocs, values) => {
  return done => {
    if (values.maxItems === undefined) values.maxItems = docs.length;
    
    populateDB(Array.from(testDocs), model, docs => {
      chai.request(server)
      .get(path)
      .end((err, res) => {
        res.should.have.status(values.status);
        res.body.should.have.property('hasMore').that.is.equal(values.hasMore);
        res.body.should.have.property('maxItems')
          .that.is.equal(values.maxItems);
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

exports.testPost = (path, doc, model, docsForDB = []) => {
  return done => {
    populateDB(Array.from(docsForDB), model, () => {
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

exports.testCollectionDelete = (path, model, docsForDB) => {
  return done => {
    populateDB(Array.from(docsForDB), model, () => {
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

exports.getObjectMissingProperty = (obj, prop) => {
  var newObj = cloneObject(obj);
  delete newObj[prop];
  return newObj;
}

exports.generateObjectsMissingOneProperty = function*(obj) {
  for (var prop in obj) {
    if (!obj.hasOwnProperty(prop)) continue;
    if (typeof obj[prop] === 'object') {
      for (var gen of exports.generateObjectsMissingOneProperty(obj[prop])) {
        var newObj = cloneObject(obj);
        newObj[prop] = gen.obj;
        yield {
          obj: newObj,
          prop: `${prop}.${gen.prop}`
        };
      }
    } else {
      yield {
        obj: exports.getObjectMissingProperty(obj, prop),
        prop: prop
      };
    }
  }
}

exports.generateSinglePropertyPatches = function*(obj, value = null) {
  for (var prop in obj) {
    if (!obj.hasOwnProperty(prop)) continue;
    if (typeof obj[prop] === 'object') {
      for (var gen of exports.generateSinglePropertyPatches(obj[prop], value)) {
        yield {
          obj: {[prop]: gen.obj},
          prop: `${prop}.${gen.prop}`
        };
      }
    } else {
      yield {
        obj: {[prop]: value},
        prop: prop
      };
    }
  }
}