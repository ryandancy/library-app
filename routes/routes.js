var mergePatch = require('json-merge-patch');

var admin = require('../models/admin.js');
var checkout = require('../models/checkout.js');
var item = require('../models/item.js');
var patron = require('../models/patron.js');

module.exports = function(router, baseUri) {
  // helper function for error validation, returns true if validation passed
  function validate(req, res, code = 422) {
    var errors = req.validationErrors();
    if (errors) {
      res.status(code).json(errors);
    }
    return !errors;
  }
  
  function handleDBError(err, code = 500) {
    res.status(code).send(err); // REVIEW will this work?
  }
  
  function addCollection(
      model, name, hooks, toInputConverter, toDBConverter, pageable = true) {
    // make sure hooks is initialized correctly
    if (typeof hooks !== 'object') {
      hooks = {
        collection: {},
        resource: {}
      };
    }
    hooks.collection = hooks.collection || {};
    hooks.resource = hooks.resource || {};
    
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
    router.use(function(req, res, next) {
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        var unmodifiables = ['created', 'updated', 'id'];
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
    function getHookMiddleware(pathType) {
      return (req, res, next) => {
        var hook = hooks[pathType][req.method];
        if (typeof hook === 'function') {
          hook(req, res, next, toDBConverter, toInputConverter);
        } else {
          next();
        }
      };
    }
    router.use(collectionPath, getHookMiddleware('collection'));
    router.use(resourcePath, getHookMiddleware('resource'));
    
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
         .isIn(sortByObj.keys());
      req.checkQuery('direction', 'Invalid direction value: %0 not one of %1')
         .isIn(sortDirObj.keys());
      if (pageable) {
        req.checkQuery('page', 'Invalid page %0').isInt({min: 0});
        req.checkQuery('per_page', 'Invalid per_page %0 (min=10, max=200)')
           .isInt({min: 10, max: 200});
      }
      
      if (!validate(req, res)) return;
      
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
        if (err) return handleDBError(err);
        res.json(docs.map(toInputConverter));
      });
    });
    
    // create a new thing
    router.post(collectionPath, function(req, res) {
      if (!validate(req, res)) return;
      
      // make the new thing
      model.create(toDBConverter(req.body), function(err, doc) {
        if (err) return handleDBError(err);
        res.status(201)
           .set('Location', `/${baseUri}/${name}/${doc._id}`)
           .send();
      });
    });
    
    // delete all things
    // TODO admin will need to override this so as not to delete self
    // REVIEW should this even be a thing?
    router.delete(collectionPath, function(req, res) {
      if (!validate(req, res)) return;
      
      model.remove({}, function(err) {
        if (err) return handleDBError(err);
        res.status(204).send();
      });
    });
    
    // get a thing
    router.get(resourcePath, function(req, res) {
      if (!validate(req, res)) return;
      
      var id = req.params.id;
      model.findById(id, function(err, doc) {
        if (err) return handleDBError(err);
        res.status(200).json(toInputConverter(doc));
      });
    });
    
    // update a thing
    router.put(resourcePath, function(req, res) {
      if (!validate(req, res)) return;
      
      var id = req.params.id;
      model.findByIdAndUpdate(id, toDBConverter(req.body), function(err, doc) {
        if (err) {
          return handleDBError(err, err.name === 'ValidationError' ? 422 : 500);
        }
        res.status(204).send();
      });
    });
    
    // partially update a thing
    router.patch(resourcePath, function(req, res) {
      if (!validate(req, res)) return;
      
      var id = req.params.id;
      model.findById(id, function(err, doc) {
        if (err) return handleDBError(err);
        mergePatch.apply(doc, toDBConverter(req.body)); // hopefully this works
        doc.save(handleDBError);
      });
    });
    
    // delete a thing
    router.delete(resourcePath, function(req, res) {
      if (!validate(req, res)) return;
      
      var id = req.params.id;
      model.findById(id).remove(function(err) {
        if (err) return handleDBError(err);
      });
    });
  }
  
  addCollection(Admin, 'admins');
  
  addCollection(Checkout, 'checkouts', {
    collection: {
      POST: function(req, res, next, toDBConverter, toInputConverter) {
        // update item status, make sure item's not checked out already
        // CALLBACK HELL
        var itemID = req.body.itemID;
        Item.findById(itemID, function(err, item) {
          if (err) return handleDBError(err);
          
          if (item.status !== 'in') {
            res.json({msg: 'Cannot create checkout: item not in'});
            return;
          }
          
          item.status = 'out';
          item.save(function(err) {
            if (err) return handleDBError(err);
            
            // update patron checkouts
            var patronID = req.body.patronID;
            var checkout = toDBConverter(req.body);
            Item.update(
                {_id: patronID}, {$push: {checkouts: checkout}}, function(err) {
              if (err) return handleDBError(err);
              next();
            });
          });
        });
      }
    }
  });
  
  addCollection(Item, 'items');
  
  addCollection(Patron, 'patrons');
};