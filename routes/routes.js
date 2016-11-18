var util = require('./util.js');
var addCollectionFunc = require('./add-collection.js');
var marcConvert = require('./marc-convert.js');

var Admin = require('../models/admin.js');
var Checkout = require('../models/checkout.js');
var Item = require('../models/item.js');
var Patron = require('../models/patron.js');

module.exports = function(router, baseUri) {
  var addCollection = addCollectionFunc(router, baseUri);
  
  addCollection(Admin, 'admins');
  
  addCollection(Checkout, 'checkouts', {
    create: function(req, res, checkout, next) {
      var promises = [];
      
      // update item status, make sure item's not checked out already
      promises.push(new Promise(function(resolve, reject) {
        Item.findById(checkout.itemID, function(err, item) {
          if (err) return reject(err);
          
          if (item.status !== 'in') {
            res.json({msg: 'Cannot create checkout: item not in'});
            return resolve(item.status);
          }
          
          item.status = 'out';
          item.save(function(err) {
            if (err) return reject(err);
            resolve();
          });
        });
      }));
      
      // update patron checkouts
      promises.push(Item.findByIdAndUpdate(
        checkout.patronID,
        {$push: {checkoutIDs: checkout}}
      ).exec());
      
      Promise.all(promises).then(next, util.handleDBError);
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
      
      Promise.all(promises).then(next, util.handleDBError);
    },
    delete: function(req, res, checkout, next) {
      var promises = [];
      
      // update item status, remove from patron checkouts
      promises.push(new Promise(function(resolve, reject) {
        Item.findById(checkout.itemID, function(err, item) {
          if (err) return reject(err);
          
          // if an item is lost we might just be cleaning up
          // missing is more short-term so it doesn't count
          if (item.status !== 'lost') {
            item.status = 'in';
          }
          
          item.save(function(err) {
            if (err) return reject(err);
            resolve();
          });
        });
      });
      
      // update the patron's checkouts
      // silently ignore if the checkout's not in the patron's checkouts
      promises.push(Patron.findByIdAndUpdate(
        checkout.patronID,
        {$pull: {checkoutIDs: checkout._id}}
      ).exec());
      
      Promise.all(promises).then(next, util.handleDBError);
    }
  });
  
  addCollection(Item, 'items', {
    delete: function(req, res, item, next) {
      var promises = [];
      
      if (item.checkoutID !== undefined) {
        // remove checkout from checkout's patron's checkoutIDs
        promises.push(new Promise(function(resolve, reject) {
          Checkout.findById(item.checkoutID, function(err, checkout) {
            if (err) return reject(err);
            
            Patron.findByIdAndUpdate(
              checkout.patronID,
              {$pull: {checkoutIDs: item.checkoutID}}
            ).exec(function(err) {
              if (err) return reject(err);
              resolve();
            });
          });
        }));
        
        // delete checkout
        promises.push(Checkout.findByIdAndRemove(item.checkoutID).exec());
      }
      
      Promise.all(promises).then(next, util.handleDBError);
    }
  }, ['checkoutID']);
  
  var marcPath = '/items/:id/marc';
  
  router.get(marcPath, function(req, res) {
    Item.findById(req.params.id, function(err, item) {
      if (err) return util.handleDBError(err);
      
      var marc = item.marc;
      
      if (req.accepts('application/marc')) {
        res.status(200).send(marcConvert.jsonToMarc(marc));
      } else if (req.accepts('json')) {
        res.status(200).json(marc);
      } else {
        res.status(406).json(['application/marc', 'application/json']);
      }
    });
  });
  
  addCollection(Patron, 'patrons', {
    delete: function(req, res, patron, next) {
      var promises = [];
      
      for (var checkoutID of patron.checkoutIDs) {
        // remove checkout's item's checkoutID
        promises.push(new Promise(function(resolve, reject) {
          Checkout.findById(checkoutID, function(err, checkout) {
            if (err) return reject(err);
            
            Item.findByIdAndUpdate(
              checkout.patronID,
              {$unset: {checkoutID: ''}}
            ).exec(function(err) {
              if (err) return reject(err);
              resolve();
            });
          });
        }));
        
        // delete checkout
        promises.push(Checkout.findByIdAndRemove(checkoutID).exec());
      }
      
      Promise.all(promises).then(next, util.handleDBError);
    }
  }, ['checkoutIDs']);
};