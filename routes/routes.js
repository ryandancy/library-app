var mergePatch = require('json-merge-patch');
var util = require('./util.js');
var addCollectionFunc = require('./add-collection.js');

var Admin = require('../models/admin.js');
var Checkout = require('../models/checkout.js');
var Item = require('../models/item.js');
var Patron = require('../models/patron.js');

module.exports = function(router, baseUri) {
  var addCollection = addCollectionFunc(router, baseUri);
  
  addCollection(Admin, 'admins');
  
  addCollection(Checkout, 'checkouts', {
    create: function(req, res, checkout, next) {
      // update item status, make sure item's not checked out already
      // CALLBACK HELL
      var itemID = checkout.itemID;
      Item.findById(itemID, function(err, item) {
        if (err) return util.handleDBError(err);
        
        if (item.status !== 'in') {
          res.json({msg: 'Cannot create checkout: item not in'});
          return;
        }
        
        item.status = 'out';
        item.save(function(err) {
          if (err) return util.handleDBError(err);
          
          // update patron checkouts
          var patronID = checkout.patronID;
          Item.update(
              {_id: patronID}, {$push: {checkoutIDs: checkout}}, function(err) {
            if (err) return util.handleDBError(err);
            next();
          });
        });
      });
    },
    delete: function(req, res, checkout, next) {
      // update item status, remove from patron checkouts
      Item.findById(checkout.itemID, function(err, item) {
        if (err) return util.handleDBError(err);
        
        // if an item is lost we might just be cleaning up
        // missing is more short-term so it doesn't count
        if (item.status !== 'lost') {
          item.status = 'in';
        }
        
        item.save(function(err) {
          if (err) return util.handleDBError(err);
          
          // silently ignore if the checkout's not in the patron's checkouts
          Patron.findByIdAndUpdate(
            checkout.patronID,
            {$pull: {checkoutIDs: checkout._id}}
          ).exec(function(err) {
            if (err) return util.handleDBError(err);
            next();
          });
        });
      });
    }
  });
  
  addCollection(Item, 'items');
  
  addCollection(Patron, 'patrons');
};