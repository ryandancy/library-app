var mongoose = require('mongoose');

module.exports = mongoose.model('Admin', {
  name: String,
  created: {
    type: Date,
    default: Date.now
  },
  updated: Date,
  item: {
    read: Boolean,
    write: Boolean
  },
  patron: {
    read: Boolean,
    write: Boolean
  },
  checkout: {
    read: Boolean,
    write: Boolean
  },
  signIn: Boolean,
  signOut: Boolean
});