var admin = require('../models/admin.js');
var checkout = require('../models/checkout.js');
var item = require('../models/item.js');
var patron = require('../models/patron.js');

module.exports = function(app) {
  function addCollection(
      model, name, toInputConverter, toDBConverter, pageable = true) {
    // toInputConverter, toDBConverter default to the identity function
    toInputConverter = toInputConverter || x => x;
    toDBConverter = toDBConverter || x => x;
    
    // get a list of all things
    app.get('/v0/' + name, function(req, res) {
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
      req.checkParams('sort_by', 'Invalid sort_by value: %0 not one of %1')
         .isIn(sortByObj.keys());
      req.checkParams('direction', 'Invalid direction value: %0 not one of %1')
         .isIn(sortDirObj.keys());
      if (pageable) {
        req.checkParams('page', 'Invalid page %0').isInt({min: 0});
        req.checkParams('per_page', 'Invalid per_page %0 (min=10, max=200)')
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
    app.post('/v0/' + name, function(req, res) {
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
             .set('Location', '/v0/' + name + '/' + doc._id)
             .send();
        }
      });
    });
  }
};