var mongoose = require('mongoose');

module.exports = mongoose.model('Admin', {
  name: {type: String, required: true},
  created: {
    type: Date,
    default: Date.now,
    required: true
  },
  updated: {type: Date, required: true},
  item: {
    read: {type: Boolean, required: true},
    write: {type: Boolean, required: true}
  },
  patron: {
    read: {type: Boolean, required: true},
    write: {type: Boolean, required: true}
  },
  checkout: {
    read: {type: Boolean, required: true},
    write: {type: Boolean, required: true}
  },
  signIn: {type: Boolean, required: true},
  signOut: {type: Boolean, required: true}
});