var mongoose = require('mongoose');

// Helper schema to avoid repetition
var Character = new mongoose.Schema({
  type: String,
  minlength: 1,
  maxlength: 1
});

// Control fields -- 00X
var marcControlField = new mongoose.Schema({
  tag: {
    type: Number,
    min: 0,
    max: 9
  },
  value: String
});

// Subfields
var marcSubfield = new mongoose.Schema({
  tag: Character,
  value: String
});

// Variable fields
var marcVariableField = new mongoose.Schema({
  tag: {
    type: Number,
    min: 10,
    max: 999
  },
  subfields: [marcSubfield],
  ind1: Character,
  ind2: Character
});

module.exports = mongoose.model('Item', {
  marc: {
    leader: {
      type: String,
      minlength: 24,
      maxlength: 24
    },
    fields: {
      control: [marcControlField],
      variable: [marcVariableField]
    }
  },
  created: Date,
  updated: Date,
  barcode: Number,
  status: {
    type: String,
    enum: ["in", "out", "missing", "lost"]
  },
  checkout: mongoose.Types.ObjectId
});