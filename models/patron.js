var mongoose = require('mongoose');
var isUri = require('valid-url').isUri;

module.exports = mongoose.model('Patron', {
  name: String,
  created: Date,
  updated: Date,
  pic: {
    type: String,
    validate: {
      validator: isUri,
      message: '{VALUE} is not a URI.'
    },
    lowercase: true
  },
  checkouts: [mongoose.Types.ObjectId]
});