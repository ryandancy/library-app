process.env.NODE_ENV = 'test';

var mongoose = require('mongoose');
var server = require('../server.js');
var Admin = require('../models/admin.js');
var template = require('./template.js');

var testAdmins = require('./test-docs/admin.js');

template({
  path: '/v0/admins',
  model: Admin,
  name: {
    singular: 'admin',
    plural: 'admins'
  },
  testDocs: testAdmins,
  generator: num => ({
    name: 'GeneratedTestAdmin-' + num,
    item: {
      read: true,
      write: true,
    },
    checkout: {
      read: true,
      write: true
    },
    patron: {
      read: true,
      write: true
    },
    signIn: true,
    signOut: true
  })
});