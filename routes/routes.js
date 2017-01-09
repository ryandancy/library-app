const mergePatch = require('json-merge-patch');

const util = require('./util.js');
const addCollectionFunc = require('./add-collection.js');
const marcConvert = require('./marc-convert.js');

const Admin = require('../models/admin.js');
const Checkout = require('../models/checkout.js');
const Item = require('../models/item.js');
const Patron = require('../models/patron.js');

module.exports = (router, baseUri) => {
  const addCollection = addCollectionFunc(router, baseUri);
  
  addCollection(Admin, 'admins');
  
  addCollection(Checkout, 'checkouts', {
    create: (req, res, checkout, next) => {
      let promises = [];
      
      // update item status, make sure item's not checked out already
      promises.push(new Promise((resolve, reject) => {
        Item.findById(checkout.itemID, (err, item) => {
          if (item === null) return resolve(); // it doesn't exist
          if (err) return reject(err);
          
          if (item.status !== 'in') {
            res.status(422).json({msg: 'Cannot create checkout: item not in'});
            return resolve(item.status);
          }
          
          item.status = 'out';
          item.checkoutID = checkout._id;
          item.save(err => {
            if (err) return reject(err);
            resolve();
          });
        });
      }));
      
      // update patron checkouts
      promises.push(Patron.findByIdAndUpdate(
        checkout.patronID,
        {$push: {checkouts: checkout._id}}
      ).exec());
      
      Promise.all(promises).then(next, err => util.handleDBError(err, res));
    },
    update: (req, res, oldCheckout, newCheckout, next) => {
      let promises = [];
      
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
          {$set: {status: 'out', checkoutID: oldCheckout._id}}
        ).exec());
      }
      
      // handle changed patron ID
      if (oldCheckout.patronID !== newCheckout.patronID) {
        // remove checkout from old patron
        promises.push(Patron.findByIdAndUpdate(
          oldCheckout.patronID,
          {$pull: {checkouts: oldCheckout._id}}
        ).exec());
        
        // add checkout to new patron
        promises.push(Patron.findByIdAndUpdate(
          newCheckout.patronID,
          {$push: {checkouts: oldCheckout._id}} // it's the same ID b/c update
        ).exec());
      }
      
      Promise.all(promises).then(next, err => util.handleDBError(err, res));
    },
    delete: (req, res, checkout, next) => {
      let promises = [];
      
      // update item status, remove item checkoutID
      promises.push(new Promise((resolve, reject) => {
        Item.findById(checkout.itemID, (err, item) => {
          if (item === null) return resolve(); // it doesn't exist
          if (err) return reject(err);
          
          item.status = 'in';
          item.checkoutID = undefined; // for some reason `delete` doesn't work
          
          item.save(err => {
            if (err) return reject(err);
            resolve();
          });
        });
      }));
      
      // update the patron's checkouts
      // silently ignore if the checkout's not in the patron's checkouts
      promises.push(Patron.findByIdAndUpdate(
        checkout.patronID,
        {$pull: {checkouts: checkout._id}}
      ).exec());
      
      Promise.all(promises).then(next, err => util.handleDBError(err, res));
    }
  });
  
  addCollection(Item, 'items', {
    delete: (req, res, item, next) => {
      let promises = [];
      
      if (item.checkoutID !== undefined) {
        // remove checkout from checkout's patron's checkouts
        promises.push(new Promise((resolve, reject) => {
          Checkout.findById(item.checkoutID, (err, checkout) => {
            if (err) return reject(err);
            
            Patron.findByIdAndUpdate(
              checkout.patronID,
              {$pull: {checkouts: item.checkoutID}}
            ).exec(err => {
              if (err) return reject(err);
              resolve();
            });
          });
        }));
        
        // delete checkout
        promises.push(Checkout.findByIdAndRemove(item.checkoutID).exec());
      }
      
      Promise.all(promises).then(next, err => util.handleDBError(err, res));
    }
  }, ['checkoutID']);
  
  let marcPath = '/items/:id/marc';
  
  router.get(marcPath, (req, res) => {
    if (!util.validate(req, res)) return;
    
    Item.findById(req.params.id, (err, item) => {
      if (item === null) return res.status(404).send(); // it doesn't exist
      if (err) return util.handleDBError(err, res);
      
      let marc = item.marc;
      
      if (req.accepts('application/marc')) {
        res.status(200).send(marcConvert.jsonToMarc(marc));
      } else if (req.accepts('json')) {
        res.status(200).json(marc);
      } else {
        res.status(406).json(['application/marc', 'application/json']);
      }
    });
  });
  
  router.put(marcPath, (req, res) => {
    if (!util.validate(req, res)) return;
    
    let marc;
    switch (req.get('Content-Type')) {
      case 'application/json':
        marc = req.body;
        break;
      case 'application/marc':
        marc = marcConvert.marcToJson(req.body);
        break;
      default:
        res.status(415).send(['application/marc', 'application/json']);
        return;
    }
    
    // Not using findByIdAndUpdate because it wasn't validating propertly
    Item.findById(req.params.id, (err, item) => {
      if (item === null) return res.status(404).send(); // it doesn't exist
      if (err) return util.handleDBError(err, res);
      
      item.marc = marc;
      item.save(err => {
        if (err) {
          return util.handleDBError(
            err, res, err.name === 'ValidationError' ? 422 : 500);
        }
        res.status(204).send();
      });
    });
  });
  
  router.patch(marcPath, (req, res) => {
    if (!util.validate(req, res)) return;
    
    Item.findById(req.params.id, (err, item) => {
      if (item === null) return res.status(404).send(); // it doesn't exist
      if (err) return util.handleDBError(err, res);
      
      item.marc = mergePatch.apply(
        JSON.parse(JSON.stringify(item.marc)), req.body);
      item.save((err, item) => {
        if (err) {
          return util.handleDBError(
            err, res, err.name === 'ValidationError' ? 422 : 500);
        }
        res.status(200).json(item.marc);
      });
    });
  });
  
  addCollection(Patron, 'patrons', {
    delete: (req, res, patron, next) => {
      let promises = [];
      
      for (let checkoutID of patron.checkouts) {
        // remove checkout's item's checkoutID
        promises.push(new Promise((resolve, reject) => {
          Checkout.findById(checkoutID, (err, checkout) => {
            if (checkout === null) return resolve(); // ignore nonexistant stuff
            if (err) return reject(err);
            
            Item.findByIdAndUpdate(
              checkout.itemID,
              {$unset: {checkoutID: ''}, $set: {status: 'in'}}
            ).exec(err => {
              if (err) return reject(err);
              resolve();
            });
          });
        }));
        
        // delete checkout
        promises.push(Checkout.findByIdAndRemove(checkoutID).exec());
      }
      
      Promise.all(promises).then(next, err => util.handleDBError(err, res));
    }
  }, ['checkouts']);
};