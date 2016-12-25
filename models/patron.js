var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var isUri = require('valid-url').isUri;
var reqt = require('./util/req-types.js');

var patronSchema = new Schema({
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
}, {strict: 'throw'});

module.exports = mongoose.model('Patron', patronSchema);