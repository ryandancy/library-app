process.env.NODE_ENV = 'test';

var mongoose = require('mongoose');
var server = require('../server.js');
var template = require('./template.js');

var Patron = require('../models/patron.js');
var Checkout = require('../models/checkout.js');
var Item = require('../models/item.js');

var testItems = Object.values(require('./test-docs/item.js'));
var testPatrons = require('./test-docs/patron.js');
var testCheckouts = require('./test-docs/checkout.js');

var chai = require('chai');
var chaiHttp = require('chai-http');
var chaiSubset = require('chai-subset');

var should = chai.should();
chai.use(chaiHttp);
chai.use(chaiSubset);

template({
  path: '/v0/patrons',
  model: Patron,
  name: {
    singular: 'patron',
    plural: 'patrons'
  },
  testDocs: testPatrons,
  patchProperties: {
    topLevel: {
      property: 'pic',
      value: 'http://look-ma-ive-changed-ma-url.io/path/to/pic.png'
    },
    nested: false
  },
  customUnmodifiables: ['checkouts'],
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
      Item.insertMany(testItems, (err, dbItems) => {
        if (err) return done(Error(err));
        
        var checkouts = JSON.parse(JSON.stringify(testCheckouts));
        for (var i = 0; i < checkouts.length; i++) {
          checkouts[i].itemID = dbItems[i]._id;
        }
        
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
  },
  additionalTests: () => {
    for (let collection = 0; collection < 2; collection++) {
      // let's just treat `collection` as a boolean cause JS is weird
      var suffix = collection ? '' : '/:id';
      it(`deletes checkouts on DELETE /v0/patrons${suffix}`, done => {
        // Add the patron -- using unicode because 2 checkouts
        Patron.create(testPatrons.unicode, (err, patron) => {
          should.not.exist(err);
          // Actually send the request
          chai.request(server)
          .delete(collection ? '/v0/patrons' : `/v0/patrons/${patron._id}`)
          .end((err, res) => {
            res.should.have.status(204);
            res.body.should.deep.equal({});
            res.should.have.property('text').that.is.deep.equal('');
            
            // Verify all the stuff's correct
            Promise.all([
              Patron.count({}).exec(),
              Checkout.count({patronID: patron._id}).exec(),
              Item.find({}).exec()
            ]).then(data => {
              var [patronCount, checkoutCount, items] = data;
              patronCount.should.deep.equal(0);
              checkoutCount.should.deep.equal(0);
              
              for (var item of items) {
                if (item.checkoutID) {
                  item.checkoutID.should.not.deep.equal(patron.checkouts[0]);
                  item.checkoutID.should.not.deep.equal(patron.checkouts[1]);
                } else {
                  item.status.should.equal('in');
                }
              }
              
              done();
            }, should.not.exist).catch(done);
          });
        });
      });
    }
  }
});