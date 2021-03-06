// A template for (almost) fully testing a collection endpoint and its
// corresponding resource endpoint

process.env.NODE_ENV = 'test';

const util = require('./util.js');

const allModels = [
  require('../models/admin.js'),
  require('../models/checkout.js'),
  require('../models/item.js'),
  require('../models/patron.js')
];

const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiSubset = require('chai-subset');

const should = chai.should();
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
  - optionalProperties: an array of, well, properties that are optional, in
    string form with dots ('.') separating nested properties. Defaults to [].
    Can use a * in place of a string to specify all sub-properties; this is only
    supported as the last char in the string.
  - ignoredProperties: an array of properties that should be ignored. Can use
    wildcards the same as optionalProperties. Defaults to [].
  - *patchProperties: an object containing properties for the PATCH tests:
    - string: a string specifying a string property that can be modified without
      restriction. Defaults to 'name'. Set to `false` if there is no appropriate
      property. The property must be top-level.
    - *topLevel: an object containing: (or false if no applicable property)
      - *property: a top-level property name.
      - *value: a value to which it can be changed.
    - *nested: an object containing: (or false if no applicable property)
      - *property: a second-level property name.
      - *parentProperty: the parent property name of `property`.
      - *value: a value to which it can be changed.
  - customUnmodifiables: an array of unmodifiable top-level (for now) properties
    that cannot be present in a PUT/PATCH/POST request. Defaults to [].
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
  - additionalTests: a function that takes no arguments, to be executed during
    the tests inside the global describe() in order to add more tests.
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
    || !options.hasOwnProperty('patchProperties')
    || !options.patchProperties.hasOwnProperty('topLevel')
    || (options.patchProperties.topLevel && (
      !options.patchProperties.topLevel.hasOwnProperty('property')
      || !options.patchProperties.topLevel.hasOwnProperty('value')
    ))
    || !options.patchProperties.hasOwnProperty('nested')
    || (options.patchProperties.nested && (
      !options.patchProperties.nested.hasOwnProperty('property')
      || !options.patchProperties.nested.hasOwnProperty('parentProperty')
      || !options.patchProperties.nested.hasOwnProperty('value')
    ))
    || !options.hasOwnProperty('generator')
  ) {
    throw new Error('options parameter is missing some required properties');
  }
  
  const path = options.path;
  const idPath = options.idPath || path + '/:id';
  const model = options.model;
  const singular = options.name.singular;
  const plural = options.name.plural || path.slice(path.lastIndexOf('/') + 1);
  const testDocs = options.testDocs;
  const allTestDocs = Object.values(testDocs);
  const optionalProps = options.optionalProperties || [];
  const ignoreProps = options.ignoredProperties || [];
  const unmodifiables = options.customUnmodifiables || [];
  const generator = options.generator;
  const customBeforeEach = options.beforeEach || false;
  const hooks = options.populateDBHooks || {};
  const moreTests = options.additionalTests || (() => {});
  
  const patchProps = options.patchProperties;
  const stringProp = patchProps.string === undefined ? 'name'
    : patchProps.string;
  const topLevelProp = patchProps.topLevel ? patchProps.topLevel.property
    : false;
  const topLevelValue = patchProps.topLevel ? patchProps.topLevel.value : false;
  const nestedProp = patchProps.nested ? patchProps.nested.property : false;
  const nestedValue = patchProps.nested ? patchProps.nested.value : false;
  const nestedParentProp = patchProps.nested ? patchProps.nested.parentProperty
    : false;
  
  function* generateDocs(num) {
    for (let i = 0; i < num; i++) {
      yield generator(num);
    }
  }
  
  function handleWildcard(propArr, prop) {
    if (propArr.includes(prop)) return true;
    for (let aProp of propArr) {
      if (aProp.endsWith('.*') && prop.startsWith(aProp.slice(0, -1))) {
        return true;
      }
    }
    return false;
  }
  
  function isIgnored(prop) {
    return handleWildcard(ignoreProps, prop);
  }
  
  function isOptional(prop) {
    return handleWildcard(optionalProps, prop);
  }
  
  function filterUnmodifiables() {
    let resObj = JSON.parse(JSON.stringify(testDocs));
    for (let key in resObj) {
      if (!resObj.hasOwnProperty(key)) continue;
      for (let unmod of unmodifiables) {
        if (resObj[key].hasOwnProperty(unmod)) {
          delete resObj[key][unmod];
        }
      }
    }
    return resObj;
  }
  
  let unmodTestDocs = filterUnmodifiables(testDocs);
  
  describe(plural, () => {
    beforeEach(done => {
      // Remove ALL the things
      let promises = [];
      for (let aModel of allModels) {
        promises.push(aModel.remove({}).exec());
      }
      Promise.all(promises).then(() => done(), done);
    });
    if (customBeforeEach) {
      beforeEach(done => {
        customBeforeEach(() => {
          let newUnmodTestDocs = filterUnmodifiables(testDocs);
          // this dance is necessary to avoid assigning to unmodTestDocs
          // directly, or to any of its properties, which would not carry over
          // to the tests
          for (let prop in newUnmodTestDocs) {
            if (!newUnmodTestDocs.hasOwnProperty(prop)) continue;
            for (let subProp in newUnmodTestDocs[prop]) {
              if (!newUnmodTestDocs[prop].hasOwnProperty(subProp)) continue;
              unmodTestDocs[prop][subProp] = newUnmodTestDocs[prop][subProp];
            }
          }
          done();
        }, testDocs);
      });
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
      
      let createdAscSort = (doc, doc2) =>
        new Date(doc.created).should.be.at.most(new Date(doc2.created));
      let createdDescSort = (doc, doc2) =>
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
      
      if (model.schema.path('name')) {
        let nameAscSort = (doc, doc2) =>
          doc.name.should.be.at.most(doc2.name);
        let nameDescSort = (doc, doc2) =>
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
      } else {
        it('gives a 422 when sorting by name lexicographically',
          util.testStatus(path + '?sort_by=name', model, 422, hooks));
        it('gives a 422 when sorting explicitly ascending by name '
         + 'lexicographically', util.testStatus(
            path + '?sort_by=name&direction=asc', model, 422, hooks));
        it('gives a 422 when sorting descending by name lexicographically',
          util.testStatus(path + '?sort_by=name&direction=desc', model, 422,
            hooks));
      }
      
      let idAscSort = (doc, doc2) => doc.id.should.be.below(doc2.id);
      let idDescSort = (doc, doc2) => doc.id.should.be.above(doc2.id);
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
        util.testPost(path, unmodTestDocs.simple1, model, hooks));
      if (testDocs.unicode) {
        it(`creates a ${singular} with unicode strings`,
          util.testPost(path, unmodTestDocs.unicode, model, hooks));
      }
      if (testDocs.whitespace) {
        it(`creates a ${singular} with whitespace strings`,
          util.testPost(path, unmodTestDocs.whitespace, model, hooks));
      }
      it(`creates a ${singular} when there's already a ${singular} in the DB`,
        util.testPost(path, unmodTestDocs.simple2, model, hooks,
          testDocs.simple1));
      it(`creates a ${singular} when there's already an identical one`,
        util.testPost(path, unmodTestDocs.simple1, model, hooks,
          testDocs.simple1));
      it(`creates a ${singular} when there are already 100 ${plural} in the DB`,
        util.testPost(path, unmodTestDocs.simple1, model, hooks,
          generateDocs(100)));
      
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
      
      for (let doc of util.generateObjectsMissingOneProperty(
          unmodTestDocs.simple1)) {
        if (isIgnored(doc.prop)) continue;
        if (isOptional(doc.prop)) {
          it(`works fine when missing optional property "${doc.prop}"`,
            util.testPost(path, doc.obj, model, hooks));
        } else {
          it(`gives a 422 when missing require property "${doc.prop}"`,
            util.testStatus(path, model, 422, hooks, [], 'post', doc.obj));
        }
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
      
      util.testIDHandling(idPath, singular, model, hooks, 'get',
        testDocs.simple1);
    });
    describe(`PUT ${idPath}`, () => {
      it(`replaces a simple ${singular} with a simple ${singular}`,
        util.testPut(path, model, testDocs.simple1, unmodTestDocs.simple2,
          hooks));
      if (testDocs.unicode) {
        it(`replaces a simple ${singular} with a unicode ${singular}`,
          util.testPut(path, model, testDocs.simple1, unmodTestDocs.unicode,
            hooks));
        it(`replaces a unicode ${singular} with a simple ${singular}`,
          util.testPut(path, model, testDocs.unicode, unmodTestDocs.simple1,
            hooks));
      }
      if (testDocs.whitespace) {
        it(`replaces a simple ${singular} with a whitespace ${singular}`,
          util.testPut(path, model, testDocs.simple1,
            unmodTestDocs.whitespace, hooks));
        it(`replaces a whitespace ${singular} with a simple ${singular}`,
          util.testPut(path, model, testDocs.whitespace,
            unmodTestDocs.simple1, hooks));
      }
      if (testDocs.unicode && testDocs.whitespace) {
        it(`replaces a unicode ${singular} with a whitespace ${singular}`,
          util.testPut(path, model, testDocs.unicode,
            unmodTestDocs.whitespace, hooks));
        it(`replaces a whitespace ${singular} with a unicode ${singular}`,
          util.testPut(path, model, testDocs.whitespace,
            unmodTestDocs.unicode, hooks));
      }
      
      it(`replaces a simple ${singular} with a simple ${singular}, 1 in DB`,
        util.testPut(path, model, testDocs.simple1, unmodTestDocs.simple2,
          hooks, generateDocs(1)));
      it(`replaces a simple ${singular} with a simple ${singular}, 100 in DB`,
        util.testPut(path, model, testDocs.simple1, unmodTestDocs.simple2,
          hooks, generateDocs(100)));
      if (testDocs.unicode && testDocs.whitespace) {
        it(`replaces unicode ${singular} with whitespace ${singular}, 99 in DB`,
          util.testPut(path, model, testDocs.unicode, unmodTestDocs.whitespace,
            hooks, generateDocs(99)));
      }
      
      it('gives a 400 on invalid JSON',
        util.testStatus(idPath, model, 400, hooks, [testDocs.simple1],
          'put', 'invalid'));
      it('gives a 400 on strictly invalid JSON (parsable by JSON.parse)',
        util.testStatus(idPath, model, 400, hooks, [testDocs.simple1],
          'put', '"Hi!"'));
      
      for (let unmod of ['created', 'updated', 'id'].concat(unmodifiables)) {
        let doc = JSON.parse(JSON.stringify(unmodTestDocs.simple1));
        doc[unmod] = unmod === 'id' ? '123456789012345678901234'
          : '2016-10-24T17:00:42-03:00';
        it(`gives a 422 when including "${unmod}"`,
          util.testStatus(idPath, model, 422, hooks, [testDocs.simple1],
            'put', doc));
      }
      
      for (let doc of util.generateObjectsMissingOneProperty(
            testDocs.simple1)) {
        if (isIgnored(doc.prop)) continue;
        if (isOptional(doc.prop)) {
          it(`works fine when missing "${doc.prop}"`,
            util.testPut(path, model, testDocs.simple1, doc.obj, hooks));
        } else {
          it(`gives a 422 when missing "${doc.prop}"`,
            util.testStatus(idPath, model, 422, hooks, [testDocs.simple1],
              'put', doc.obj));
        }
      }
      
      util.testIDHandling(idPath, singular, model, hooks, 'put',
        testDocs.simple1, unmodTestDocs.simple1);
    });
    describe(`PATCH ${idPath}`, () => {
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
            {[stringProp]: '?????????????? ???? ????????'},
            doc => doc[stringProp] = '?????????????? ???? ????????', hooks));
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
        util.testPatch(path, model, testDocs.simple1, {}, () => {}, hooks));
      it('ignores nonexistant properties in the patch',
        util.testPatch(path, model, testDocs.simple1, {nonexistant: 3},
          () => {}, hooks));
      it('ignores nonexistant nested properties in the patch',
        util.testPatch(path, model, testDocs.simple1,
          {non: {existant: "I don't exist!"}}, () => {}, hooks));
      if (nestedParentProp) {
        it('ignores nonexistant nested properties when parent property exists',
          util.testPatch(path, model, testDocs.simple1,
            {[nestedParentProp]: {nonexistant: 'bar'}},
            () => {}, hooks));
      }
      if (topLevelProp) {
        it('ignores nonexistant properties combined with existing properties',
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
      
      for (let patch of util.generateSinglePropertyPatches(
          unmodTestDocs.simple1)) {
        if (isIgnored(patch.prop)) continue;
        if (!isOptional(patch.prop)) {
          it(`gives a 422 when trying to delete "${patch.prop}"`,
            util.testStatus(idPath, model, 422, hooks, [testDocs.simple1],
              'patch', patch.obj));
        }
      }
      
      util.testIDHandling(idPath, singular, model, hooks, 'patch',
        testDocs.simple1);
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
      
      util.testIDHandling(idPath, singular, model, hooks, 'delete',
        testDocs.simple1);
    });
    
    moreTests();
  });
};