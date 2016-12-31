process.env.NODE_ENV = 'test';

var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var server = require('../server.js');
var template = require('./template.js');

var Checkout = require('../models/checkout.js');
var Item = require('../models/item.js');
var Patron = require('../models/patron.js');

var oldTestItems = Object.values(require('./test-docs/item.js'));
var testPatrons = Object.values(require('./test-docs/patron.js'));
var testCheckouts = require('./test-docs/checkout.js');

var testItems = oldTestItems.map(item => {
  item.status = 'in';
  return item;
});

template({
  path: '/v0/checkouts',
  model: Checkout,
  name: {
    singular: 'checkout',
    plural: 'checkouts'
  },
  testDocs: {
    simple1: testCheckouts[0],
    simple2: testCheckouts[1]
  },
  modifiableStringProperty: false,
  generator: num => ({
    dueDate: new Date(2018, 11, 25),
    itemID: ObjectId('123456789012345678901234'),   // filled by pre hook
    patronID: ObjectId('123456789012345678901234'), // this too
    renewals: 1000 + num,
    status: 'onTime'
  }),
  beforeEach: (done, testDocs) => {
    Promise.all([
      Item.remove({}).exec(),
      Patron.remove({}).exec()
    ]).then(() => {
      // Add items and patrons, then update test checkout IDs
      Promise.all([
        Item.insertMany(testItems),
        Patron.insertMany(testPatrons)
      ]).then(dbDocs => {
        var dbItems = dbDocs[0], dbPatrons = dbDocs[1];
        testDocs.simple1.itemID = dbItems[0]._id;
        testDocs.simple1.patronID = dbPatrons[0]._id;
        testDocs.simple2.itemID = dbItems[1]._id;
        testDocs.simple2.patronID = dbPatrons[1]._id;
        done();
      }, done);
    }, done);
  },
  populateDBHooks: {
    pre: (checkouts, done) => {
      // Fix references in generated checkouts
      var updatePromises = [];
      
      for (var checkout of checkouts) {
        if (checkout.renewals === 999) {
          // it's a generated checkout -- add an item & patron to reference
          var refItem = {
            marc: {
              leader: '123456789012345678901234',
              fields: {
                control: [],
                variable: []
              }
            },
            barcode: checkout.renewals,
            status: 'in'
          };
          var refPatron = {
            name: 'GenCheckoutPatron-' + (checkout.renewals - 1000),
            pic: 'http://example.com/checkout-' + (checkout.renewals - 1000)
               + '.jpg',
            checkouts: [/* Filled by post hook */]
          };
          
          updatePromises.push(Promise.all([
            Item.create(refItem).exec(),
            Patron.create(refPatron).exec()
          ]).then(dbRefs => {
            checkout.itemID = dbRefs[0]._id;
            checkout.patronID = dbRefs[1]._id;
          }, done));
        }
      }
      
      Promise.all(updatePromises).then(docs => done(), err => done(Error(err)));
    },
    post: (checkouts, dbCheckouts, done) => {
      // update the checkouts' items' and patrons' checkoutIDs
      var promises = [];
      for (var checkout of dbCheckouts) {
        promises.push(Item.findByIdAndUpdate(
          checkout.itemID, {$set: {checkoutID: checkout._id}}));
        promises.push(Patron.findByIdAndUpdate(
          checkout.patronID, {$push: {checkouts: checkout._id}}));
      }
      Promise.all(promises).then(docs => done(), err => done(Error(err)));
    }
  }
});