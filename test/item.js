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
    
    function castToMediaType(str, defaultType = 'application') {
      return str.includes('/') ? str : defaultType + '/' + str;
    }
    
    function testMarcGet(accept, item, marc = item.marc) {
      accept = castToMediaType(accept);
      
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
    
    var marcPath = '/v0/items/:id/marc';
    describe('GET /v0/items/:id/marc', () => {
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
      
      it('gives a 406 on a valid media type that\'s not json/marc',
        util.testStatus(marcPath, Item, 406, {}, [testItems.simple1], 'get',
          undefined, {accept: 'text/plain'}));
      it('gives a 406 on an invalid media type',
        util.testStatus(marcPath, Item, 406, {}, [testItems.simple1], 'get',
          undefined, {accept: 'ioauheofasoe7o76'}));
      
      util.testIDHandling(marcPath, 'MARC record', Item, {}, 'get',
        testItems.simple1);
    });
    
    function testMarcPut(type, item, marc, jsonMarc = marc) {
      type = castToMediaType(type);
      
      return done => {
        util.populateDB(item, Item, (item, dbItems) => {
          chai.request(server)
          .put(`/v0/items/${dbItems[0]._id}/marc`)
          .send(marc)
          .set('Content-Type', type)
          .end((err, res) => {
            res.should.have.status(204);
            res.body.should.deep.equal({});
            res.should.have.property('text').that.is.deep.equal('');
            
            // Verify that it was updated
            Item.findById(dbItems[0]._id, (err, newItem) => {
              should.not.exist(err);
              newItem.marc.should.containSubset(jsonMarc);
              done();
            });
          });
        }, done);
      };
    }
    
    describe('PUT /v0/items/:id/marc', () => {
      it('can replace a simple record with another, json',
        testMarcPut('json', testItems.simple1, testItems.simple2.marc));
      it('can replace a simple record with another, marc',
        testMarcPut('marc', testItems.simple1, testMarc.simple2,
          testItems.simple2.marc));
      it('can replace a simple record with a unicode record, json',
        testMarcPut('json', testItems.simple1, testItems.unicode.marc));
      it('can replace a simple record with a unicode record, marc',
        testMarcPut('marc', testItems.simple1, testMarc.unicode,
          testItems.unicode.marc));
      it('can replace a simple record with a whitespace record, json',
        testMarcPut('json', testItems.simple1, testItems.whitespace.marc));
      it('can replace a simple record with a whitespace record, marc',
        testMarcPut('marc', testItems.simple1, testMarc.whitespace,
          testItems.whitespace.marc));
      it('can replace a unicode record with a simple record, json',
        testMarcPut('json', testItems.unicode, testItems.simple1.marc));
      it('can replace a unicode record with a simple record, marc',
        testMarcPut('marc', testItems.unicode, testMarc.simple1,
          testItems.simple1.marc));
      it('can replace a unicode record with a whitespace record, json',
        testMarcPut('json', testItems.unicode, testItems.whitespace.marc));
      it('can replace a unicode record with a whitespace record, marc',
        testMarcPut('marc', testItems.unicode, testMarc.whitespace,
          testItems.whitespace.marc));
      it('can replace a whitespace record with a simple record, json',
        testMarcPut('json', testItems.whitespace, testItems.simple1.marc));
      it('can replace a whitespace record with a simple record, marc',
        testMarcPut('marc', testItems.whitespace, testMarc.simple1,
          testItems.simple1.marc));
      it('can replace a whitespace record with a unicode record, json',
        testMarcPut('json', testItems.whitespace, testItems.unicode.marc));
      it('can replace a whitespace record with a unicode record, marc',
        testMarcPut('marc', testItems.whitespace, testMarc.unicode,
          testItems.unicode.marc));
    });
  }
});