process.env.NODE_ENV = 'test';

var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var server = require('../server.js');
var template = require('./template.js');

var Patron = require('../models/patron.js');
var Checkout = require('../models/checkout.js');
var Item = require('../models/item.js');

var items = require('./item-examples.js');

template({
  path: '/v0/patrons',
  model: Patron,
  name: {
    singular: 'patron',
    plural: 'patrons'
  },
  testDocs: {
    simple1: {
      name: 'Test Patron',
      pic: 'http://example.com/my-very-nice-picture.jpg',
      checkouts: []
    },
    simple2: {
      name: "I'm a patron who's a test",
      pic: 'https://example.org/another-picture.jpg',
      checkouts: [/* 1 checkout ID here, filled by beforeEach hook */]
    },
    unicode: {
      name: 'Úñí¢öðè ïß ©öół 😃😃😃 (Patron Edition)',
      pic: 'http://abc123.com/foo.png',
      checkouts: [/* 2 checkout IDs here, filled by beforeEach hook */]
    },
    whitespace: {
      name: '    \t\t  \n\t\f\r\n   ',
      pic: 'http://totally-legit-pix.com/look-ma-im-a-ghost.jpg',
      checkouts: [/* 1 checkout ID here, filled by beforeEach hook */]
    }
  },
  generator: num => ({
    name: 'GeneratedPatron-' + num,
    pic: 'http://foo.bar/pic.png',
    checkouts: []
  }),
  beforeEach: (done, testDocs) => {
    Promise.all([
      Checkout.remove({}).exec(),
      Item.remove({}).exec()
    ]).then(() => {
      // Add the items, add the checkouts, then update the items' checkoutIDs
      Item.insertMany(items, (err, dbItems) => {
        if (err) return done(Error(err));
  
        // TODO get the checkouts from a future test/checkout.js
        // HACK using the renewals to keep track of which checkout is which
        var placeholderObjectId = ObjectId('123456789012345678901234');
        var checkouts = [{
          dueDate: new Date(2017, 5, 16),
          itemID: dbItems[0]._id,
          patronID: placeholderObjectId,
          renewals: 0,
          status: 'onTime'
        }, {
          dueDate: new Date(2003, 10, 3),
          itemID: dbItems[1]._id,
          patronID: placeholderObjectId,
          renewals: 1,
          status: 'late'
        }, {
          dueDate: new Date(2013, 1, 25),
          itemID: dbItems[2]._id,
          patronID: placeholderObjectId,
          renewals: 2,
          status: 'returned'
        }, {
          dueDate: new Date(1998, 9, 4),
          itemID: dbItems[3]._id,
          patronID: placeholderObjectId,
          renewals: 3,
          status: 'lost'
        }];
        
        Checkout.insertMany(checkouts, (err, dbCheckouts) => {
          if (err) return done(Error(err));
          
          // update the checkoutIDs on the items with the _ids from dbCheckouts
          var promises = [];
          for (var checkout of dbCheckouts) {
            promises.push(Item.findByIdAndUpdate(
              checkout.itemID, {$set: {checkoutID: checkout._id}}).exec());
          }
          
          Promise.all(promises).then(newItems => {
            dbCheckouts.sort((checkout1, checkout2) => {
              var r1 = checkout1.renewals, r2 = checkout2.renewals;
              return r1 > r2 ? 1 : r1 < r2 ? -1 : 0;
            });
            
            // update the test patrons' checkouts
            testDocs.simple2.checkouts = [dbCheckouts[0]._id];
            testDocs.unicode.checkouts = [
              dbCheckouts[1]._id, dbCheckouts[2]._id];
            testDocs.whitespace.checkouts = [dbCheckouts[3]._id];
            done();
          }, done);
        });
      });
    }, done);
  },
  populateDBHooks: {
    post: (patrons, dbPatrons, done) => {
      // update the patrons' checkouts' patronIDs
      var promises = [];
      for (var patron of dbPatrons) {
        for (var checkoutID of patron.checkouts) {
          promises.push(Checkout.findByIdAndUpdate(
            checkoutID, {$set: {patronID: patron._id}}).exec());
        }
      }
      
      Promise.all(promises).then(docs => done(), err => done(Error(err)));
    }
  }
});