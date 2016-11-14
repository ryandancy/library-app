var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = mongoose.Types.ObjectId;
var reqt = require('./util/req-types.js');

// Helper schema to avoid repetition
var Character = new Schema({
  type: reqt.String,
  minlength: 1,
  maxlength: 1,
  required: true
});

// Control fields -- 00X
var marcControlField = new Schema({
  tag: {
    type: reqt.Number,
    min: 0,
    max: 9
  },
  value: reqt.String,
  required: true
});

// Subfields
var marcSubfield = new Schema({
  tag: Character,
  value: reqt.String,
  required: true
});

// Variable fields
var marcVariableField = new Schema({
  tag: {
    type: reqt.Number,
    min: 10,
    max: 999
  },
  subfields: [marcSubfield],
  ind1: Character,
  ind2: Character,
  required: true
});

module.exports = mongoose.model('Item', {
  marc: {
    leader: {
      type: reqt.String,
      minlength: 24,
      maxlength: 24
    },
    fields: {
      control: [marcControlField],
      variable: [marcVariableField]
    }
  },
  barcode: reqt.Number,
  status: {
    type: reqt.String,
    enum: ["in", "out", "missing", "lost"]
  },
  checkout: reqt.ObjectId
});