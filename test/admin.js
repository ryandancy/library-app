process.env.NODE_ENV = 'test';

var mongoose = require('mongoose');
var server = require('../server.js');
var Admin = require('../models/admin.js');
var template = require('./template.js');

template({
  path: '/v0/admins',
  model: Admin,
  name: {
    singular: 'admin',
    plural: 'admins'
  },
  testDocs: {
    simple1: {
      name: 'Testy McTestface',
      item: {
        read: true,
        write: false,
      },
      checkout: {
        read: false,
        write: false
      },
      patron: {
        read: false,
        write: true
      },
      signIn: true,
      signOut: true
    },
    simple2: {
      name: 'Another Name',
      item: {
        read: false,
        write: false,
      },
      checkout: {
        read: false,
        write: true
      },
      patron: {
        read: true,
        write: false
      },
      signIn: false,
      signOut: false
    },
    unicode: {
      name: 'Úñí¢öðè ïß ©öół 😃😃😃',
      item: {
        read: true,
        write: false,
      },
      checkout: {
        read: false,
        write: false
      },
      patron: {
        read: false,
        write: true
      },
      signIn: true,
      signOut: true
    },
    whitespace: {
      name: '             \t\t    \n\t       ',
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
    },
  },
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