var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;
var reqt = require('./util/req-types.js');

// Helper schema to avoid repetition
var Character = {
  type: String,
  minlength: 1,
  maxlength: 1,
  required: true
};

// Control fields -- 00X
var marcControlField = {
  tag: {
    type: String,
    min: 0,
    max: 9,
    required: true
  },
  value: String
};

// Subfields
var marcSubfield = {
  tag: Character,
  value: String
};

// Variable fields
var marcVariableField = {
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

var itemSchema = new Schema({
  marc: {
    leader: {
      type: String,
      minlength: 24,
      maxlength: 24,
      required: true
    },
    fields: {
      control: [marcControlField],
      variable: [marcVariableField]
    }
  },
  barcode: reqt.Number,
  status: {
    type: String,
    enum: ["in", "out", "missing", "lost"],
    required: true
  },
  checkoutID: ObjectId
}, {strict: 'throw'});

module.exports = mongoose.model('Item', itemSchema);