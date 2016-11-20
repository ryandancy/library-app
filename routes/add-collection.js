var mergePatch = require('json-merge-patch');
var util = require('./util.js');

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
    for (defaultUnmod of ['created', 'updated', 'id']) {
      if (!unmodifiables.includes(defaultUnmod)) {
        unmodifiables.push(defaultUnmod);
      }
    }
    
    // toInputConverter, toDBConverter default to converting _id <=> id
    // NOTE hopefully this works and doesn't require copying the object
    if (!toInputConverter) {
      toInputConverter = function(doc) {
        doc.id = doc._id;
        delete doc._id;
      };
    }
    if (!toDBConverter) {
      toDBConverter = function(doc) {
        doc._id = doc.id;
        delete doc.id;
      }
    }
    
    var collectionPath = `/${name}`;
    var resourcePath = `${collectionPath}/:id`;
    
    // MIDDLEWARE
    
    // make sure unmodifiables aren't present in a POST/PUT/PATCH request
    router.use(collectionPath, function(req, res, next) {
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        for (var unmod of unmodifiables) {
          req.checkBody(unmod, '%0 is unmodifiable and cannot be present')
             .equals('undefined');
        }
      }
      next();
    });
    
    // validate the :id
    router.use(resourcePath, function(req, res, next) {
      req.checkParams('id', 'Invalid ID').isInt();
      next();
    });
    
    // do the hooks
    methodToCRUD = {
      POST: 'create',
      GET: 'retrieve',
      POST: 'update',
      PATCH: 'update',
      DELETE: 'delete'
    };
    router.use(collectionPath, function(req, res, next) {
      var crud = methodToCRUD[req.method];
      var hook = hooks[crud];
      req.hook = hook || (() => {
        // next is always last arg, call it
        arguments[arguments.length - 1]();
      });
      next();
    });
    
    // handle mapping a hook over an array of params
    function handleBatchHook(paramArray, hookCaller, callback) {
      if (!array) {
        callback();
        return;
      }
      var promises = [];
      for (param of paramArray) {
        promises.push(new Promise(function(resolve, reject) {
          hookCaller(param, resolve);
        }));
      }
      Promise.all(promises).then(callback, callback);
    }
    
    // ROUTES
    
    // get a list of all things
    router.get(collectionPath, function(req, res) {
      // create objs of query params to internal representations to keep it DRY
      var sortByObj = {'created': 'created', 'name': 'name', 'id': '_id'};
      var sortDirObj = {'asc': 1, 'desc': -1};
      
      // set defaults
      req.sanitizeParams('sort_by').setDefault('created');
      req.sanitizeParams('direction').setDefault('asc'); // FIXME violating DRY?
      if (pageable) {
        req.sanitizeParams('page').setDefault(0);
        req.sanitizeParams('per_page').setDefault(30);
      }
      
      // validate query params
      req.checkQuery('sort_by', 'Invalid sort_by value: %0 not one of %1')
         .isIn(Object.keys(sortByObj));
      req.checkQuery('direction', 'Invalid direction value: %0 not one of %1')
         .isIn(Object.keys(sortDirObj));
      if (pageable) {
        req.checkQuery('page', 'Invalid page %0').isInt({min: 0});
        req.checkQuery('per_page', 'Invalid per_page %0 (min=10, max=200)')
           .isInt({min: 10, max: 200});
      }
      
      if (!util.validate(req, res)) return;
      
      // map params to internal representations
      var sortBy = sortByObj[req.query.sort_by];
      var sortDir = sortDirObj[req.query.direction];
      
      // set up the query
      // IDEA use mongoose-paginate or mongoose-range-paginate to paginate?
      var query = model.find().sort([sortBy, sortDir]);
      if (pageable) {
        var page = req.query.page;
        var perPage = req.query.per_page;
        query = query.skip(page * perPage).limit(perPage);
      }
      
      // execute the query
      query.exec(function(err, docs) {
        if (err) return util.handleDBError(err, res);
        handleBatchHook(
          docs,
          (doc, next) => req.hook(req, res, doc, next),
          () => res.status(200).json(docs.map(toInputConverter))
        );
      });
    });
    
    // create a new thing
    router.post(collectionPath, function(req, res) {
      if (!util.validate(req, res)) return;
      
      // make the new thing
      var newDoc = toDBConverter(req.body);
      req.hook(req, res, newDoc, () => {
        model.create(newDoc, function(err, doc) {
          if (err) return util.handleDBError(err, res);
          res.status(201)
             .set('Location', `/${baseUri}/${name}/${doc._id}`)
             .send();
        });
      });
    });
    
    // delete all things
    // TODO admin will need to override this so as not to delete self
    // REVIEW should this even be a thing?
    router.delete(collectionPath, function(req, res) {
      if (!util.validate(req, res)) return;
      
      // find all things, pass to hook before deleting
      model.find({}, function(err, docs) {
        if (err) return util.handleDBError(err, res);
        handleBatchHook(
          docs,
          (doc, next) => req.hook(req, res, doc, next),
          () => {
            model.remove({}, function(err) {
              if (err) return util.handleDBError(err, res);
              res.status(204).send();
            })
          });
      });
    });
    
    // get a thing
    router.get(resourcePath, function(req, res) {
      if (!util.validate(req, res)) return;
      
      var id = req.params.id;
      model.findById(id, function(err, doc) {
        if (err) return util.handleDBError(err, res);
        req.hook(req, res, doc, () => {
          res.status(200).json(toInputConverter(doc));
        });
      });
    });
    
    // update a thing
    router.put(resourcePath, function(req, res) {
      if (!util.validate(req, res)) return;
      
      var id = req.params.id;
      var mask = toDBConverter(req.body);
      
      // find old doc, pass to hook before updating
      model.findById(id, function(err, oldDoc) {
        if (err) return util.handleDBError(err, res);
        
        var newDoc = {};
        for (var prop in oldDoc) {
          if (!oldDoc.hasOwnProperty(prop)) continue;
          newDoc[prop] = mask.hasOwnProperty(prop) ? mask[prop] : oldDoc[prop];
        }
        
        req.hook(req, res, oldDoc, newDoc, () => {
          for (var prop in newDoc) {
            if (!newDoc.hasOwnProperty(prop)) continue;
            oldDoc[prop] = newDoc[prop];
          }
          oldDoc.save(function(err, doc) {
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
    router.patch(resourcePath, function(req, res) {
      if (!util.validate(req, res)) return;
      
      var id = req.params.id;
      model.findById(id, function(err, oldDoc) {
        if (err) return util.handleDBError(err, res);
        // hopefully this works
        var newDoc = mergePatch.apply(oldDoc, toDBConverter(req.body));
        req.hook(req, res, oldDoc, newDoc, () => doc.save(function(err, doc) {
          if (err) {
            return util.handleDBError(
              err, res, err.name === 'ValidationError' ? 422 : 500);
          }
          res.status(200).json(doc);
        }));
      });
    });
    
    // delete a thing
    router.delete(resourcePath, function(req, res) {
      if (!util.validate(req, res)) return;
      
      var id = req.params.id;
      model.findById(id, function(err, doc) {
        if (err) return util.handleDBError(err, res);
        req.hook(req, res, doc, () => doc.remove(function(err) {
          if (err) return util.handleDBError(err, res);
          res.status(204).send();
        }));
      });
    });
  }
  
  return addCollection;
};