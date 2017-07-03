const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const reqt = require('./util/req-types.js');

// Helper schema to avoid repetition
let Character = {
  type: String,
  minlength: 1,
  maxlength: 1,
  required: true
};

// Control fields -- 00X
let marcControlField = {
  _id: false,
  tag: {
    type: Number,
    min: 0,
    max: 9,
    required: true
  },
  value: String
};

// Subfields
let marcSubfield = {
  _id: false,
  tag: Character,
  value: String
};

// Variable fields
let marcVariableField = {
  _id: false,
  tag: {
    type: Number,
    min: 10,
    max: 999,
    required: true
  },
  subfields: [marcSubfield],
  ind1: Character,
  ind2: Character
};

let fieldsSchema = new Schema({
  control: {
    type: [marcControlField],
    required: true
  },
  variable: {
    type: [marcVariableField],
    required: true
  }
}, {_id: false});

let marcSchema = new Schema({
  leader: {
    type: String,
    minlength: 24,
    maxlength: 24,
    required: true
  },
  fields: {
    type: fieldsSchema,
    required: true
  }
}, {_id: false});

let itemSchema = new Schema({
  marc: {
    type: marcSchema,
    required: true
  },
  barcode: reqt.Number,
  status: {
    type: String,
    enum: ['in', 'out', 'missing', 'lost'],
    required: true
  },
  title: reqt.String,
  subtitle: String,
  author: reqt.String,
  edition: String,
  publisher: reqt.String,
  pubPlace: String,
  pubYear: Number,
  isbn: Number,
  itemType: {
    type: String,
    // types as defined by character position 06 in MARC leader
    enum: [
      'language material',
      'notated music',
      'manuscript notated music',
      'cartographic material',
      'manuscript cartographic material',
      'projected medium',
      'nonmusical sound recording',
      'musical sound recording',
      'two-dimensional nonprojectable graphic',
      'computer file',
      'kit',
      'mixed materials',
      'three-dimensional artifact or naturally occuring object',
      'manuscript language material'
    ],
    required: true
  },
  checkoutID: ObjectId
});

module.exports = mongoose.model('Item', itemSchema);