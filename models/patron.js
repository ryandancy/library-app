var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var Schema = mongoose.Schema;
var isUri = require('valid-url').isUri;

var reqObjectId = new Schema({type: ObjectId, required: true});

module.exports = mongoose.model('Patron', {
  name: {type: String, required: true},
  created: {
    type: Date,
    default: Date.now,
    required: true
  },
  updated: {type: Date, required: true},
  pic: {
    type: String,
    validate: {
      validator: isUri,
      message: '{VALUE} is not a URI.'
    },
    lowercase: true,
    required: true
  },
  checkouts: [reqObjectId]
});