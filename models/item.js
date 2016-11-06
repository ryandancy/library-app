var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = mongoose.Types.ObjectId;

// Helper schema to avoid repetition
var Character = new Schema({
  type: String,
  minlength: 1,
  maxlength: 1
});

// Control fields -- 00X
var marcControlField = new Schema({
  tag: {
    type: Number,
    min: 0,
    max: 9,
    required: true
  },
  value: {type: String, required: true},
  required: true
});

// Subfields
var marcSubfield = new Schema({
  tag: {type: Character, required: true},
  value: {type: String, required: true},
  required: true
});

// Variable fields
var marcVariableField = new Schema({
  tag: {
    type: Number,
    min: 10,
    max: 999,
    required: true
  },
  subfields: [marcSubfield],
  ind1: {type: Character, required: true},
  ind2: {type: Character, required: true},
  required: true
});

module.exports = mongoose.model('Item', {
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
  created: {
    type: Date,
    default: Date.now,
    required: true
  },
  updated: {type: Date, required: true},
  barcode: {type: Number, required: true},
  status: {
    type: String,
    enum: ["in", "out", "missing", "lost"],
    required: true
  },
  checkout: {type: ObjectId, required: true}
});