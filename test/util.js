// Contains utility functions for testing

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const server = require('../server.js');

const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiSubset = require('chai-subset');

const should = chai.should();
chai.use(chaiHttp);
chai.use(chaiSubset);

const coerceToArray = value => Array.isArray(value) ? value : [value];

function populateDB(docs, model, callbackSuccess, callbackErr, hooks = {}) {
  let docArr = Array.isArray(docs) ? docs : [docs];
  let preHook = hooks.pre || ((docs, done) => done());
  let postHook = hooks.post || ((docs, dbDocs, done) => done());
  
  preHook(docs, err => {
    if (err) return callbackErr(err);
    
    let promises = [];
    for (let doc of docArr) {
      promises.push(new model(doc).save());
    }
    
    Promise.all(promises).then(dbDocs => {
      postHook(docs, dbDocs, err => {
        if (err) return callbackErr(Error(err));
        callbackSuccess(docs, dbDocs);
      });
    }, callbackErr);
  });
}

exports.populateDB = populateDB;

function getQueryObject(doc) {
  let query = {};
  
  function generateQuery(root, obj) {
    for (let prop in obj) {
      if (!obj.hasOwnProperty(prop)) continue;
      
      let propAddress = root ? `${root}.${prop}` : prop;
      if (typeof obj[prop] === 'object' && !(obj[prop] instanceof ObjectId)) {
        generateQuery(propAddress, obj[prop]);
      } else {
        query[propAddress] = obj[prop];
      }
    }
  }
  
  generateQuery(null, doc);
  return query;
}

function baseNoPagingGetResponseCheck(res, testDocs) {
  res.should.have.status(200);
  res.body.should.have.property('data').that.is.an('array');
  res.body.should.have.property('hasMore').that.is.equal(false);
  res.body.should.have.property('maxItems').that.is.equal(testDocs.length);
  res.body.should.have.property('remainingItems').that.is.equal(0);
  
  let data = res.body.data;
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

exports.testGet = (path, model, testDocs, hooks) => {
  return done => {
    testDocs = coerceToArray(testDocs);
    
    function after() {
      // try to GET the data back
      chai.request(server)
      .get(path)
      .end((err, res) => {
        let data = baseNoPagingGetResponseCheck(res, testDocs);
        
        for (let resDoc of data) {
          let doc = checkAndSanitizeResponseDoc(resDoc);
          delete doc.created;
          delete doc.updated;
          JSON.parse(JSON.stringify(testDocs)).should.deep.include(doc);
        }
        
        done();
      });
    }
    
    if (testDocs === []) {
      after();
    } else {
      populateDB(testDocs, model, after, done, hooks);
    }
  };
};

exports.testResourceGet = (path, model, doc, hooks, dbDocs = []) => {
  return done => {
    populateDB([doc].concat(Array.from(dbDocs)), model, (docs, dbDocs) => {
      chai.request(server)
      .get(`${path}/${dbDocs[0]._id}`)
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.an('object');
        
        let resDoc = checkAndSanitizeResponseDoc(res.body);
        delete resDoc.created;
        delete resDoc.updated;
        
        resDoc.should.deep.equal(JSON.parse(JSON.stringify(doc)));
        
        done();
      });
    }, done, hooks);
  };
};

exports.testPut = (path, model, oldDoc, newDoc, hooks, dbDocs = []) => {
  return done => {
    populateDB([oldDoc].concat(Array.from(dbDocs)), model, (docs, dbDocs) => {
      let id = dbDocs[0]._id;
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
          JSON.parse(JSON.stringify(dbDoc)).should.containSubset(newDoc);
          done();
        });
      });
    }, done, hooks);
  };
};

// why you broke, atom lang-javascript syntax highlighter?
exports.testPatch = (path, model, doc, patch, patchFunc, hooks, dbDocs=[]) => {
  return done => {
    populateDB([doc].concat(Array.from(dbDocs)), model, (docs, dbDocs) => {
      let id = dbDocs[0]._id;
      chai.request(server)
      .patch(`${path}/${id}`)
      .send(patch)
      .end((err, res) => {
        res.should.have.status(200);
        
        let body = JSON.parse(JSON.stringify(res.body));
        let newDoc = JSON.parse(JSON.stringify(doc));
        patchFunc(newDoc);
        body.should.containSubset(newDoc);
        body.should.not.have.property('_id');
        body.should.not.have.property('__v');
        
        model.findById(id, (err, doc) => {
          should.not.exist(err);
          JSON.parse(JSON.stringify(doc)).should.containSubset(newDoc);
          done();
        });
      });
    }, done, hooks);
  };
};

exports.testDelete = (path, model, doc, hooks, dbDocs = []) => {
  return done => {
    populateDB([doc].concat(Array.from(dbDocs)), model, (doc_, dbDocs) => {
      let id = dbDocs[0]._id;
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
    }, done, hooks);
  };
};

exports.testSortableGet = (path, model, testDocs, checker, hooks) => {
  return done => {
    testDocs = coerceToArray(testDocs);
    
    populateDB(testDocs, model, testDocs => {
      chai.request(server)
      .get(path)
      .end((err, res) => {
        let data = baseNoPagingGetResponseCheck(res, testDocs);
        
        let prevDoc = null;
        for (let doc of data) {
          if (prevDoc !== null) {
            checker(prevDoc, doc);
          }
          prevDoc = doc;
        }
        
        done();
      });
    }, done, hooks);
  };
};

// Syntax highlighting broke... *sigh*
exports.testStatus = (path, model, status, hooks, docs = [],
    method = 'get', send, heads = {}) => {
  heads.accept = heads.accept || 'application/json';
  heads['content-type'] = heads['content-type'] || heads.accept;
  
  return done => {
    populateDB(Array.from(docs), model, (docs_, dbDocs) => {
      if (path.includes(':id')) {
        path = path.replace(':id', dbDocs[0]._id);
      }
      
      let request = chai.request(server);
      request = request[method](path); // call the relevant HTTP method function
      if (send !== undefined) {
        request = request.send(send);
      }
      
      for (let header in heads) {
        if (!heads.hasOwnProperty(header)) continue;
        request = request.set(header, heads[header]);
      }
      
      request.end((err, res) => {
        res.should.have.status(status);
        done();
      });
    }, done, hooks);
  };
};

exports.testPaging = (path, model, testDocs, values, hooks) => {
  return done => {
    if (values.maxItems === undefined) values.maxItems = testDocs.length;
    
    populateDB(Array.from(testDocs), model, () => {
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
    }, done, hooks);
  };
};

exports.testPost = (path, doc, model, hooks, docsForDB = [], headers = {}) => {
  return done => {
    populateDB(Array.from(docsForDB), model, () => {
      chai.request(server)
      .post(path)
      .set(headers)
      .send(doc)
      .end((err, res) => {
        res.should.have.status(201);
        res.body.should.deep.equal({});
        res.should.have.property('text').that.is.equal('');
        
        let queryStart = path.lastIndexOf('?');
        let pathRoot = queryStart >= 0 ? path.slice(0, queryStart) : path;
        
        res.header.should.have.property('location')
          .that.match(new RegExp(`^${pathRoot}\\/[\\w\\d]+$`));
        
        let location = res.header.location;
        let id = location.slice(location.lastIndexOf('/') + 1);
        
        // check that it was set in the database
        model.findOne(getQueryObject(doc), (err, dbDoc) => {
          should.not.exist(err);
          should.exist(dbDoc);
          dbDoc._id.toString().should.equal(id);
          
          for (let prop in doc) {
            if (!doc.hasOwnProperty(prop)) continue;
            // HACK: fix doc[prop] printing as [object Object], dbDoc[prop] not
            // this was causing the deep.equal assertion to fail
            let dbProp = JSON.parse(JSON.stringify(dbDoc[prop]));
            let docProp = JSON.parse(JSON.stringify(doc[prop]));
            dbProp.should.deep.equal(docProp);
          }
          
          done();
        });
      });
    }, done, hooks);
  };
};

exports.testCollectionDelete = (path, model, docsForDB, hooks) => {
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
    }, done, hooks);
  };
};

exports.testIDHandling = (path, name, model, hooks, method, example, send) => {
  it(`404s when trying to get a nonexistant ${name} with an empty DB`,
    exports.testStatus(path.replace(':id', '123456789012345678901234'), model,
      404, hooks, [], method, send));
  it(`404s when trying to get a nonexistant ${name} with a non-empty DB`,
    exports.testStatus(path.replace(':id', '123456789012345678901234'), model,
      404, hooks, [example], method, send));
  it('404s on a nonexistant hex ID',
    exports.testStatus(path.replace(':id', 'DeadBeefFeedCabFad123456'), model,
      404, hooks, [], method, send));
  it('gives a 400 on an invalid ID',
    exports.testStatus(path.replace(':id', 'invalid-id-because-chars'), model,
      400, hooks, [], method, send));
  it('gives a 400 on a too-short ID',
    exports.testStatus(path.replace(':id', '123'), model,
      400, hooks, [], method, send));
  it('gives a 400 on a negative ID',
    exports.testStatus(path.replace(':id', '-123456789012345678901234'), model,
      400, hooks, [], method, send));
};

function cloneObject(obj) {
  // REVIEW there's probably a better way to do this...
  let newObj = {};
  for (let prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      newObj[prop] = obj[prop];
    }
  }
  return newObj;
}

exports.getObjectMissingProperty = (obj, prop) => {
  let newObj = cloneObject(obj);
  delete newObj[prop];
  return newObj;
};

exports.generateObjectsMissingOneProperty = function*(obj) {
  for (let prop in obj) {
    if (!obj.hasOwnProperty(prop)) continue;
    if (typeof obj[prop] === 'object' && !(obj[prop] instanceof ObjectId)) {
      for (let gen of exports.generateObjectsMissingOneProperty(obj[prop])) {
        let newObj = cloneObject(obj);
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
};

exports.generateSinglePropertyPatches = function*(obj, value = null) {
  for (let prop in obj) {
    if (!obj.hasOwnProperty(prop)) continue;
    if (typeof obj[prop] === 'object' && !(obj[prop] instanceof ObjectId)) {
      for (let gen of exports.generateSinglePropertyPatches(obj[prop], value)) {
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
};