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
      
      Promise.all(updatePromises).then(() => done(), err => done(Error(err)));
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
      Promise.all(promises).then(() => done(), err => done(Error(err)));
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
    
    function getChangedXIdInXTester(method, status, sendFunc) {
      return ({item = false, patron = false} = {}) => {
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
                // Prepare the thing to be sent
                var send = sendFunc(patron, item, patrons, items, checkout);
                
                // Actually make the request
                chai.request(server)[method](`/v0/checkouts/${id}`)
                .send(send)
                .end((err, res) => {
                  // Check elementary things
                  should.not.exist(err);
                  res.should.have.status(status);
                  if (status === 204) {
                    res.body.should.eql({});
                    res.should.have.property('text').that.is.eql('');
                  }
                  
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
                      items[1].should.have.property('checkoutID')
                        .that.is.eql(id);
                    }
                    done();
                  }, should.not.exist).catch(done);
                });
              }, should.not.exist).catch(done);
            });
          }, should.not.exist).catch(done);
        };
      };
    }
    
    var testChangedXIdInPut = getChangedXIdInXTester('put', 204,
      (patron, item, patrons, items, checkout) => {
        if (patron) checkout.patronID = patrons[1]._id;
        if (item) checkout.itemID = items[1]._id;
        return checkout;
      });
    
    var testChangedXIdInPatch = getChangedXIdInXTester('patch', 200,
      (patron, item, patrons, items) => {
        var patch = {};
        if (patron) patch.patronID = patrons[1]._id;
        if (item) patch.itemID = items[1]._id;
        return patch;
      });
    
    it('handles a changed patron ID in PUT /v0/checkouts/:id',
      testChangedXIdInPut({item: false, patron: true}));
    it('handles a changed item ID in PUT /v0/checkouts/:id',
      testChangedXIdInPut({item: true, patron: false}));
    it('handles changed item and patron IDs in PUT /v0/checkouts/:id',
      testChangedXIdInPut({item: true, patron: true}));
    
    it('handles a changed patron ID in PATCH /v0/checkouts/:id',
      testChangedXIdInPatch({item: false, patron: true}));
    it('handles a changed item ID in PATCH /v0/checkouts/:id',
      testChangedXIdInPatch({item: true, patron: false}));
    it('handles changed item and patron IDs in PATCH /v0/checkouts/:id',
      testChangedXIdInPatch({item: true, patron: true}));
    
    function testDelete({status = 'in', collection = false} = {}) {
      return done => {
        // Add the item and patron
        var itemForDB = JSON.parse(JSON.stringify(testItems[0]));
        itemForDB.status = status;
        Promise.all([
          Item.create(itemForDB),
          Patron.create(testPatrons[0])
        ]).then(docs => {
          var [item, patron] = docs;
          
          // Make the checkout
          var checkout = JSON.parse(JSON.stringify(testCheckouts[0]));
          checkout.itemID = item._id;
          checkout.patronID = patron._id;
          Checkout.create(checkout, (err, dbCheckout) => {
            should.not.exist(err);
            var id = dbCheckout._id;
            
            // Update the item and patron
            Promise.all([
              Item.findByIdAndUpdate(item._id, {$set: {checkoutID: id}}).exec(),
              Patron.findByIdAndUpdate(patron._id,
                {$push: {checkouts: id}}).exec()
            ]).then(() => {
              // Actually make the request
              chai.request(server)
              .delete(collection ? '/v0/checkouts' : `/v0/checkouts/${id}`)
              .end((err, res) => {
                should.not.exist(err);
                res.should.have.status(204);
                res.body.should.deep.equal({});
                res.should.have.property('text').that.is.deep.equal('');
                
                Promise.all([
                  Checkout.count({}).exec(),
                  Item.findById(item._id).exec(),
                  Patron.findById(patron._id).exec()
                ]).then(data => {
                  var [count, item, patron] = data;
                  count.should.deep.equal(0);
                  
                  should.not.exist(item.checkoutID);
                  item.status.should.equal('in');
                  
                  patron.should.have.property('checkouts')
                    .that.is.an('array')
                    .that.is.not.with.members([id]); // allow other checkouts
                  
                  done();
                }, should.not.exist).catch(done);
              });
            }, should.not.exist).catch(done);
          });
        }, should.not.exist).catch(done);
      };
    }
    
    it('updates item[status="in"] and patron on DELETE /v0/checkouts/:id',
      testDelete());
    it('updates item[status="out"] and patron on DELETE /v0/checkouts/:id',
      testDelete({status: 'out'}));
    it('updates item[status="missing"] and patron on DELETE /v0/checkouts/:id',
      testDelete({status: 'missing'}));
    it('updates item[status="lost"] and patron on DELETE /v0/checkouts/:id',
      testDelete({status: 'lost'}));
      
    it('updates item[status="in"] and patron on DELETE /v0/checkouts',
      testDelete({collection: true}));
    it('updates item[status="out"] and patron on DELETE /v0/checkouts',
      testDelete({status: 'out', collection: true}));
    it('updates item[status="missing"] and patron on DELETE /v0/checkouts',
      testDelete({status: 'missing', collection: true}));
    it('updates item[status="lost"] and patron on DELETE /v0/checkouts',
      testDelete({status: 'lost', collection: true}));
  }
});