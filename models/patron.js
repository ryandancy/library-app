var mongoose = require('mongoose');
var isUri = require('valid-url').isUri;
var reqt = require('./util/req-types.js');

module.exports = mongoose.model('Patron', {
  name: reqt.String,
  pic: {
    type: String,
    validate: {
      validator: isUri,
      message: '{VALUE} is not a URI.'
    },
    lowercase: true,
    required: true
  },
  checkouts: [reqt.ObjectId]
});