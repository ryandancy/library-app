var admin = require('../models/admin.js');
var checkout = require('../models/checkout.js');
var item = require('../models/item.js');
var patron = require('../models/patron.js');

module.exports = function(router, baseUri) {
  function addCollection(
      model, name, toInputConverter, toDBConverter, pageable = true) {
    // toInputConverter, toDBConverter default to the identity function
    toInputConverter = toInputConverter || x => x;
    toDBConverter = toDBConverter || x => x;
    
    // get a list of all things
    router.get(`/${name}`, function(req, res) {
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
      
      // respond with a 422 error if there are any errors
      var errors = req.validationErrors();
      if (errors) {
        res.status(422).json(errors);
        return;
      }
      
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
        if (err) {
          res.status(500).send(err); // REVIEW will this work? Format of errors?
        } else {
          res.json(docs.map(toInputConverter));
        }
      });
    });
    
    // create a new thing
    router.post(`/${name}`, function(req, res) {
      // created, updated, and id can't be present in the request body
      // TODO are there any more unmodifiables? Use on per-model basis?
      var unmodifiables = ['created', 'updated', 'id'];
      for (unmod of unmodifiables) {
        // TODO is there a better way than this?
        req.checkBody(unmod, '%0 is unmodifiable and cannot be present')
           .equals('undefined');
      }
      
      // respond with a 422 error if there are any errors
      var errors = req.validationErrors();
      if (errors) {
        res.status(422).json(errors);
        return;
      }
      
      // make the new thing
      model.create(toDBConverter(req.body), function(err, doc) {
        if (err) {
          res.status(500).send(err); // REVIEW will this work?
        } else {
          res.status(201)
             .set('Location', `/${baseUri}/${name}/${doc._id}`)
             .send();
        }
      });
    });
    
    // delete all things
    // TODO admin will need to override this so as not to delete self
    // REVIEW should this even be a thing?
    router.delete(`/${name}`, function(req, res) {
      model.remove({}, function(err) {
        if (err) {
          res.status(500).send(err); // REVIEW will this work?
        } else {
          res.status(204).send();
        }
      });
    });
    
    // add middleware to validate the :id
    router.use('/${name}/:id', function(req, res, next) {
      req.checkParams('id', 'Invalid ID').isInt();
      next();
    });
  }
};