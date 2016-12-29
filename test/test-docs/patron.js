module.exports = {
  simple1: {
    name: 'Test Patron',
    pic: 'http://example.com/my-very-nice-picture.jpg',
    checkouts: []
  },
  simple2: {
    name: "I'm a patron who's a test",
    pic: 'https://example.org/another-picture.jpg',
    checkouts: [/* 1 checkout ID here, filled by beforeEach hook */]
  },
  unicode: {
    name: 'Úñí¢öðè ïß ©öół 😃😃😃 (Patron Edition)',
    pic: 'http://abc123.com/foo.png',
    checkouts: [/* 2 checkout IDs here, filled by beforeEach hook */]
  },
  whitespace: {
    name: '    \t\t  \n\t\f\r\n   ',
    pic: 'http://totally-legit-pix.com/look-ma-im-a-ghost.jpg',
    checkouts: [/* 1 checkout ID here, filled by beforeEach hook */]
  }
};