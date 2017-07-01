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
      
      Promise.all(promises).then(
        () => next(),
        err => util.handleDBError(err, res));
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
      
      Promise.all(promises).then(
        () => next(),
        err => util.handleDBError(err, res));
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
      
      Promise.all(promises).then(
        () => next(),
        err => util.handleDBError(err, res));
    }
  });
  
  addCollection(Item, 'items', {
    // Parse MARC and convert to item format
    create: (req, res, marc, next) => {
      if (req.get('Content-Type') !== 'application/marc') return next();
      
      let jsonMarc = marcConvert.marcToJson(marc);
      let item = {marc: jsonMarc, status: 'in'};
      
      function findSubfield(field, subfield) {
        for (let subf of field.subfields) {
          if (subf.tag === subfield) {
            return subf.value;
          }
        }
      }
      
      /*
        Necessary information is found in the following MARC fields:
        - 020$a: ISBN
        - 100$a: author
        - 245$a: title
        - 245$b: subtitle
        - 250$a: edition
        - 260$a: pubPlace - note: unknown == '[S.1.]'
        - 260$b: publisher
        - 260$c: pubYear
      */
      
      // Find all fields, put in `fields`, removing from tagsToFind each time
      // This makes sure that for repeated fields, the first field is used
      let tagsToFind = [20, 100, 245, 250, 260];
      let fields = {};
      
      for (let field of jsonMarc.fields.variable) {
        if (tagsToFind.includes(field.tag)) {
          fields[field.tag] = field;
          tagsToFind = tagsToFind.filter(tag => tag !== field.tag);
        }
      }
      
      // Transfer fields to `item` (dealing with pubPlace specially)
      
      let transferData = [ // [field name, tag, subfield, numeric?]
        ['isbn', 20, 'a', true],
        ['author', 100, 'a', false],
        ['title', 245, 'a', false],
        ['subtitle', 245, 'b', false],
        ['edition', 250, 'a', false],
        ['pubPlace', 260, 'a', false],
        ['publisher', 260, 'b', false],
        ['pubYear', 260, 'c', true]
      ];
      
      for (let [name, tag, subfield, numeric] of transferData) {
        if (tag in fields) {
          let subf = findSubfield(fields[tag], subfield);
          if (subf !== undefined // for pubPlace, [S.1.] means unknown
              && !(name === 'pubPlace' && subf === '[S.1.]')) {
            if (numeric) {
              // This mess is to try to extract numbers from crap like 'c1991x'
              for (let i = 0; i < subf.length; i++) {
                subf = parseInt(subf.slice(i), 10);
                if (!isNaN(subf)) break;
              }
              if (isNaN(subf)) continue;
            }
            item[name] = subf;
          }
        }
      }
      
      // Generate a barcode -- REVIEW should we even be generating barcodes???
      // HACK this is possibly the worst hashing algorithm ever devised
      // So we add up all the things in a string, add up the bytes, multiply
      // by a prime, add some random kajiggle, modulo by a bunch, and hope it
      // works, m'kay? What could possibly go wrong?
      let strToConvert = (item.isbn || '').toString() + (item.author || '')
        + (item.title || '') + (item.subtitle || '') + (item.edition || '')
        + (item.pubPlace || '') + (item.publisher || '')
        + (item.pubYear || '').toString();
      
      let barcode = 0;
      for (let i = 0; i < strToConvert.length; i++) {
        barcode += strToConvert.charCodeAt(i);
      }
      
      barcode *= 2662816691; // magic numbers are always a good idea, right?
      barcode += Math.floor(Math.abs(Math.random()) * 1000000);
      barcode %= 10000000000; // hopefully 10 digits is what we want?
      barcode = barcode.toString();
      barcode = '0'.repeat(10 - barcode.length) + barcode; // pad to 10 digits
      
      item.barcode = barcode;
      
      next(item);
    },
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
      
      Promise.all(promises).then(
        () => next(),
        err => util.handleDBError(err, res));
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
      
      Promise.all(promises).then(
        () => next(),
        err => util.handleDBError(err, res));
    }
  }, ['checkouts']);
};