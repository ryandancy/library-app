process.env.NODE_ENV = 'test';

var mongoose = require('mongoose');
var util = require('./util.js');
var server = require('../server.js');
var Admin = require('../models/admin.js');

var chai = require('chai');
var chaiHttp = require('chai-http');
var chaiSubset = require('chai-subset');

var should = chai.should();
chai.use(chaiHttp);
chai.use(chaiSubset);

var testAdmins = {
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
};

function* generateAdmins(num) {
  for (var i = 0; i < num; i++) {
    yield {
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
    };
  }
}

function testIDHandling(path, method, send = undefined) {
  it('404s when trying to get a nonexistant admin with an empty database',
    util.testStatus(path + '/123456789012345678901234', 404, [], method, send));
  it('404s when trying to get a nonexistant admin with a non-empty database',
    util.testStatus(path + '/123456789012345678901234', 404, generateAdmins(10),
      method, send));
  it('404s on a nonexistant hex ID',
    util.testStatus(path + '/DeadBeefFeedCabFad123456', 404, [], method, send));
  it('gives a 400 on an invalid ID',
    util.testStatus(path + '/invalid-id-because-chars', 400, [], method, send));
  it('gives a 400 on a too-short ID',
    util.testStatus(path + '/123', 400, [], method, send));
  it('gives a 400 on a negative ID',
    util.testStatus(path + '/-123456789012345678901234', 400, [],
      method, send));
}

describe('Admins', () => {
  beforeEach(done => {
    Admin.remove({}, err => done());
  });
  
  var path = '/v0/admins';
  var idPath = path + '/:id';
  var allTestAdmins = Object.values(testAdmins);
  
  describe('GET /v0/admins', () => {
    it('should initially get an empty array', util.testGet(path, []));
    it('can retrieve a single admin', util.testGet(path, testAdmins.simple1));
    it('can retrieve multiple admins',
      util.testGet(path, [testAdmins.simple1, testAdmins.simple2]));
    it('accepts unicode in admin names',
      util.testGet(path, testAdmins.unicode));
    it('accepts whitespace in admin names',
      util.testGet(path, testAdmins.whitespace));
    it('can retrieve all of them at once', util.testGet(path, allTestAdmins));
    
    var createdAscSort = (admin, admin2) =>
      new Date(admin.created).should.be.at.most(new Date(admin2.created));
    var createdDescSort = (admin, admin2) =>
      new Date(admin.created).should.be.at.least(new Date(admin2.created));
    it('defaults to sorting ascending by created date',
      util.testSortableGet(path, allTestAdmins, createdAscSort));
    it('can sort descending by created date',
      util.testSortableGet(path + '?direction=desc', allTestAdmins,
        createdDescSort));
    it('can explicitly sort ascending, defaulting to created date',
      util.testSortableGet(path + '?direction=asc', allTestAdmins,
        createdAscSort));
    it('can explicitly sort by created date, defaulting to ascending',
      util.testSortableGet(path + '?sort_by=created', allTestAdmins,
        createdAscSort));
    it('can explicitly sort ascending by created date',
      util.testSortableGet(path + '?sort_by=created&direction=asc',
        allTestAdmins, createdAscSort));
    it('can explicitly sort descending by created date',
      util.testSortableGet(path + '?sort_by=created&direction=desc',
        allTestAdmins, createdDescSort));
    
    var nameAscSort = (admin, admin2) =>
      admin.name.should.be.at.most(admin2.name);
    var nameDescSort = (admin, admin2) =>
      admin.name.should.be.at.least(admin2.name);
    it('can sort ascending by name lexicographically',
      util.testSortableGet(path + '?sort_by=name', allTestAdmins, nameAscSort));
    it('can sort explicitly ascending by name lexicographically',
      util.testSortableGet(path + '?sort_by=name&direction=asc', allTestAdmins,
        nameAscSort));
    it('can sort descending by name lexicographically',
      util.testSortableGet(path + '?sort_by=name&direction=desc', allTestAdmins,
        nameDescSort));
    
    var idAscSort = (admin, admin2) => admin.id.should.be.below(admin2.id);
    var idDescSort = (admin, admin2) => admin.id.should.be.above(admin2.id);
    it('can sort ascending by ID',
      util.testSortableGet(path + '?sort_by=id', allTestAdmins, idAscSort));
    it('can sort explicitly ascending by ID',
      util.testSortableGet(path + '?sort_by=id&direction=asc', allTestAdmins,
        idAscSort));
    it('can sort descending by ID',
      util.testSortableGet(path + '?sort_by=id&direction=desc', allTestAdmins,
        idDescSort));
    
    it('gives a 422 on an invalid sort_by value',
      util.testStatus(path + '?sort_by=INVALID', 422));
    it('gives a 422 on an empty sort_by value',
      util.testStatus(path + '?sort_by=', 422));
    it('gives a 422 on an invalid direction value',
      util.testStatus(path + '?direction=INVALID', 422));
    it('gives a 422 on an empty direction value',
      util.testStatus(path + '?direction=', 422));
    it('gives a 422 on invalid both sort_by and direction',
      util.testStatus(path + '?sort_by=foo&direction=bar', 422));
    it('gives a 422 on empty both sort_by and direction',
      util.testStatus(path + '?sort_by=&direction=', 422));
    
    it('has correct paging on no admins, no query string',
      util.testPaging(path, [], {
        status: 200,
        hasMore: false,
        maxItems: 0,
        remainingItems: 0,
        range: false
      })
    );
    it('has correct paging on one admin, no query string',
      util.testPaging(path, generateAdmins(1), {
        status: 200,
        hasMore: false,
        maxItems: 1,
        remainingItems: 0,
        range: false
      })
    );
    it('has correct paging on two admins, no query string',
      util.testPaging(path, generateAdmins(2), {
        status: 200,
        hasMore: false,
        maxItems: 2,
        remainingItems: 0,
        range: false
      })
    );
    it('has correct paging on 31 admins, no query string',
      util.testPaging(path, generateAdmins(31), {
        status: 206,
        hasMore: true,
        maxItems: 31,
        remainingItems: 1,
        range: '0-29/31'
      })
    );
    it('has correct paging on 30 admins, no query string',
      util.testPaging(path, generateAdmins(30), {
        status: 200,
        hasMore: false,
        maxItems: 30,
        remainingItems: 0,
        range: false
      })
    );
    it('handles explicit page=0, implicit per_page=30, 30 admins',
      util.testPaging(path + '?page=0', generateAdmins(30), {
        status: 200,
        hasMore: false,
        maxItems: 30,
        remainingItems: 0,
        range: false
      })
    );
    it('handles implicit page=0, explicit per_page=30, 30 admins',
      util.testPaging(path + '?per_page=30', generateAdmins(30), {
        status: 200,
        hasMore: false,
        maxItems: 30,
        remainingItems: 0,
        range: false
      })
    );
    it('handles explicit page=0, explicit per_page=30, 30 admins',
      util.testPaging(path + '?page=0&per_page=30', generateAdmins(30), {
        status: 200,
        hasMore: false,
        maxItems: 30,
        remainingItems: 0,
        range: false
      })
    );
    it('handles implicit page=0, explicit per_page=10, 15 admins',
      util.testPaging(path + '?per_page=10', generateAdmins(15), {
        status: 206,
        hasMore: true,
        maxItems: 15,
        remainingItems: 5,
        range: '0-9/15'
      })
    );
    it('handles implicit page=0, explicit per_page=20, 15 admins',
      util.testPaging(path + '?per_page=20', generateAdmins(15), {
        status: 200,
        hasMore: false,
        maxItems: 15,
        remainingItems: 0,
        range: false
      })
    );
    it('handles explicit page=0, explicit per_page=10, 15 admins',
      util.testPaging(path + '?page=0&per_page=10', generateAdmins(15), {
        status: 206,
        hasMore: true,
        maxItems: 15,
        remainingItems: 5,
        range: '0-9/15'
      })
    );
    it('handles explicit page=1, implicit per_page=30, 40 admins',
      util.testPaging(path + '?page=1', generateAdmins(40), {
        status: 206,
        hasMore: false,
        maxItems: 40,
        remainingItems: 0,
        range: '30-39/40'
      })
    );
    it('handles explicit page=1, explicit per_page=10, 15 admins',
      util.testPaging(path + '?page=1&per_page=10', generateAdmins(15), {
        status: 206,
        hasMore: false,
        maxItems: 15,
        remainingItems: 0,
        range: '10-14/15'
      })
    );
    it('handles explicit page=1, implicit per_page=30, 60 admins',
      util.testPaging(path + '?page=1', generateAdmins(60), {
        status: 206,
        hasMore: false,
        maxItems: 60,
        remainingItems: 0,
        range: '30-59/60'
      })
    );
    it('handles explicit page=1, explicit per_page=2, 4 admins',
      util.testPaging(path + '?page=1&per_page=2', generateAdmins(4), {
        status: 206,
        hasMore: false,
        maxItems: 4,
        remainingItems: 0,
        range: '2-3/4'
      })
    );
    it('handles explicit page=2, implicit per_page=30, 100 admins',
      util.testPaging(path + '?page=2', generateAdmins(100), {
        status: 206,
        hasMore: true,
        maxItems: 100,
        remainingItems: 10,
        range: '60-89/100'
      })
    );
    it('handles explicit page=8, explicit per_page=4, 50 admins',
      util.testPaging(path + '?page=8&per_page=4', generateAdmins(50), {
        status: 206,
        hasMore: true,
        maxItems: 50,
        remainingItems: 14,
        range: '32-35/50'
      })
    );
    it('handle explicit page=23, explicit per_page=1, 33 admins',
      util.testPaging(path + '?page=23&per_page=1', generateAdmins(33), {
        status: 206,
        hasMore: true,
        maxItems: 33,
        remainingItems: 9,
        range: '23-23/33'
      })
    );
    it('gives a 422 on page=-1', util.testStatus(path + '?page=-1', 422));
    it('gives a 422 on per_page=-1',
      util.testStatus(path + '?per_page=-1', 422));
    it('gives a 422 on per_page=0', util.testStatus(path + '?per_page=0', 422));
    it('gives a 422 on per_page=201',
      util.testStatus(path + '?per_page=201', 422));
    it('gives a 404 on explicit page=1, implicit per_page=30, 20 admins',
      util.testStatus(path + '?page=1', 404, generateAdmins(20)));
    it('gives a 404 on explicit page=1, explicit per_page=10, 5 admins',
      util.testStatus(path + '?page=1&per_page=10', 404, generateAdmins(5)));
  });
  describe('POST /v0/admins', () => {
    it('creates a valid admin', util.testPost(path, testAdmins.simple1, Admin));
    it('creates a valid admin with a unicode name',
      util.testPost(path, testAdmins.unicode, Admin));
    it('creates a valid admin with a whitespace name',
      util.testPost(path, testAdmins.whitespace, Admin));
    it("creates a valid admin when there's already an admin in the system",
      util.testPost(path, testAdmins.simple2, Admin, testAdmins.simple1));
    it("creates a valid admin when there's already one with the same name",
      util.testPost(path, testAdmins.simple1, Admin, {
        name: testAdmins.simple1.name,
        item: testAdmins.simple2.item,
        checkout: testAdmins.simple2.checkout,
        patron: testAdmins.simple2.patron,
        signIn: true,
        signOut: true
      }));
    it("creates a valid admin when there's already an identical one",
      util.testPost(path, testAdmins.simple1, Admin, testAdmins.simple1));
    it('creates a valid admin when there are already 100 admins in the system',
      util.testPost(path, testAdmins.simple1, Admin, generateAdmins(100)));
    
    it('gives a 400 on syntatically invalid input',
      util.testStatus(path, 400, [], 'post', "I'm invalid"));
    it('gives a 400 on psuedo-valid input',
      util.testStatus(path, 400, [], 'post', '"Hi!"'));
    it('gives a 422 on an empty object as input',
      util.testStatus(path, 422, [], 'post', {}));
    it('treats empty input the same as an empty object (422)',
      util.testStatus(path, 422, [], 'post', ''));
    it('gives a 422 on an array of valid admins as input',
      util.testStatus(path, 422, [], 'post', Array.from(generateAdmins(5))));
    
    for (var admin of util.generateObjectsMissingOneProperty(
        testAdmins.simple1)) {
      it(`gives a 422 when missing "${admin.prop}"`,
        util.testStatus(path, 422, [], 'post', admin.obj));
    }
  });
  describe('DELETE /v0/admins', () => {
    it('does nothing with no admins in the database',
      util.testCollectionDelete(path, Admin, []));
    it('deletes 1 admin in the database',
      util.testCollectionDelete(path, Admin, testAdmins.simple1));
    it('deletes a bunch of edge cases in the database',
      util.testCollectionDelete(path, Admin, Object.values(testAdmins)));
    it('deletes 100 admins in the database',
      util.testCollectionDelete(path, Admin, generateAdmins(100)));
  });
  
  describe('GET /v0/admins/:id', () => {
    it('gets a simple admin as the only admin in the database',
      util.testResourceGet(path, testAdmins.simple1));
    it('gets a unicode admin as the only admin in the database',
      util.testResourceGet(path, testAdmins.unicode));
    it('gets a whitespace admin as the only admin in the database',
      util.testResourceGet(path, testAdmins.whitespace));
    it('gets a simple admin with 4 edge-case admins in the database',
      util.testResourceGet(path, testAdmins.simple2,
        Object.values(testAdmins)));
    it('gets a unicode admin with 4 edge-case admins in the database',
      util.testResourceGet(path, testAdmins.unicode,
        Object.values(testAdmins)));
    it('gets a whitespace admin with 4 edge-case admins in the database',
      util.testResourceGet(path, testAdmins.whitespace,
        Object.values(testAdmins)));
    it('gets a simple admin with 100 admins in the database',
      util.testResourceGet(path, testAdmins.simple1, generateAdmins(100)));
    it('gets a unicode admin with 100 admins in the database',
      util.testResourceGet(path, testAdmins.unicode, generateAdmins(100)));
    it('gets a whitespace admin with 100 admins in the database',
      util.testResourceGet(path, testAdmins.whitespace, generateAdmins(100)));
    
    testIDHandling(path, 'get');
  });
  describe('PUT /v0/admins/:id', () => {
    it('replaces a simple admin with another simple admin, empty DB',
      util.testPut(path, Admin, testAdmins.simple1, testAdmins.simple2));
    it('replaces a simple admin with a unicode admin, empty DB',
      util.testPut(path, Admin, testAdmins.simple1, testAdmins.unicode));
    it('replaces a simple admin with a whitespace admin, empty DB',
      util.testPut(path, Admin, testAdmins.simple1, testAdmins.whitespace));
    it('replaces a unicode admin with a simple admin, empty DB',
      util.testPut(path, Admin, testAdmins.unicode, testAdmins.simple1));
    it('replaces a unicode admin with a whitespace admin, empty DB',
      util.testPut(path, Admin, testAdmins.unicode, testAdmins.whitespace));
    it('replaces a whitespace admin with a simple admin, empty DB',
      util.testPut(path, Admin, testAdmins.whitespace, testAdmins.simple1));
    it('replaces a whitespace admin with a unicode admin, empty DB',
      util.testPut(path, Admin, testAdmins.whitespace, testAdmins.unicode));
      
    it('replaces a simple admin with another simple admin, 1 other in DB',
      util.testPut(path, Admin, testAdmins.simple1, testAdmins.simple2,
        generateAdmins(1)));
    it('replaces a simple admin with another simple admin, 100 others in DB',
      util.testPut(path, Admin, testAdmins.simple1, testAdmins.simple2,
        generateAdmins(100)));
    it('replaces a unicode admin with a whitespace admin, 100 others in DB',
      util.testPut(path, Admin, testAdmins.unicode, testAdmins.whitespace,
        generateAdmins(100)));
    
    it('gives a 400 on invalid JSON',
      util.testStatus(idPath, 400, [testAdmins.simple1], 'put', 'invalid'));
    it('gives a 400 on strictly invalid JSON (parsable by JSON.parse)',
      util.testStatus(idPath, 400, [testAdmins.simple1], 'put', '"Hi!"'));
    
    for (var unmod of ['created', 'updated', 'id']) {
      var admin = JSON.parse(JSON.stringify(testAdmins.simple1));
      admin[unmod] = unmod === 'id' ? '123456789012345678901234'
        : '2016-10-24T17:00:42-03:00';
      it(`gives a 422 when including "${unmod}"`,
        util.testStatus(idPath, 422, [testAdmins.simple1], 'put', admin));
    }
    
    for (var admin of util.generateObjectsMissingOneProperty(
          testAdmins.simple1)) {
      it(`gives a 422 when missing "${admin.prop}"`,
        util.testStatus(idPath, 422, [testAdmins.simple1], 'put', admin.obj));
    }
    
    testIDHandling(path, 'put', testAdmins.simple1);
  });
  describe('PATCH /v0/admins/:id', () => {
    it('can patch a simple admin changing name',
      util.testPatch(path, Admin, testAdmins.simple1, {name: 'Testy 2'},
        admin => admin.name = 'Testy 2'));
    it('can patch a simple admin changing a nested property',
      util.testPatch(path, Admin, testAdmins.simple1, {patron: {read: true}},
        admin => admin.patron.read = true));
    it('can patch a simple admin changing multiple top-level properties',
      util.testPatch(path, Admin, testAdmins.simple1,
        {name: 'Foo', signIn: false, signOut: false},
        admin => {
          admin.name = 'Foo';
          admin.signIn = false;
          admin.signOut = false;
        }));
    it('can patch a simple admin changing an entire top-level object property',
      util.testPatch(path, Admin, testAdmins.simple1,
        {patron: {read: true, write: false}},
        admin => {
          admin.patron.read = true;
          admin.patron.write = false;
        }));
    it('can patch a simple admin changing top-level and deeper properties',
      util.testPatch(path, Admin, testAdmins.simple1,
        {signIn: false, checkout: {read: true, write: true}},
        admin => {
          admin.signIn = false;
          admin.checkout.read = true;
          admin.checkout.write = true;
        }));
    it('can patch a simple admin changing name to unicode',
      util.testPatch(path, Admin, testAdmins.simple1, {name: 'Úñí¢öðè ïß ©öół'},
        admin => admin.name = 'Úñí¢öðè ïß ©öół'));
    it('can patch a simple admin changing name to whitespace',
      util.testPatch(path, Admin, testAdmins.simple1, {name: '   \t\n\t  '},
        admin => admin.name = '   \t\n\t  '));
    it('can patch a unicode admin changing name to normal',
      util.testPatch(path, Admin, testAdmins.unicode, {name: 'Tester McTest'},
        admin => admin.name = 'Tester McTest'));
    it('can patch a whitespace admin changing name to normal',
      util.testPatch(path, Admin, testAdmins.whitespace, {name: 'Testy McTest'},
        admin => admin.name = 'Testy McTest'));
    it('does nothing with an empty object',
      util.testPatch(path, Admin, testAdmins.simple1, {}, admin => {}));
    it('ignores nonexistant properties in the patch',
      util.testPatch(path, Admin, testAdmins.simple1, {nonexistant: 3},
        admin => {}));
    it('ignores nonexistant nested properties in the patch',
      util.testPatch(path, Admin, testAdmins.simple1,
        {non: {existant: "I don't exist!"}}, admin => {}));
    it('ignores nonexistant nested properties where the parent property exists',
      util.testPatch(path, Admin, testAdmins.simple1, {patron: {foo: 'bar'}},
        admin => {}));
    it('ignores nonexistant properties when combined with existing properties',
      util.testPatch(path, Admin, testAdmins.simple1, {name: 'Foo', ne: 901},
        admin => admin.name = 'Foo'));
    
    it('gives a 400 on invalid JSON',
      util.testStatus(idPath, 400, [testAdmins.simple1], 'patch', ":'invalid"));
    it('gives a 400 on strictly invalid JSON (parseable by JSON.parse)',
      util.testStatus(idPath, 400, [testAdmins.simple1], 'patch', '"invalid"'));
    
    for (var patch of util.generateSinglePropertyPatches(testAdmins.simple1)) {
      it(`gives a 422 when trying to delete "${patch.prop}"`,
        util.testStatus(idPath, 422, [testAdmins.simple1], 'patch', patch.obj));
    }
    
    testIDHandling(path, 'patch');
  });
  describe('DELETE /v0/admins/:id', () => {
    it('can delete a simple admin with an empty database',
      util.testDelete(path, Admin, testAdmins.simple1));
    it('can delete a unicode admin with an empty database',
      util.testDelete(path, Admin, testAdmins.unicode));
    it('can delete a whitespace admin with an empty database',
      util.testDelete(path, Admin, testAdmins.whitespace));
    
    it('can delete a simple admin with another simple admin in the database',
      util.testDelete(path, Admin, testAdmins.simple1, [testAdmins.simple2]));
    it('can delete a unicode admin with a simple admin in the database',
      util.testDelete(path, Admin, testAdmins.unicode, [testAdmins.simple2]));
    it('can delete a whitespace admin with a simple admin in the database',
      util.testDelete(path, Admin, testAdmins.whitespace,
        [testAdmins.simple2]));
      
    it('can delete a simple admin with 100 admins in the database',
      util.testDelete(path, Admin, testAdmins.simple1, generateAdmins(100)));
    it('can delete a unicode admin with 100 admins in the database',
      util.testDelete(path, Admin, testAdmins.unicode, generateAdmins(100)));
    it('can delete a whitespace admin with 100 admins in the database',
      util.testDelete(path, Admin, testAdmins.whitespace, generateAdmins(100)));
    
    testIDHandling(path, 'delete');
  });
});