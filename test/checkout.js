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

var chai = require('chai');
var chaiHttp = require('chai-http');
var chaiSubset = require('chai-subset');

var should = chai.should();
chai.use(chaiHttp);
chai.use(chaiSubset);

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
  patchProperties: {
    string: false,
    topLevel: {
      property: 'renewals',
      value: 87
    },
    nested: false
  },
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
  },
  additionalTests: () => {
    it('updates item and patron after POST /v0/checkouts', done => {
      Promise.all([
        Item.create(testItems[0]),
        Patron.create(testPatrons[0])
      ]).then(docs => {
        var item = docs[0], patron = docs[1];
        should.not.exist(item.checkoutID);
        item.status.should.equal('in');
        patron.should.have.property('checkouts').that.is.an('array')
          .with.lengthOf(0);
        
        var checkout = JSON.parse(JSON.stringify(testCheckouts[0]));
        checkout.itemID = item._id;
        checkout.patronID = patron._id;
        
        chai.request(server)
        .post('/v0/checkouts')
        .send(checkout)
        .end((err, res) => {
          res.should.have.status(201);
          res.header.should.have.property('location')
            .that.match(/^\/v0\/checkouts\/[\da-fA-F]{24}$/);
          
          var location = res.header.location;
          var id = location.slice(location.lastIndexOf('/') + 1);
          
          Promise.all([
            Item.findById(item._id).exec(),
            Patron.findById(patron._id).exec()
          ]).then(dbDocs => {
            var dbItem = dbDocs[0], dbPatron = dbDocs[1];

            should.exist(dbItem.checkoutID);
            dbItem.checkoutID.toString().should.equal(id);
            dbItem.status.should.equal('out');

            JSON.parse(JSON.stringify(dbPatron.checkouts))
              .should.deep.equal([id]);

            done();
          }, should.not.exist).catch(done);
        });
      }, should.not.exist).catch(done);
    });
    
    function testChangedXIdInPut({item = false, patron = false} = {}) {
      return done => {
        // Add the patron(s) and item(s)
        Promise.all([
          Patron.create(patron ? testPatrons.slice(0, 2) : testPatrons[0]),
          Item.create(item ? testItems.slice(0, 2) : testItems[0])
        ]).then(docs => {
          var [patrons, items] = docs;
          
          // Add the checkout with the 0th IDs
          var checkout = JSON.parse(JSON.stringify(testCheckouts[0]));
          checkout.patronID = (patron ? patrons[0] : patrons)._id;
          checkout.itemID = (item ? items[0] : items)._id;
          Checkout.create(checkout, (err, dbCheckout) => {
            should.not.exist(err);
            var id = dbCheckout._id;
            
            // Update the patron and item
            Promise.all([
              Patron.findByIdAndUpdate((patron ? patrons[0] : patrons)._id,
                {$push: {checkouts: id}}).exec(),
              Item.findByIdAndUpdate((item ? items[0] : items)._id,
                {$set: {checkoutID: id}}).exec()
            ]).then(() => {
              // Change the patron/item ID
              if (patron) checkout.patronID = patrons[1]._id;
              if (item) checkout.itemID = items[1]._id;
              
              // Actually make the request
              chai.request(server)
              .put(`/v0/checkouts/${id}`)
              .send(checkout)
              .end((err, res) => {
                // Check elementary things
                should.not.exist(err);
                res.should.have.status(204);
                res.body.should.eql({});
                res.should.have.property('text').that.is.eql('');
                
                // Check that the patrons were juggled
                Promise.all(
                  (patron ? [
                    Patron.findById(patrons[0]._id),
                    Patron.findById(patrons[1]._id)
                  ] : []).concat(item ? [
                    Item.findById(items[0]._id),
                    Item.findById(items[1]._id)
                  ] : [])
                ).then(docs => {
                  if (patron) {
                    var patrons = docs.slice(0, 2);
                    patrons[0].should.have.property('checkouts')
                      .that.is.an('array')
                      .with.lengthOf(0);
                    patrons[1].should.have.property('checkouts')
                      .that.is.an('array')
                      .with.lengthOf(1)
                      .and.deep.include.members([id]);
                  }
                  if (item) {
                    var items = patron ? docs.slice(2, 4) : docs.slice(0, 2);
                    should.not.exist(items[0].checkoutID);
                    items[1].should.have.property('checkoutID').that.is.eql(id);
                  }
                  done();
                }, should.not.exist).catch(done);
              });
            }, should.not.exist).catch(done);
          });
        }, should.not.exist).catch(done);
      };
    }
    
    it('handles a changed patron ID in PUT /v0/checkouts/:id',
      testChangedXIdInPut({item: false, patron: true}));
    it('handles a changed item ID in PUT /v0/checkouts/:id',
      testChangedXIdInPut({item: true, patron: false}));
    it('handles changed item and patron IDs in PUT /v0/checkouts/:id',
      testChangedXIdInPut({item: true, patron: true}));
  }
});