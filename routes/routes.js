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
    update: function(req, res, oldCheckout, newCheckout, next) {
      var promises = [];
      
      // handle changed item ID
      if (oldCheckout.itemID !== newCheckout.itemID) {
        // change old item to in
        promises.push(Item.findByIdAndUpdate(
          oldCheckout.itemID,
          {$set: {status: 'in'}, $unset: {checkoutID: ''}}
        ).exec());
        
        // change new item to out
        promises.push(Item.findByIdAndUpdate(
          newCheckout.itemID,
          {$set: {status: 'out', checkoutID: newCheckout._id}}
        ).exec());
      }
      
      // handle changed patron ID
      if (oldCheckout.patronID !== newCheckout.patronID) {
        // remove checkout from old patron
        promises.push(Patron.findByIdAndUpdate(
          oldCheckout.patronID,
          {$pull: {checkoutIDs: oldCheckout._id}}
        ).exec());
        
        // add checkout to new patron
        promises.push(Patron.findByIdAndUpdate(
          newCheckout.patronID,
          {$push: {checkoutIDs: newCheckout._id}}
        ).exec());
      }
      
      Promise.all(promises).then(next, function(err) {
        if (err) return util.handleDBError(err);
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