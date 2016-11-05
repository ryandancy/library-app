var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var isUri = require('valid-url').isUri;

module.exports = mongoose.model('Patron', {
  name: String,
  created: {
    type: Date,
    default: Date.now
  },
  updated: Date,
  pic: {
    type: String,
    validate: {
      validator: isUri,
      message: '{VALUE} is not a URI.'
    },
    lowercase: true
  },
  checkouts: [ObjectId]
});