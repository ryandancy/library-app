const mongoose = require('mongoose');
const mergePatch = require('json-merge-patch');
const util = require('./util.js');

// TODO clean up the parameters on addCollection
module.exports = (router, baseUri) => {
  function addCollection(
    model, name, hooks = {}, unmodifiables = [], toInputConverter,
    toDBConverter, pageable = true) {
    /*
      There are 4 hooks: create, retrieve, update, and delete.
      ALL take req, res, next.
      Extras:
      - create takes doc, the new document.
      - retrieve takes doc, the retrieved document.
      - update takes oldDoc and newDoc.
      - delete takes doc, the document to be deleted.
      req and res are ALWAYS first 2 params, next is ALWAYS last param.
    */
    // make sure default unmodifiables are present
    for (let defaultUnmod of ['created', 'updated', 'id']) {
      if (!unmodifiables.includes(defaultUnmod)) {
        unmodifiables.push(defaultUnmod);
      }
    }
    
    // toInputConverter, toDBConverter default to converting _id <=> id
    // NOTE hopefully this works and doesn't require copying the object
    if (!toInputConverter) {
      toInputConverter = doc => {
        let obj = doc.toObject();
        obj.id = obj._id;
        delete obj._id;
        if (obj.hasOwnProperty('__v')) delete obj.__v;
        return obj;
      };
    }
    if (!toDBConverter) {
      toDBConverter = (doc, genID = true) => {
        if (doc.hasOwnProperty('id')) {
          doc._id = doc.id;
          delete doc.id;
        } else if (genID) {
          doc._id = mongoose.Types.ObjectId();
        }
        return doc;
      };
    }
    
    let collectionPath = `/${name}`;
    let resourcePath = `${collectionPath}/:id`;
    
    // MIDDLEWARE
    
    // make sure unmodifiables aren't present in a POST/PUT/PATCH request
    router.use(collectionPath, (req, res, next) => {
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        for (let unmod of unmodifiables) {
          req.checkBody(unmod, unmod + ' is unmodifiable and cannot be present')
             .notPresent();
        }
      }
      next();
    });
    
    // disallow arrays in POST/PUT/PATCH requests
    // REVIEW should this be allowed for POST requests?
    router.use(collectionPath, (req, res, next) => {
      if (['POST', 'PUT', 'PATCH'].includes(req.method)
          && Array.isArray(req.body)) {
        return res.status(422).json({err: 'Arrays cannot be used'});
      }
      next();
    });
    
    // validate the :id
    router.use(resourcePath, (req, res, next) => {
      // test for valid ObjectId
      if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({msg: `Invalid ID ${req.params.id}`});
      }
      next();
    });
    
    // do the hooks
    let methodToCRUD = {
      POST: 'create',
      GET: 'retrieve',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete'
    };
    router.use(collectionPath, (req, res, next) => {
      let crud = methodToCRUD[req.method];
      let hook = hooks[crud] || function() {
        // next is always last arg, call it
        arguments[arguments.length - 1]();
      };
      // This mess is to allow hooks to pass a new document to next() and it'll
      // be used as the new documents; however, if they pass nothing, this mess
      // makes it so that the original document is used. TODO make less ugly?
      req.hook = function() {
        let hookNext = arguments[arguments.length - 1];
        let doc = arguments[arguments.length - 2]; // HACK assuming doc position
        hook(...Array.prototype.slice.call(arguments, 0, -1), newDoc => {
          hookNext(newDoc === undefined ? doc : newDoc);
        });
      };
      next();
    });
    
    // handle mapping a hook over an array of params
    function handleBatchHook(paramArray, hookCaller, callback) {
      if (!paramArray) {
        callback();
        return;
      }
      let promises = [];
      for (let param of paramArray) {
        promises.push(new Promise(resolve => hookCaller(param, resolve)));
      }
      Promise.all(promises).then(callback, callback);
    }
    
    // ROUTES
    
    // get a list of all things
    router.get(collectionPath, (req, res) => {
      // create objs of query params to internal representations to keep it DRY
      let sortByObj = {'created': 'created', 'name': 'name', 'id': '_id'};
      let sortDirObj = {'asc': 1, 'desc': -1};
      
      if (!Object.keys(model.schema.paths).includes('name')) {
        delete sortByObj.name;
      }
      
      // set defaults
      if (req.query.sort_by === undefined) req.query.sort_by = 'created';
      if (req.query.direction === undefined) req.query.direction = 'asc';
      if (pageable) {
        if (req.query.page === undefined) req.query.page = 0;
        if (req.query.per_page === undefined) req.query.per_page = 30;
      }
      
      // validate query params
      req.checkQuery('sort_by', 'Invalid sort_by value: %0 not one of %1')
         .isIn(Object.keys(sortByObj));
      req.checkQuery('direction', 'Invalid direction value: %0 not one of %1')
         .isIn(Object.keys(sortDirObj));
      if (pageable) {
        req.checkQuery('page', 'Invalid page %0').isInt({min: 0});
        req.checkQuery('per_page', 'Invalid per_page %0 (min=1, max=200)')
           .isInt({min: 1, max: 200});
        
        req.sanitizeQuery('page').toInt();
        req.sanitizeQuery('per_page').toInt();
      }
      
      if (!util.validate(req, res)) return;
      
      // map params to internal representations
      let sortBy = sortByObj[req.query.sort_by];
      let sortDir = sortDirObj[req.query.direction];
      
      // set up the query
      // IDEA use mongoose-paginate or mongoose-range-paginate to paginate?
      let query = model.find().sort([[sortBy, sortDir]]);
      if (pageable) {
        let page = req.query.page;
        let perPage = req.query.per_page;
        query = query.skip(page * perPage).limit(perPage);
      }

      // execute the query
      query.exec((err, preHooksDocs) => {
        if (err) return util.handleDBError(err, res);
        handleBatchHook(
          preHooksDocs,
          (doc, next) => req.hook(req, res, doc, next),
          docs => {
            let outgoingDocs = docs.map(toInputConverter);
            if (pageable) {
              model.count({}, (err, count) => {
                if (err) return util.handleDBError(err, res);
                
                let start = req.query.page * req.query.per_page;
                let end = Math.min(start + req.query.per_page - 1, count - 1);
                
                if (start >= count && count > 0) {
                  res.status(404);
                  res.setHeader('range', `${start}-${end}/${count}`);
                  return res.end();
                }
                
                let partial = outgoingDocs.length < count;
                
                // 206 is "Partial Content", used if we're not returning the
                // entire collection; 200 is for the entire collection
                res.status(partial ? 206 : 200);
                
                if (partial) {
                  res.setHeader('range', `${start}-${end}/${count}`);
                }
                
                res.json({
                  data: outgoingDocs,
                  hasMore: end < count - 1,
                  maxItems: count,
                  remainingItems: Math.max(count - (end + 1), 0)
                });
              });
            } else {
              res.status(200).json(outgoingDocs);
            }
          }
        );
      });
    });
    
    // create a new thing
    router.post(collectionPath, (req, res) => {
      if (!util.validate(req, res)) return;
      
      // make the new thing
      let newPreHookDoc = toDBConverter(req.body);
      req.hook(req, res, newPreHookDoc, newDoc => {
        model.create(newDoc, (err, doc) => {
          if (err) {
            return util.handleDBError(err, res,
              err.name === 'ValidationError' || err.name === 'StrictModeError'
                ? 422 : 500);
          }
          res.status(201)
          .set('Location', `${baseUri}/${name}/${doc._id}`)
          .send();
        });
      });
    });
    
    // delete all things
    // TODO admin will need to override this so as not to delete self
    // REVIEW should this even be a thing?
    router.delete(collectionPath, (req, res) => {
      if (!util.validate(req, res)) return;
      
      // find all things, pass to hook before deleting
      model.find({}, (err, docs) => {
        if (err) return util.handleDBError(err, res);
        handleBatchHook(
          docs,
          (doc, next) => req.hook(req, res, doc, next),
          () => {
            model.remove({}, err => {
              if (err) return util.handleDBError(err, res);
              res.status(204).send();
            });
          });
      });
    });
    
    // get a thing
    router.get(resourcePath, (req, res) => {
      if (!util.validate(req, res)) return;
      
      let id = req.params.id;
      model.findById(id, (err, doc) => {
        if (err) return util.handleDBError(err, res);
        if (doc === null) return res.status(404).end(); // it doesn't exist
        req.hook(req, res, doc, realDoc => {
          res.status(200).json(toInputConverter(realDoc));
        });
      });
    });
    
    // update a thing
    router.put(resourcePath, (req, res) => {
      if (!util.validate(req, res)) return;
      
      let id = req.params.id;
      let mask = toDBConverter(req.body);
      
      // make sure the new thing's valid as a whole
      // REVIEW there's probably something wrong about using `hydrate` this way
      let errors = model.hydrate(mask).validateSync();
      if (errors) {
        return res.status(422).json(errors);
      }
      
      // find old doc, pass to hook before updating
      model.findById(id, (err, oldDoc) => {
        if (err) return util.handleDBError(err, res);
        if (oldDoc === null) return res.status(404).end(); // it doesn't exist
        
        let newDoc = {};
        for (let prop in mask) {
          if (!mask.hasOwnProperty(prop) || prop === '_id') continue;
          newDoc[prop] = oldDoc.hasOwnProperty(prop) ? oldDoc[prop]
            : mask[prop];
        }
        
        req.hook(req, res, oldDoc, newDoc, realNewDoc => {
          for (let prop in realNewDoc) {
            if (!realNewDoc.hasOwnProperty(prop)) continue;
            oldDoc[prop] = realNewDoc[prop];
          }
          oldDoc.save(err => {
            if (err) {
              return util.handleDBError(
                err, res, err.name === 'ValidationError' ? 422 : 500);
            }
            res.status(204).send();
          });
        });
      });
    });
    
    // partially update a thing
    router.patch(resourcePath, (req, res) => {
      if (!util.validate(req, res)) return;
      
      let id = req.params.id;
      model.findById(id, (err, oldDoc) => {
        if (err) return util.handleDBError(err, res);
        if (oldDoc === null) return res.status(404).end(); // it doesn't exist
        
        // validate the patch
        // REVIEW the hydrate() abuse
        let patch = toDBConverter(req.body, false);
        let newDocObj = mergePatch.apply(oldDoc.toObject(), patch);
        let errors = model.hydrate(newDocObj).validateSync();
        if (errors) {
          return res.status(422).json(errors);
        }
        
        let oldDocCopy = JSON.parse(JSON.stringify(oldDoc));
        let newDoc = mergePatch.apply(
          JSON.parse(JSON.stringify(oldDoc)), patch);
        
        // copy everything from newDoc to oldDoc
        for (let prop in newDoc) {
          if (!newDoc.hasOwnProperty(prop)) continue;
          oldDoc[prop] = newDoc[prop];
        }
        
        // actually update the doc
        req.hook(req, res, oldDocCopy, oldDoc, realDoc => realDoc.save(
          (err, doc) => {
            if (err) {
              return util.handleDBError(
                err, res, err.name === 'ValidationError' ? 422 : 500);
            }
            res.status(200).json(toInputConverter(doc));
          }));
      });
    });
    
    // delete a thing
    router.delete(resourcePath, (req, res) => {
      if (!util.validate(req, res)) return;
      
      let id = req.params.id;
      model.findById(id, (err, doc) => {
        if (err) return util.handleDBError(err, res);
        if (doc === null) return res.status(404).end(); // it doesn't exist
        req.hook(req, res, doc, doc2 => doc2.remove(err => {
          if (err) return util.handleDBError(err, res);
          res.status(204).send();
        }));
      });
    });
  }
  
  return addCollection;
};