var admin = require('../models/admin.js');
var checkout = require('../models/checkout.js');
var item = require('../models/item.js');
var patron = require('../models/patron.js');

module.exports = function(app) {
  function addCollection(model, name, modelConverter, pageable = true) {
    // modelConverter defaults to the identity function
    modelConverter = modelConverter || x => x;
    
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
          res.json(docs.map(modelConverter));
        }
      });
    });
  }
};