const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const isUri = require('valid-url').isUri;
const reqt = require('./util/req-types.js');

let patronSchema = new Schema({
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

module.exports = mongoose.model('Patron', patronSchema);