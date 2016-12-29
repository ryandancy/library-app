// A template for (almost) fully testing a collection endpoint and its
// corresponding resource endpoint

process.env.NODE_ENV = 'test';

var mongoose = require('mongoose');
var util = require('./util.js');
var server = require('../server.js');

var chai = require('chai');
var chaiHttp = require('chai-http');
var chaiSubset = require('chai-subset');

var should = chai.should();
chai.use(chaiHttp);
chai.use(chaiSubset);

/*
  Options is the single parameter object. It's an object containing all of the
  parameters that would otherwise be quite unreadable.
  
  Here's a list of the properties (required ones have a *):
  - *path: the collection endpoint.
  - idPath: the resource endpoint, with ':id' where the ID would go. Defaults to
    `path + '/:id'`.
  - *model: the Mongoose model of the resource.
  - *name: an object containing names.
    - *singular: the singular name of the resource; e.g. "admin".
    - plural: the plural name of the resource; e.g. "admins". Defaults to the
      last string before a slash in the path; e.g. with the path '/api/foo/bar',
      the plural would be 'bar'.
  - *testDocs: an object containing test documents.
    - *simple1: a simple document, with no unicode or excessive whitespace.
    - *simple2: another simple document.
    - unicode: a document where all strings are unicoded up. Not present if
      there are no strings in the document.
    - whitespace: a document where all strings are fully whitespace. Not present
      if there are no strings in the document.
  - *generator: a function that takes a single parameter `num` and returns a
    single document, where whenever the function is called with the same
    argument it returns the same document. Used for generating documents.
  - beforeEach: a function called as a mocha beforeEach hook. Defaults to not
    being added as a hook. Use this to add dependencies of the resources you're
    testing. Takes two arguments: `done`, a function the hook must call when
    it's done, and `testDocs`, the test documents for the test.
  - populateDBHooks: an object consisting of hooks for utils.populateDB().
    - pre: a function executed before the database is populated. It's passed the
      documents and a callback, done, to be executed when it's done.
    - post: a function executed after the database is populated. It's passed the
      original documents, the documents as returned from the database, and a
      callback, done, to be executed when it's done.
*/
module.exports = options => {
  if (
    !options.hasOwnProperty('path')
    || !options.hasOwnProperty('model')
    || !options.hasOwnProperty('name')
    || !options.name.hasOwnProperty('singular')
    || !options.hasOwnProperty('testDocs')
    || !options.testDocs.hasOwnProperty('simple1')
    || !options.testDocs.hasOwnProperty('simple2')
    || !options.hasOwnProperty('generator')
  ) {
    throw new Error('options parameter is missing some required properties');
  }
  
  var path = options.path;
  var idPath = options.idPath || path + '/:id';
  var model = options.model;
  var singular = options.name.singular;
  var plural = options.name.plural || path.slice(path.lastIndexOf('/') + 1);
  var testDocs = options.testDocs;
  var allTestDocs = Object.values(testDocs);
  var generator = options.generator;
  var customBeforeEach = options.beforeEach || false;
  var hooks = options.populateDBHooks || {};
  
  function* generateDocs(num) {
    for (var i = 0; i < num; i++) {
      yield generator(num);
    }
  }
  
  function testIDHandling(method, send = undefined) {
    it(`404s when trying to get a nonexistant ${singular} with an empty DB`,
      util.testStatus(path + '/123456789012345678901234', model, 404, hooks, [],
        method, send));
    it(`404s when trying to get a nonexistant ${singular} with a non-empty DB`,
      util.testStatus(path + '/123456789012345678901234', model, 404, hooks,
        generateDocs(10), method, send));
    it('404s on a nonexistant hex ID',
      util.testStatus(path + '/DeadBeefFeedCabFad123456', model, 404, hooks, [],
        method, send));
    it('gives a 400 on an invalid ID',
      util.testStatus(path + '/invalid-id-because-chars', model, 400, hooks, [],
        method, send));
    it('gives a 400 on a too-short ID',
      util.testStatus(path + '/123', model, 400, hooks, [], method, send));
    it('gives a 400 on a negative ID',
      util.testStatus(path + '/-123456789012345678901234', model, 400, hooks,
        [], method, send));
  }
  
  describe(plural, () => {
    beforeEach(done => {
      model.remove({}, err => done());
    });
    if (customBeforeEach) {
      beforeEach(done => customBeforeEach(done, testDocs));
    }
    
    describe(`GET ${path}`, () => {
      it('should initially get an empty array',
        util.testGet(path, model, [], hooks));
      it(`can retrieve a single ${singular}`,
        util.testGet(path, model, testDocs.simple1, hooks));
      it(`can retrieve multiple ${plural}`,
        util.testGet(path, model, [testDocs.simple1, testDocs.simple2], hooks));
      if (testDocs.unicode) {
        it(`accepts unicode in ${singular} strings`,
          util.testGet(path, model, testDocs.unicode, hooks));
      }
      if (testDocs.whitespace) {
        it(`accepts whitespace in ${singular} strings`,
          util.testGet(path, model, testDocs.whitespace, hooks));
      }
      it('can retrieve all of them at once',
        util.testGet(path, model, allTestDocs, hooks));
      
      var createdAscSort = (doc, doc2) =>
        new Date(doc.created).should.be.at.most(new Date(doc2.created));
      var createdDescSort = (doc, doc2) =>
        new Date(doc.created).should.be.at.least(new Date(doc2.created));
      it('defaults to sorting ascending by created date',
        util.testSortableGet(path, model, allTestDocs, createdAscSort, hooks));
      it('can sort descending by created date',
        util.testSortableGet(path + '?direction=desc', model, allTestDocs,
          createdDescSort, hooks));
      it('can explicitly sort ascending, defaulting to created date',
        util.testSortableGet(path + '?direction=asc', model, allTestDocs,
          createdAscSort, hooks));
      it('can explicitly sort by created date, defaulting to ascending',
        util.testSortableGet(path + '?sort_by=created', model, allTestDocs,
          createdAscSort, hooks));
      it('can explicitly sort ascending by created date',
        util.testSortableGet(path + '?sort_by=created&direction=asc', model,
          allTestDocs, createdAscSort, hooks));
      it('can explicitly sort descending by created date',
        util.testSortableGet(path + '?sort_by=created&direction=desc', model,
          allTestDocs, createdDescSort, hooks));
      
      var nameAscSort = (doc, doc2) =>
        doc.name.should.be.at.most(doc2.name);
      var nameDescSort = (doc, doc2) =>
        doc.name.should.be.at.least(doc2.name);
      it('can sort ascending by name lexicographically',
        util.testSortableGet(path + '?sort_by=name', model, allTestDocs,
          nameAscSort, hooks));
      it('can sort explicitly ascending by name lexicographically',
        util.testSortableGet(path + '?sort_by=name&direction=asc', model,
          allTestDocs, nameAscSort, hooks));
      it('can sort descending by name lexicographically',
        util.testSortableGet(path + '?sort_by=name&direction=desc', model,
          allTestDocs, nameDescSort, hooks));
      
      var idAscSort = (doc, doc2) => doc.id.should.be.below(doc2.id);
      var idDescSort = (doc, doc2) => doc.id.should.be.above(doc2.id);
      it('can sort ascending by ID',
        util.testSortableGet(path + '?sort_by=id', model, allTestDocs,
          idAscSort, hooks));
      it('can sort explicitly ascending by ID',
        util.testSortableGet(path + '?sort_by=id&direction=asc', model,
          allTestDocs, idAscSort, hooks));
      it('can sort descending by ID',
        util.testSortableGet(path + '?sort_by=id&direction=desc', model,
          allTestDocs, idDescSort, hooks));
      
      it('gives a 422 on an invalid sort_by value',
        util.testStatus(path + '?sort_by=INVALID', model, 422, hooks));
      it('gives a 422 on an empty sort_by value',
        util.testStatus(path + '?sort_by=', model, 422, hooks));
      it('gives a 422 on an invalid direction value',
        util.testStatus(path + '?direction=INVALID', model, 422, hooks));
      it('gives a 422 on an empty direction value',
        util.testStatus(path + '?direction=', model, 422, hooks));
      it('gives a 422 on invalid both sort_by and direction',
        util.testStatus(path + '?sort_by=foo&direction=bar', model, 422,
          hooks));
      it('gives a 422 on empty both sort_by and direction',
        util.testStatus(path + '?sort_by=&direction=', model, 422, hooks));
      
      it(`has correct paging on no ${plural}, no query string`,
        util.testPaging(path, model, [], {
          status: 200,
          hasMore: false,
          maxItems: 0,
          remainingItems: 0,
          range: false
        }, hooks)
      );
      it(`has correct paging on one ${plural}, no query string`,
        util.testPaging(path, model, generateDocs(1), {
          status: 200,
          hasMore: false,
          maxItems: 1,
          remainingItems: 0,
          range: false
        }, hooks)
      );
      it(`has correct paging on two ${plural}, no query string`,
        util.testPaging(path, model, generateDocs(2), {
          status: 200,
          hasMore: false,
          maxItems: 2,
          remainingItems: 0,
          range: false
        }, hooks)
      );
      it(`has correct paging on 31 ${plural}, no query string`,
        util.testPaging(path, model, generateDocs(31), {
          status: 206,
          hasMore: true,
          maxItems: 31,
          remainingItems: 1,
          range: '0-29/31'
        }, hooks)
      );
      it(`has correct paging on 30 ${plural}, no query string`,
        util.testPaging(path, model, generateDocs(30), {
          status: 200,
          hasMore: false,
          maxItems: 30,
          remainingItems: 0,
          range: false
        }, hooks)
      );
      it(`handles explicit page=0, implicit per_page=30, 30 ${plural}`,
        util.testPaging(path + '?page=0', model, generateDocs(30), {
          status: 200,
          hasMore: false,
          maxItems: 30,
          remainingItems: 0,
          range: false
        }, hooks)
      );
      it(`handles implicit page=0, explicit per_page=30, 30 ${plural}`,
        util.testPaging(path + '?per_page=30', model, generateDocs(30), {
          status: 200,
          hasMore: false,
          maxItems: 30,
          remainingItems: 0,
          range: false
        }, hooks)
      );
      it(`handles explicit page=0, explicit per_page=30, 30 ${plural}`,
        util.testPaging(path + '?page=0&per_page=30', model, generateDocs(30), {
          status: 200,
          hasMore: false,
          maxItems: 30,
          remainingItems: 0,
          range: false
        }, hooks)
      );
      it(`handles implicit page=0, explicit per_page=10, 15 ${plural}`,
        util.testPaging(path + '?per_page=10', model, generateDocs(15), {
          status: 206,
          hasMore: true,
          maxItems: 15,
          remainingItems: 5,
          range: '0-9/15'
        }, hooks)
      );
      it(`handles implicit page=0, explicit per_page=20, 15 ${plural}`,
        util.testPaging(path + '?per_page=20', model, generateDocs(15), {
          status: 200,
          hasMore: false,
          maxItems: 15,
          remainingItems: 0,
          range: false
        }, hooks)
      );
      it(`handles explicit page=0, explicit per_page=10, 15 ${plural}`,
        util.testPaging(path + '?page=0&per_page=10', model, generateDocs(15), {
          status: 206,
          hasMore: true,
          maxItems: 15,
          remainingItems: 5,
          range: '0-9/15'
        }, hooks)
      );
      it(`handles explicit page=1, implicit per_page=30, 40 ${plural}`,
        util.testPaging(path + '?page=1', model, generateDocs(40), {
          status: 206,
          hasMore: false,
          maxItems: 40,
          remainingItems: 0,
          range: '30-39/40'
        }, hooks)
      );
      it(`handles explicit page=1, explicit per_page=10, 15 ${plural}`,
        util.testPaging(path + '?page=1&per_page=10', model, generateDocs(15), {
          status: 206,
          hasMore: false,
          maxItems: 15,
          remainingItems: 0,
          range: '10-14/15'
        }, hooks)
      );
      it(`handles explicit page=1, implicit per_page=30, 60 ${plural}`,
        util.testPaging(path + '?page=1', model, generateDocs(60), {
          status: 206,
          hasMore: false,
          maxItems: 60,
          remainingItems: 0,
          range: '30-59/60'
        }, hooks)
      );
      it(`handles explicit page=1, explicit per_page=2, 4 ${plural}`,
        util.testPaging(path + '?page=1&per_page=2', model, generateDocs(4), {
          status: 206,
          hasMore: false,
          maxItems: 4,
          remainingItems: 0,
          range: '2-3/4'
        }, hooks)
      );
      it(`handles explicit page=2, implicit per_page=30, 100 ${plural}`,
        util.testPaging(path + '?page=2', model, generateDocs(100), {
          status: 206,
          hasMore: true,
          maxItems: 100,
          remainingItems: 10,
          range: '60-89/100'
        }, hooks)
      );
      it(`handles explicit page=8, explicit per_page=4, 50 ${plural}`,
        util.testPaging(path + '?page=8&per_page=4', model, generateDocs(50), {
          status: 206,
          hasMore: true,
          maxItems: 50,
          remainingItems: 14,
          range: '32-35/50'
        }, hooks)
      );
      it(`handle explicit page=23, explicit per_page=1, 33 ${plural}`,
        util.testPaging(path + '?page=23&per_page=1', model, generateDocs(33), {
          status: 206,
          hasMore: true,
          maxItems: 33,
          remainingItems: 9,
          range: '23-23/33'
        }, hooks)
      );
      it('gives a 422 on page=-1',
        util.testStatus(path + '?page=-1', model, 422, hooks));
      it('gives a 422 on per_page=-1',
        util.testStatus(path + '?per_page=-1', model, 422, hooks));
      it('gives a 422 on per_page=0',
        util.testStatus(path + '?per_page=0', model, 422, hooks));
      it('gives a 422 on per_page=201',
        util.testStatus(path + '?per_page=201', model, 422, hooks));
      it(`gives a 404 on explicit page=1, implicit per_page=30, 20 ${plural}`,
        util.testStatus(path + '?page=1', model, 404, hooks, generateDocs(20)));
      it(`gives a 404 on explicit page=1, explicit per_page=10, 5 ${plural}`,
        util.testStatus(path + '?page=1&per_page=10', model, 404, hooks,
          generateDocs(5)));
    });
    describe(`POST ${path}`, () => {
      it(`creates a ${singular}`,
        util.testPost(path, testDocs.simple1, model, hooks));
      if (testDocs.unicode) {
        it(`creates a ${singular} with unicode strings`,
          util.testPost(path, testDocs.unicode, model, hooks));
      }
      if (testDocs.whitespace) {
        it(`creates a ${singular} with whitespace strings`,
          util.testPost(path, testDocs.whitespace, model, hooks));
      }
      it(`creates a ${singular} when there's already a ${singular} in the DB`,
        util.testPost(path, testDocs.simple2, model, hooks, testDocs.simple1));
      it(`creates a ${singular} when there's already one with the same name`,
        util.testPost(path, testDocs.simple1, model, hooks, {
          name: testDocs.simple1.name,
          item: testDocs.simple2.item, hooks,
          checkout: testDocs.simple2.checkout,
          patron: testDocs.simple2.patron,
          signIn: true,
          signOut: true
        }));
      it(`creates a ${singular} when there's already an identical one`,
        util.testPost(path, testDocs.simple1, model, hooks, testDocs.simple1));
      it(`creates a ${singular} when there are already 100 ${plural} in the DB`,
        util.testPost(path, testDocs.simple1, model, hooks, generateDocs(100)));
      
      it('gives a 400 on syntatically invalid input',
        util.testStatus(path, model, 400, hooks, [], 'post', "I'm invalid"));
      it('gives a 400 on psuedo-valid input',
        util.testStatus(path, model, 400, hooks, [], 'post', '"Hi!"'));
      it('gives a 422 on an empty object as input',
        util.testStatus(path, model, 422, hooks, [], 'post', {}));
      it('treats empty input the same as an empty object (422)',
        util.testStatus(path, model, 422, hooks, [], 'post', ''));
      it(`gives a 422 on an array of valid ${plural} as input`,
        util.testStatus(path, model, 422, hooks, [], 'post',
          Array.from(generateDocs(5))));
      
      for (var doc of util.generateObjectsMissingOneProperty(
          testDocs.simple1)) {
        it(`gives a 422 when missing "${doc.prop}"`,
          util.testStatus(path, model, 422, hooks, [], 'post', doc.obj));
      }
    });
    describe(`DELETE ${path}`, () => {
      it(`does nothing with no ${plural} in the database`,
        util.testCollectionDelete(path, model, [], hooks));
      it(`deletes 1 ${singular} in the database`,
        util.testCollectionDelete(path, model, testDocs.simple1, hooks));
      it('deletes a bunch of edge cases in the database',
        util.testCollectionDelete(path, model, Object.values(testDocs), hooks));
      it(`deletes 100 ${plural} in the database`,
        util.testCollectionDelete(path, model, generateDocs(100), hooks));
    });
    
    describe(`GET ${idPath}`, () => {
      it(`gets a simple ${singular} as the only ${singular} in the DB`,
        util.testResourceGet(path, model, testDocs.simple1, hooks));
      if (testDocs.unicode) {
        it(`gets a unicode ${singular} as the only ${singular} in the DB`,
          util.testResourceGet(path, model, testDocs.unicode, hooks));
      }
      if (testDocs.whitespace) {
        it(`gets a whitespace ${singular} as the only ${singular} in the DB`,
          util.testResourceGet(path, model, testDocs.whitespace, hooks));
      }
      it(`gets a simple ${singular} with edge-case ${plural} in the DB`,
        util.testResourceGet(path, model, testDocs.simple2, hooks,
          Object.values(testDocs)));
      if (testDocs.unicode) {
        it(`gets a unicode ${singular} with edge-case ${plural} in the DB`,
          util.testResourceGet(path, model, testDocs.unicode, hooks,
            Object.values(testDocs)));
      }
      if (testDocs.whitespace) {
        it(`gets a whitespace ${singular} with edge-case ${plural} in the DB`,
          util.testResourceGet(path, model, testDocs.whitespace, hooks,
            Object.values(testDocs)));
      }
      it(`gets a simple ${singular} with 100 ${plural} in the DB`,
        util.testResourceGet(path, model, testDocs.simple1, hooks,
          generateDocs(100)));
      if (testDocs.unicode) {
        it(`gets a unicode ${singular} with 100 ${plural} in the DB`,
          util.testResourceGet(path, model, testDocs.unicode, hooks,
            generateDocs(100)));
      }
      if (testDocs.whitespace) {
        it(`gets a whitespace ${singular} with 100 ${plural} in the database`,
          util.testResourceGet(path, model, testDocs.whitespace, hooks,
            generateDocs(100)));
      }
      
      testIDHandling('get');
    });
    describe(`PUT ${idPath}`, () => {
      it(`replaces a simple ${singular} with a simple ${singular}`,
        util.testPut(path, model, testDocs.simple1, testDocs.simple2, hooks));
      if (testDocs.unicode) {
        it(`replaces a simple ${singular} with a unicode ${singular}`,
          util.testPut(path, model, testDocs.simple1, testDocs.unicode, hooks));
        it(`replaces a unicode ${singular} with a simple ${singular}`,
          util.testPut(path, model, testDocs.unicode, testDocs.simple1, hooks));
      }
      if (testDocs.whitespace) {
        it(`replaces a simple ${singular} with a whitespace ${singular}`,
          util.testPut(path, model, testDocs.simple1,
            testDocs.whitespace, hooks));
        it(`replaces a whitespace ${singular} with a simple ${singular}`,
          util.testPut(path, model, testDocs.whitespace,
            testDocs.simple1, hooks));
      }
      if (testDocs.unicode && testDocs.whitespace) {
        it(`replaces a unicode ${singular} with a whitespace ${singular}`,
          util.testPut(path, model, testDocs.unicode,
            testDocs.whitespace, hooks));
        it(`replaces a whitespace ${singular} with a unicode ${singular}`,
          util.testPut(path, model, testDocs.whitespace,
            testDocs.unicode, hooks));
      }
      
      it(`replaces a simple ${singular} with a simple ${singular}, 1 in DB`,
        util.testPut(path, model, testDocs.simple1, testDocs.simple2, hooks,
          generateDocs(1)));
      it(`replaces a simple ${singular} with a simple ${singular}, 100 in DB`,
        util.testPut(path, model, testDocs.simple1, testDocs.simple2, hooks,
          generateDocs(100)));
      if (testDocs.unicode && testDocs.whitespace) {
        it(`replaces unicode ${singular} with whitespace ${singular}, 99 in DB`,
          util.testPut(path, model, testDocs.unicode, testDocs.whitespace,
            hooks, generateDocs(99)));
      }
      
      it('gives a 400 on invalid JSON',
        util.testStatus(idPath, model, 400, hooks, [testDocs.simple1],
          'put', 'invalid'));
      it('gives a 400 on strictly invalid JSON (parsable by JSON.parse)',
        util.testStatus(idPath, model, 400, hooks, [testDocs.simple1],
          'put', '"Hi!"'));
      
      for (var unmod of ['created', 'updated', 'id']) {
        var doc = JSON.parse(JSON.stringify(testDocs.simple1));
        doc[unmod] = unmod === 'id' ? '123456789012345678901234'
          : '2016-10-24T17:00:42-03:00';
        it(`gives a 422 when including "${unmod}"`,
          util.testStatus(idPath, model, 422, hooks, [testDocs.simple1],
            'put', doc));
      }
      
      for (var doc of util.generateObjectsMissingOneProperty(
            testDocs.simple1)) {
        it(`gives a 422 when missing "${doc.prop}"`,
          util.testStatus(idPath, model, 422, hooks, [testDocs.simple1],
            'put', doc.obj));
      }
      
      testIDHandling('put', testDocs.simple1);
    });
    describe(`PATCH ${idPath}`, () => {
      // try to find all the properties
      // TODO find a more elegant way of doing this
      
      var stringProp = null;
      var topLevelProp = null;
      var topLevelValue = null;
      var nestedParentProp = null;
      var nestedProp = null;
      var nestedValue = null;
      for (var prop in testDocs.simple1) {
        if (!testDocs.simple1.hasOwnProperty(prop)) continue;
        switch (typeof testDocs.simple1[prop]) {
          case 'string':
            stringProp = prop;
            break;
          case 'boolean':
            topLevelProp = prop;
            topLevelValue = !testDocs.simple1[prop];
            break;
          case 'number':
            topLevelProp = prop;
            topLevelValue = testDocs.simple1[prop] + 1;
            break;
          case 'object':
            if (Array.isArray(testDocs.simple1[prop])) continue;
            
            nestedParentProp = prop;
            
            var i = 0;
            var keys = Object.keys(testDocs.simple1[prop]);
            do {
              nestedProp = keys[i];
              i++;
            } while (i < keys.length && !['string', 'number', 'boolean']
              .includes(typeof testDocs.simple1[prop][nestedProp]));
            
            switch (typeof testDocs.simple1[prop][nestedProp]) {
              case 'string':
              case 'number':
                nestedValue = testDocs.simple1[prop][nestedProp] + 1;
                break;
              case 'boolean':
                nestedValue = !testDocs.simple1[prop][nestedProp];
                break;
            }
            
            break;
        }
      }
      if (testDocs.simple1.hasOwnProperty('name')) stringProp = 'name';
      
      if (stringProp) {
        it(`patches a ${singular} changing ${stringProp}`,
          util.testPatch(path, model, testDocs.simple1,
            {[stringProp]: '__##TEST##__'},
            doc => doc[stringProp] = '__##TEST##__', hooks));
      }
      if (nestedProp) {
        it(`patches a ${singular} changing a nested property`,
          util.testPatch(path, model, testDocs.simple1,
            {[nestedParentProp]: {[nestedProp]: nestedValue}},
            doc => doc[nestedParentProp][nestedProp] = nestedValue, hooks));
      }
      if (stringProp && topLevelProp) {
        it(`patches a ${singular} changing multiple top-level properties`,
          util.testPatch(path, model, testDocs.simple1,
            {[stringProp]: '__##TEST##__', [topLevelProp]: topLevelValue},
            doc => {
              doc[stringProp] = '__##TEST##__';
              doc[topLevelProp] = topLevelValue;
            }, hooks));
      }
      if (topLevelProp && nestedProp) {
        it(`patches a ${singular} changing top-level and deeper properties`,
          util.testPatch(path, model, testDocs.simple1,
            {[topLevelProp]: topLevelValue,
              [nestedParentProp]: {[nestedProp]: nestedValue}},
            doc => {
              doc[topLevelProp] = topLevelValue;
              doc[nestedParentProp][nestedProp] = nestedValue;
            }, hooks));
      }
      if (stringProp) {
        it(`patches a simple ${singular} changing ${stringProp} to unicode`,
          util.testPatch(path, model, testDocs.simple1,
            {[stringProp]: 'Úñí¢öðè ïß ©öół'},
            doc => doc[stringProp] = 'Úñí¢öðè ïß ©öół', hooks));
        it(`patches a simple ${singular} changing ${stringProp} to whitespace`,
          util.testPatch(path, model, testDocs.simple1,
            {[stringProp]: '   \t\n\t  '},
            doc => doc[stringProp] = '   \t\n\t  ', hooks));
        if (testDocs.unicode) {
          it(`patches a unicode ${singular} changing ${stringProp} to ASCII`,
            util.testPatch(path, model, testDocs.unicode,
              {[stringProp]: 'I am a test and you should know that'},
              doc => doc[stringProp] = 'I am a test and you should know that',
              hooks));
        }
        if (testDocs.whitespace) {
          it(`patches a whitespace ${singular} changing ${stringProp} to ASCII`,
            util.testPatch(path, model, testDocs.whitespace,
              {[stringProp]: 'I am a test and you should know that'},
              doc => doc[stringProp] = 'I am a test and you should know that',
              hooks));
        }
      }
      it('does nothing with an empty object',
        util.testPatch(path, model, testDocs.simple1, {}, doc => {}, hooks));
      it('ignores nonexistant properties in the patch',
        util.testPatch(path, model, testDocs.simple1, {nonexistant: 3},
          doc => {}, hooks));
      it('ignores nonexistant nested properties in the patch',
        util.testPatch(path, model, testDocs.simple1,
          {non: {existant: "I don't exist!"}}, doc => {}, hooks));
      if (nestedParentProp) {
        it('ignores nonexistant nested properties when parent property exists',
          util.testPatch(path, model, testDocs.simple1,
            {[nestedParentProp]: {nonexistant: 'bar'}},
            doc => {}, hooks));
      }
      if (topLevelProp) {
        it('ignores nonexistant properties  combined with existing properties',
          util.testPatch(path, model, testDocs.simple1,
            {[topLevelProp]: topLevelValue, nonexistant: 901},
            doc => doc[topLevelProp] = topLevelValue, hooks));
      }
      
      it('gives a 400 on invalid JSON',
        util.testStatus(idPath, model, 400, hooks, [testDocs.simple1],
          'patch', ":'invalid"));
      it('gives a 400 on strictly invalid JSON (parseable by JSON.parse)',
        util.testStatus(idPath, model, 400, hooks, [testDocs.simple1],
          'patch', '"invalid"'));
      
      for (var patch of util.generateSinglePropertyPatches(testDocs.simple1)) {
        it(`gives a 422 when trying to delete "${patch.prop}"`,
          util.testStatus(idPath, model, 422, hooks, [testDocs.simple1],
            'patch', patch.obj));
      }
      
      testIDHandling('patch');
    });
    describe(`DELETE ${idPath}`, () => {
      it(`deletes a simple ${singular} with an empty DB`,
        util.testDelete(path, model, testDocs.simple1, hooks));
      it(`deletes a simple ${singular} with a simple ${singular} in DB`,
        util.testDelete(path, model, testDocs.simple1, hooks,
          [testDocs.simple2]));
      it(`deletes a simple ${singular} with 100 ${plural} in DB`,
        util.testDelete(path, model, testDocs.simple1, hooks,
          generateDocs(100)));
      
      if (testDocs.unicode) {
        it(`deletes a unicode ${singular} with an empty DB`,
          util.testDelete(path, model, testDocs.unicode, hooks));
        it(`deletes a unicode ${singular} with a simple ${singular} in DB`,
          util.testDelete(path, model, testDocs.unicode, hooks,
            [testDocs.simple2]));
        it(`deletes a unicode ${singular} with 100 ${plural} in DB`,
          util.testDelete(path, model, testDocs.unicode, hooks,
            generateDocs(100)));
      }
      
      if (testDocs.whitespace) {
        it(`deletes a whitespace ${singular} with an empty DB`,
          util.testDelete(path, model, testDocs.whitespace, hooks));
        it(`deletes a whitespace ${singular} with a simple ${singular} in DB`,
          util.testDelete(path, model, testDocs.whitespace, hooks,
            [testDocs.simple2]));
        it(`deletes a whitespace ${singular} with 100 ${plural} in DB`,
          util.testDelete(path, model, testDocs.whitespace, hooks,
            generateDocs(100)));
      }
      
      testIDHandling('delete');
    });
  });
};