process.env.NODE_ENV = 'test';

var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var server = require('../server.js');
var template = require('./template.js');

var Item = require('../models/item.js');
var testItems = require('./test-docs/item.js');

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
  })
});