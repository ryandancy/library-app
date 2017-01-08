module.exports = {
  simple1: {
    name: 'Testy McTestface',
    item: {
      read: true,
      write: false
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
      write: false
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
      write: false
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
      write: true
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
  }
};