process.env.NODE_ENV = 'test';

const server = require('../server.js');
const template = require('./template.js');
const util = require('./util.js');

const Item = require('../models/item.js');
const Patron = require('../models/patron.js');
const Checkout = require('../models/checkout.js');

const testItems = require('./test-docs/item.js');
const testPatrons = require('./test-docs/patron.js');
const testCheckouts = require('./test-docs/checkout.js');
const testMarc = require('./test-docs/marc.js');

const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiSubset = require('chai-subset');

const should = chai.should();
chai.use(chaiHttp);
chai.use(chaiSubset);

let generateDocs = num => ({
  marc: {
    leader: '123456789012345678901234',
    fields: {
      control: [{
        tag: 1,
        value: '89187647889'
      }],
      variable: [{
        tag: 20,
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: '0845348116'
        }]
      }]
    }
  },
  barcode: 10000 + num,
  status: 'in',
  title: `Generated Item #${num}`,
  author: 'Schmoe, Joe',
  publisher: 'Generator, Inc',
  itemType: 'language material'
});

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
  optionalProperties: [
    'checkoutID', 'subtitle', 'edition', 'pubPlace', 'pubYear', 'isbn'
  ],
  ignoredProperties: ['marc.fields.control.*', 'marc.fields.variable.*'],
  customUnmodifiables: ['checkoutID'],
  generator: generateDocs,
  additionalTests: () => {
    for (let collection = 0; collection < 2; collection++) {
      // let's just treat collection as a boolean cause JS is weird
      let suffix = collection ? '' : '/:id';
      it(`deletes checkout on DELETE /v0/items${suffix}`, done => {
        // Add the item and patron
        Promise.all([
          Item.create(testItems.simple1),
          Patron.create(testPatrons.simple1)
        ]).then(docs => {
          let [item, patron] = docs;
          
          // Build and add the checkout
          let checkoutForDB = JSON.parse(JSON.stringify(testCheckouts[0]));
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
                  let [itemCount, checkoutCount, patron] = data;
                  
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
    
    let marcHeaders = {
      accept: 'application/marc',
      'content-type': 'application/marc'
    };
    
    it('generates record length to replace ????? in the leader', done => {
      let item = {
        marc: {
          leader: '?????nam  2200024   4500',
          fields: {
            control: [],
            variable: [{
              tag: 100,
              ind1: '1',
              ind2: ' ',
              subfields: [{
                tag: 'a',
                value: 'Split, Banana'
              }]
            }, {
              tag: 245,
              ind1: ' ',
              ind2: ' ',
              subfields: [{
                tag: 'a',
                value: "Please Don't Eat Banana Splits"
              }]
            }, {
              tag: 260,
              ind1: ' ',
              ind2: ' ',
              subfields: [{
                tag: 'b',
                value: 'Banana Split Publishing Co.'
              }]
            }]
          }
        },
        barcode: 981723498,
        status: 'out',
        title: "Please Don't Eat Banana Splits",
        author: 'Split, Banana',
        publisher: 'Banana Split Publishing Co.',
        itemType: 'language material'
      };
      
      let marc = `?????nam  2200024   4500
100 1 $aSplit, Banana
245   $aPlease Don't Eat Banana Splits
260   $bBanana Split Publishing Co.`;
      
      chai.request(server)
      .post('/v0/items')
      .send(item)
      .end((err, res) => {
        res.should.have.status(201);
        
        let location = res.header.location;
        let id = location.slice(location.lastIndexOf('/') + 1);
        
        Item.findById(id, (err, dbItem) => {
          should.not.exist(err);
          let dbLength = parseInt(dbItem.marc.leader.slice(0, 5), 10);
          dbLength.should.equal(marc.length);
          done();
        });
      });
    });
    
    function testItemPostWithMarc(item, marc, db = []) {
      return util.testPost('/v0/items', item, Item, {}, db, marcHeaders, marc);
    }
    
    describe('POST /v0/items; Content-Type=application/marc', () => {
      it('creates an item from MARC',
        testItemPostWithMarc(testItems.simple1, testMarc.simple1));
      it('creates an item from MARC with unicode',
        testItemPostWithMarc(testItems.unicode, testMarc.unicode));
      it('creates an item from MARC with whitespace',
        testItemPostWithMarc(testItems.whitespace, testMarc.whitespace));
      
      it("creates an item from MARC when there's already an item in the DB",
        testItemPostWithMarc(testItems.simple1, testMarc.simple1,
          testItems.simple2));
      it("creates an item from MARC when there's already an identical one",
        testItemPostWithMarc(testItems.simple1, testMarc.simple1,
          testItems.simple1));
      it("creates an item from MARC when there's already 100 items in the DB",
        testItemPostWithMarc(testItems.simple1, testMarc.simple1,
          generateDocs(100)));
      
      let path = '/v0/items';
      // NOTE: the MARC parser will interpret literally any string as MARC
      // Therefore no 400s are given, only 422s
      it('gives a 422 on parseable but *really* invalid input',
        util.testStatus(path, Item, 422, {}, [], 'post', "I'm invalid MARC!",
          marcHeaders));
      it('gives a 422 on less obviously invalid input',
        util.testStatus(path, Item, 422, {}, [], 'post',
          '123456789012345678901234\n200  QZ\n38412$aHi!\nFJDIS\nI am invalid',
          marcHeaders));
      it('gives a 422 on the empty string as input',
        util.testStatus(path, Item, 422, {}, [], 'post', '', marcHeaders));
      // NOTE: all the objects must be strings because superagent can't handle
      // objects with Content-Type !== application/json
      it('gives a 422 on an empty object as input',
        util.testStatus(path, Item, 422, {}, [], 'post', '{}', marcHeaders));
      it('gives a 422 on a non-empty object as input',
        util.testStatus(path, Item, 422, {}, [], 'post', '{"foo": "bar"}',
          marcHeaders));
      it('gives a 422 on a MARC-JSON-ish object as input',
        util.testStatus(path, Item, 422, {}, [], 'post',
          JSON.stringify(testItems.simple1.marc), marcHeaders));
      it('gives a 422 on an array of valid MARCs as input',
        util.testStatus(path, Item, 422, {}, [], 'post',
          JSON.stringify([testMarc.simple1, testMarc.simple2]), marcHeaders));
      
      // TODO find some way to make this not look so ugly
      it('works fine with all optional + required properties and only that',
        util.testStatus(path, Item, 201, {}, [], 'post',
`05463nam  2200075 a 4500
001 89187647889
020   $a1234567890
100   $aSchmoe, Joe
245   $aMy Book$ba Book of Bookiness
250   $a2nd edition
260   $aDjibouti, Djibouti$bSchmoe Publishing$c1938`, marcHeaders));
      it('works fine with bare minimum required properties',
        util.testStatus(path, Item, 201, {}, [], 'post',
`05463nam  2200075 a 4500
001 89187647889
100   $aSchmoe, joe
245   $aMy Book
260   $bSchmoe Publishing`, marcHeaders));
      it('works fine when missing "isbn"',
        util.testStatus(path, Item, 201, {}, [], 'post',
`05463nam  2200075 a 4500
001 89187647889
100   $aSchmoe, Joe
245   $aMy Book$ba Book of Bookiness
250   $a2nd edition
260   $aDjibouti, Djibouti$bSchmoe Publishing$c1938`, marcHeaders));
      it('works fine when missing "subtitle"',
        util.testStatus(path, Item, 201, {}, [], 'post',
`05463nam  2200075 a 4500
001 89187647889
020   $a1234567890
100   $aSchmoe, Joe
245   $aMy Book
250   $a2nd edition
260   $aDjibouti, Djibouti$bSchmoe Publishing$c1938`, marcHeaders));
      it('works fine when missing "edition"',
        util.testStatus(path, Item, 201, {}, [], 'post',
`05463nam  2200075 a 4500
001 89187647889
020   $a1234567890
100   $aSchmoe, Joe
245   $aMy Book$ba Book of Bookiness
260   $aDjibouti, Djibouti$bSchmoe Publishing$c1938`, marcHeaders));
      it('works fine when missing "pubPlace"',
        util.testStatus(path, Item, 201, {}, [], 'post',
`05463nam  2200075 a 4500
001 89187647889
020   $a1234567890
100   $aSchmoe, Joe
245   $aMy Book$ba Book of Bookiness
250   $a2nd edition
260   $bSchmoe Publishing$c1938`, marcHeaders));
      it('works fine when missing "pubYear"',
        util.testStatus(path, Item, 201, {}, [], 'post',
`05463nam  2200075 a 4500
001 89187647889
020   $a1234567890
100   $aSchmoe, Joe
245   $aMy Book$ba Book of Bookiness
250   $a2nd edition
260   $aDjibouti, Djibouti$bSchmoe Publishing`, marcHeaders));
      it('works fine with non-"language material" itemType',
        util.testStatus(path, Item, 201, {}, [], 'post',
`05463nom  2200075 a 4500
001 89187647889
020   $a1234567890
100   $aSchmoe, Joe
245   $aMy Book$ba Book of Bookiness
250   $a2nd edition
260   $aDjibouti, Djibouti$bSchmoe Publishing$c1938`, marcHeaders));
      it('gives a 422 when missing "author"',
        util.testStatus(path, Item, 422, {}, [], 'post',
`05463nam  2200075 a 4500
001 89187647889
020   $a1234567890
245   $aMy Book$ba Book of Bookiness
250   $a2nd edition
260   $aDjibouti, Djibouti$bSchmoe Publishing$c1938`, marcHeaders));
      it('gives a 422 when missing "title"',
        util.testStatus(path, Item, 422, {}, [], 'post',
`05463nam  2200075 a 4500
001 89187647889
020   $a1234567890
100   $aSchmoe, Joe
245   $ba Book of Bookiness
250   $a2nd edition
260   $aDjibouti, Djibouti$bSchmoe Publishing$c1938`, marcHeaders));
      it('gives a 422 when missing "publisher"',
        util.testStatus(path, Item, 422, {}, [], 'post',
`05463nam  2200075 a 4500
001 89187647889
020   $a1234567890
100   $aSchmoe, Joe
245   $aMy Book$ba Book of Bookiness
250   $a2nd edition
260   $aDjibouti, Djibouti$c1938`, marcHeaders));
      it('gives a 422 with a nonstandard itemType',
        util.testStatus(path, Item, 422, {}, [], 'post',
`05463nqm  2200075 a 4500
001 89187647889
020   $a1234567890
100   $aSchmoe, Joe
245   $aMy Book$ba Book of Bookiness
250   $a2nd edition
260   $aDjibouti, Djibouti$bSchmoe Publishing$c1938`, marcHeaders));
    });
    
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
    
    let marcPath = '/v0/items/:id/marc';
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
      
      it('gives a 204 when missing "fields.control" (only in JSON)',
        util.testStatus(marcPath, Item, 204, {}, [testItems.simple1],
          'put', {leader: '123456789012345678901234', fields: {variable: []}}));
      it('gives a 204 when missing "fields.variable" (only in JSON)',
        util.testStatus(marcPath, Item, 204, {}, [testItems.simple1],
          'put', {leader: '123456789012345678901234', fields: {control: []}}));
      
      it('gives a 400 on invalid JSON',
        util.testStatus(marcPath, Item, 400, {}, [testItems.simple1],
          'put', 'inv??al\'id^7'));
      it('gives a 400 on strictly invalid JSON (parseable by JSON.parse)',
        util.testStatus(marcPath, Item, 400, {}, [testItems.simple1],
          'put', '"invalid"'));
      it('gives a 422 on invalid MARC',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1],
          'put', 'i89VA 6l????', marcHeaders));
      it('gives a 422 on empty MARC',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1],
          'put', '', marcHeaders));
      it('gives a 422 on empty object, json',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1],
          'put', {}));
      it('treats empty JSON the same as an empty object: 422',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1],
          'put', {}));
      it('gives a 422 when missing "leader" (only in JSON)',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1],
          'put', {fields: {control: [], variable: []}}));
      it('gives a 422 on an invalid leader, json',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1],
          'put', {leader: '1234', fields: {control: [], variable: []}}));
      it('gives a 422 on an invalid leader, marc',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1],
          'put', '1234\n001 5810733\n003 53255', marcHeaders));
      it('gives a 422 when missing "fields" (only in JSON)',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1],
          'put', {leader: '123456789012345678901234'}));
      it('gives a 422 when missing "tag" on a variable field',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1], 'put', {
          leader: '123456789012345678901234',
          fields: {
            control: [],
            variable: [{
              ind1: ' ',
              ind2: ' ',
              subfields: [{
                tag: 'a',
                value: 'foo'
              }]
            }]
          }
        }));
      it('gives a 422 when missing "ind1" on a variable field',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1], 'put', {
          leader: '123456789012345678901234',
          fields: {
            control: [],
            variable: [{
              tag: 102,
              ind2: ' ',
              subfields: [{
                tag: 'a',
                value: 'foo'
              }]
            }]
          }
        }));
      it('gives a 422 when missing "ind2" on a variable field',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1], 'put', {
          leader: '123456789012345678901234',
          fields: {
            control: [],
            variable: [{
              tag: 102,
              ind1: ' ',
              subfields: [{
                tag: 'a',
                value: 'foo'
              }]
            }]
          }
        }));
      it('gives a 422 when missing "tag" on a variable subfield',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1], 'put', {
          leader: '123456789012345678901234',
          fields: {
            control: [],
            variable: [{
              tag: 102,
              ind1: ' ',
              ind2: ' ',
              subfields: [{
                value: 'foo'
              }]
            }]
          }
        }));
      it('gives a 422 when missing "value" on a variable subfield',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1], 'put', {
          leader: '123456789012345678901234',
          fields: {
            control: [],
            variable: [{
              tag: 102,
              ind1: ' ',
              ind2: ' ',
              subfields: [{
                tag: 'a'
              }]
            }]
          }
        }));
      it('gives a 422 when "tag" > 999 on a variable field',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1], 'put', {
          leader: '123456789012345678901234',
          fields: {
            control: [],
            variable: [{
              tag: 1000,
              ind1: ' ',
              ind2: ' ',
              subfields: [{
                tag: 'a',
                value: 'abc'
              }]
            }]
          }
        }));
      it('gives a 422 when "tag" < 10 on a variable field',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1], 'put', {
          leader: '123456789012345678901234',
          fields: {
            control: [],
            variable: [{
              tag: 5,
              ind1: ' ',
              ind2: ' ',
              subfields: [{
                tag: 'a',
                value: 'abc'
              }]
            }]
          }
        }));
      it('gives a 422 when "ind1" is empty on a variable field',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1], 'put', {
          leader: '123456789012345678901234',
          fields: {
            control: [],
            variable: [{
              tag: 5,
              ind1: '',
              ind2: ' ',
              subfields: [{
                tag: 'a',
                value: 'abc'
              }]
            }]
          }
        }));
      it('gives a 422 when "ind2" is empty on a variable field',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1], 'put', {
          leader: '123456789012345678901234',
          fields: {
            control: [],
            variable: [{
              tag: 5,
              ind1: ' ',
              ind2: '',
              subfields: [{
                tag: 'a',
                value: 'abc'
              }]
            }]
          }
        }));
      it('gives a 422 when "ind1".length > 1 on a variable field',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1], 'put', {
          leader: '123456789012345678901234',
          fields: {
            control: [],
            variable: [{
              tag: 5,
              ind1: '  ',
              ind2: ' ',
              subfields: [{
                tag: 'a',
                value: 'abc'
              }]
            }]
          }
        }));
      it('gives a 422 when "ind2".length > 1 on a variable field',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1], 'put', {
          leader: '123456789012345678901234',
          fields: {
            control: [],
            variable: [{
              tag: 5,
              ind1: ' ',
              ind2: '  ',
              subfields: [{
                tag: 'a',
                value: 'abc'
              }]
            }]
          }
        }));
      it('gives a 422 when "tag".length > 1 on a variable subfield',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1], 'put', {
          leader: '123456789012345678901234',
          fields: {
            control: [],
            variable: [{
              tag: 5,
              ind1: '  ',
              ind2: ' ',
              subfields: [{
                tag: 'ab',
                value: 'abc'
              }]
            }]
          }
        }));
      
      it('gives a 415 on a valid Content-Type that\'s not marc/json',
        util.testStatus(marcPath, Item, 415, {}, [testItems.simple1],
          'put', 'foo', {accept: 'text/plain'}));
      it('gives a 415 on an invalid Content-Type',
        util.testStatus(marcPath, Item, 415, {}, [testItems.simple1],
          'put', 'as?3l', {accept: 'ajoiasjfp8aw677s'}));
      
      util.testIDHandling(marcPath, 'MARC record', Item, {}, 'put',
        testItems.simple1);
    });
    
    function testMarcPatch(item, patch, patchApplier) {
      return done => {
        util.populateDB(item, Item, (item, dbItems) => {
          let id = dbItems[0]._id;
          chai.request(server)
          .patch(`/v0/items/${id}/marc`)
          .send(patch)
          .end((err, res) => {
            res.should.have.status(200);
            
            let newItem = JSON.parse(JSON.stringify(item));
            patchApplier(newItem);
            res.body.should.containSubset(newItem.marc);
            
            Item.findById(id, (err, item) => {
              should.not.exist(err);
              item.toObject().marc.should.containSubset(newItem.marc);
              done();
            });
          });
        }, done);
      };
    }
    
    describe('PATCH /v0/items/:id/marc', () => {
      let testLeader = '123456789012345678901234';
      let testControl = [{
        tag: 1,
        value: '123456'
      }, {
        tag: 3,
        value: '1511'
      }];
      let testVariable = [{
        tag: 20,
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'Smith, Joe'
        }, {
          tag: 'b',
          value: "Joe Smith's Great Antarctic Wildlife Almanac"
        }]
      }, {
        tag: 163,
        ind1: '2',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: '20 cm'
        }, {
          tag: 't',
          value: '5 pages'
        }]
      }];
      
      it('can update leader of a simple record',
        testMarcPatch(testItems.simple1, {leader: testLeader},
          item => item.marc.leader = testLeader));
      // REVIEW should we change from json-merge-patch since it doesn't allow
      // changing an individual item in an array?
      it('can update all the control fields of a simple record',
        testMarcPatch(testItems.simple1,
          {fields: {control: testControl}},
          item => item.marc.fields.control = testControl));
      it('can update all the variable fields of a simple record',
        testMarcPatch(testItems.simple1,
          {fields: {variable: testVariable}},
          item => item.marc.fields.variable = testVariable));
      it('can update all the control AND variable fields of a simple record',
        testMarcPatch(testItems.simple1,
          {fields: {control: testControl, variable: testVariable}},
          item => {
            item.marc.fields.control = testControl;
            item.marc.fields.variable = testVariable;
          }));
      it('can update the leader and all the control fields of a simple record',
        testMarcPatch(testItems.simple1,
          {leader: testLeader, fields: {control: testControl}},
          item => {
            item.marc.leader = testLeader;
            item.marc.fields.control = testControl;
          }));
      it('can update ALL the fields of a simple record',
        testMarcPatch(testItems.simple1, {
          leader: testLeader,
          fields: {control: testControl, variable: testVariable}
        }, item => {
          item.marc.leader = testLeader;
          item.marc.fields.control = testControl;
          item.marc.fields.variable = testVariable;
        }));
      
      it('can update leader of a unicode record',
        testMarcPatch(testItems.unicode, {leader: testLeader},
          item => item.marc.leader = testLeader));
      it('can update all the control fields of a unicode record',
        testMarcPatch(testItems.unicode,
          {fields: {control: testControl}},
          item => item.marc.fields.control = testControl));
      it('can update all the variable fields of a unicode record',
        testMarcPatch(testItems.unicode,
          {fields: {variable: testVariable}},
          item => item.marc.fields.variable = testVariable));
      it('can update all the control AND variable fields of a unicode record',
        testMarcPatch(testItems.unicode,
          {fields: {control: testControl, variable: testVariable}},
          item => {
            item.marc.fields.control = testControl;
            item.marc.fields.variable = testVariable;
          }));
      it('can update the leader and all the control fields of a unicode record',
        testMarcPatch(testItems.unicode,
          {leader: testLeader, fields: {control: testControl}},
          item => {
            item.marc.leader = testLeader;
            item.marc.fields.control = testControl;
          }));
      it('can update ALL the fields of a unicode record',
        testMarcPatch(testItems.unicode, {
          leader: testLeader,
          fields: {control: testControl, variable: testVariable}
        }, item => {
          item.marc.leader = testLeader;
          item.marc.fields.control = testControl;
          item.marc.fields.variable = testVariable;
        }));
      
      it('can update leader of a whitespace record',
        testMarcPatch(testItems.whitespace, {leader: testLeader},
          item => item.marc.leader = testLeader));
      it('can update all the control fields of a whitespace record',
        testMarcPatch(testItems.whitespace,
          {fields: {control: testControl}},
          item => item.marc.fields.control = testControl));
      it('can update all the variable fields of a whitespace record',
        testMarcPatch(testItems.whitespace,
          {fields: {variable: testVariable}},
          item => item.marc.fields.variable = testVariable));
      it('can update all control and variable fields of a whitespace record',
        testMarcPatch(testItems.whitespace,
          {fields: {control: testControl, variable: testVariable}},
          item => {
            item.marc.fields.control = testControl;
            item.marc.fields.variable = testVariable;
          }));
      it('can update leader and all control fields of a whitespace record',
        testMarcPatch(testItems.whitespace,
          {leader: testLeader, fields: {control: testControl}},
          item => {
            item.marc.leader = testLeader;
            item.marc.fields.control = testControl;
          }));
      it('can update ALL the fields of a whitespace record',
        testMarcPatch(testItems.whitespace, {
          leader: testLeader,
          fields: {control: testControl, variable: testVariable}
        }, item => {
          item.marc.leader = testLeader;
          item.marc.fields.control = testControl;
          item.marc.fields.variable = testVariable;
        }));
      
      it('does nothing on an empty object',
        testMarcPatch(testItems.simple1, {}, () => {}));
      it('ignores a nonexistant top-level property',
        testMarcPatch(testItems.simple1, {foo: 'bar'}, () => {}));
      it('ignores a nonexistant second-level property',
        testMarcPatch(testItems.simple1, {foo: {bar: 'baz'}}, () => {}));
      it('ignores a nonexistant property under "fields"',
        testMarcPatch(testItems.simple1, {fields: {foo: 'bar'}}, () => {}));
      it('gives a 400 on invalid JSON',
        util.testStatus(marcPath, Item, 400, {}, [testItems.simple1], 'patch',
          'in?v*@li**65$%^??'));
      it('gives a 400 on strictly invalid JSON (parseable by JSON.parse)',
        util.testStatus(marcPath, Item, 400, {}, [testItems.simple1], 'patch',
          '"invalid"'));
      
      it('gives a 422 when trying to delete "leader"',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1], 'patch',
          {leader: null}));
      it('gives a 422 when trying to delete "fields"',
        util.testStatus(marcPath, Item, 422, {}, [testItems.simple1], 'patch',
          {fields: null}));
      
      it('gives a 200 when trying to set "fields.control" to empty',
        util.testStatus(marcPath, Item, 200, {}, [testItems.simple1], 'patch',
          {fields: {control: []}}));
      it('gives a 200 when trying to set "fields.variable" to empty',
        util.testStatus(marcPath, Item, 200, {}, [testItems.simple1], 'patch',
          {fields: {variable: []}}));
      
      util.testIDHandling(marcPath, 'MARC record', Item, {}, 'patch',
        testItems.simple1);
    });
  }
});