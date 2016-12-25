var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var reqt = require('./util/req-types.js');

var adminSchema = new Schema({
  name: reqt.String,
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
}, {strict: 'throw'});

module.exports = mongoose.model('Admin', adminSchema);