process.env.NODE_ENV = 'test';

var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var server = require('../server.js');
var template = require('./template.js');
var util = require('./util.js');

var Item = require('../models/item.js');
var Patron = require('../models/patron.js');
var Checkout = require('../models/checkout.js');

var testItems = require('./test-docs/item.js');
var testPatrons = require('./test-docs/patron.js');
var testCheckouts = require('./test-docs/checkout.js');
var testMarc = require('./test-docs/marc.js');

var chai = require('chai');
var chaiHttp = require('chai-http');
var chaiSubset = require('chai-subset');

var should = chai.should();
chai.use(chaiHttp);
chai.use(chaiSubset);

template({
  path: '/v0/items',
  model: Item,
  name: {
    singular: 'item',
    plural: 'items'
  },
  testDocs: testItems,
  patchProperties: {
    string: false,
    topLevel: {
      property: 'barcode',
      value: 89346136491
    },
    nested: {
      property: 'leader',
      parentProperty: 'marc',
      value: '098765432109876543210987'
    }
  },
  optionalProperties: ['checkoutID'],
  ignoredProperties: ['marc.fields.control.*', 'marc.fields.variable.*'],
  generator: num => ({
    marc: {
      leader: '123456789012345678901234',
      fields: {
        control: [],
        variable: []
      }
    },
    barcode: 1234,
    status: 'in'
  }),
  additionalTests: () => {
    for (let collection = 0; collection < 2; collection++) {
      // let's just treat collection as a boolean cause JS is weird
      var suffix = collection ? '' : '/:id';
      it(`deletes checkout on DELETE /v0/items${suffix}`, done => {
        // Add the item and patron
        Promise.all([
          Item.create(testItems.simple1),
          Patron.create(testPatrons.simple1)
        ]).then(docs => {
          var [item, patron] = docs;
          
          // Build and add the checkout
          var checkoutForDB = JSON.parse(JSON.stringify(testCheckouts[0]));
          checkoutForDB.itemID = item._id;
          checkoutForDB.patronID = patron._id;
          Checkout.create(checkoutForDB, (err, checkout) => {
            should.not.exist(err);
            
            // Update the item and patron
            Promise.all([
              Item.findByIdAndUpdate(item._id,
                {$set: {checkoutID: checkout._id}}).exec(),
              Patron.findByIdAndUpdate(patron._id,
                {$push: {checkouts: checkout._id}}).exec()
            ]).then(() => {
              // Actually send the request
              chai.request(server)
              .delete(collection ? '/v0/items' : `/v0/items/${item._id}`)
              .end((err, res) => {
                res.should.have.status(204);
                res.body.should.deep.equal({});
                res.should.have.property('text').that.is.deep.equal('');
                
                // Verify that all the stuff's correct
                Promise.all([
                  Item.count({}).exec(),
                  Checkout.count({}).exec(),
                  Patron.findById(patron._id).exec()
                ]).then(data => {
                  var [itemCount, checkoutCount, patron] = data;
                  
                  itemCount.should.deep.equal(0);
                  checkoutCount.should.deep.equal(0);
                  
                  patron.should.have.property('checkouts')
                    .that.is.an('array')
                    .with.lengthOf(0);
                  
                  done();
                }, should.not.exist).catch(done);
              });
            }, should.not.exist).catch(done);
          });
        }, should.not.exist).catch(done);
      });
    }
    
    function testMarcGet(accept, item, marc = item.marc) {
      if (!accept.includes('/')) accept = 'application/' + accept;
      
      return done => {
        util.populateDB(item, Item, (item, dbItems) => {
          chai.request(server)
          .get(`/v0/items/${dbItems[0]._id}/marc`)
          .set('Accept', accept)
          .end((err, res) => {
            res.should.have.status(200);
            if (Object.keys(res.body).length === 0) { // is empty object
              res.text.should.deep.equal(marc);
            } else {
              res.body.should.deep.equal(marc);
            }
            done();
          });
        }, done);
      };
    }
    
    describe.only('GET /v0/items/:id/marc', () => {
      it('can retrieve simple MARC in application/json',
        testMarcGet('json', testItems.simple1));
      it('can retrieve simple MARC in application/marc',
        testMarcGet('marc', testItems.simple1, testMarc.simple1));
      it('can retrieve another simple MARC in application/json',
        testMarcGet('json', testItems.simple2));
      it('can retrieve another simple MARC in application/marc',
        testMarcGet('marc', testItems.simple2, testMarc.simple2));
      it('can retrieve unicode MARC in application/json',
        testMarcGet('json', testItems.unicode));
      it('can retrieve unicode MARC in application/marc',
        testMarcGet('marc', testItems.unicode, testMarc.unicode));
      it('can retrieve whitespace MARC in application/json',
        testMarcGet('json', testItems.whitespace));
      it('can retrieve whitespace MARC in application/marc',
        testMarcGet('marc', testItems.whitespace, testMarc.whitespace));
      it('prefers application/marc',
        testMarcGet('*/*', testItems.simple1, testMarc.simple1));
    });
  }
});