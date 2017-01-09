const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const reqt = require('./util/req-types.js');

let adminSchema = new Schema({
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
});

module.exports = mongoose.model('Admin', adminSchema);