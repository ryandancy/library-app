var mongoose = require('mongoose');
var reqt = require('./util/req-types.js');

module.exports = mongoose.model('Admin', {
  name: reqt.String,
  created: {
    type: reqt.Date,
    default: Date.now
  },
  updated: {
    type: reqt.Date,
    default: Date.now
  },
  item: {
    read: reqt.Boolean,
    write: reqt.Boolean
  },
  patron: {
    read: reqt.Boolean,
    write: reqt.Boolean
  },
  checkout: {
    read: reqt.Boolean,
    write: reqt.Boolean
  },
  signIn: reqt.Boolean,
  signOut: reqt.Boolean
});