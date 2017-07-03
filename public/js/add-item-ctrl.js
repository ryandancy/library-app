/* global angular */
// TODO more error handling

angular.module('libraryApp')
.controller('AddItemCtrl', function($scope, $http, $location) {
  $scope.inputType = 'form'; // use form input by default
  
  this.item = {marc: {fields: {control: [], variable: []}}};
  
  this.marcOverwrite = [
    // tag, subfield, field-display, field-name, always overwritten?
    [20, 'a', 'ISBN', 'isbn', false],
    [100, 'a', 'Author', 'author', true],
    [245, 'a', 'Title', 'title', true],
    [245, 'b', 'Subtitle', 'subtitle', false],
    [250, 'a', 'Edition', 'edition', false],
    [260, 'a', 'Place of publishing', 'pubPlace', false],
    [260, 'b', 'Publisher', 'publisher', true],
    [260, 'c', 'Year of publishing', 'pubYear', false]
  ];
  
  this.checkRemove = prop => {
    if (!this.item[prop]) {
      delete this.item[prop];
    }
  };
  
  this.abort = () => {
    $location.path('/items');
  };
  
  this.saveMarc = marc => {
    $http.post('/v0/items', marc, {
      headers: {'Content-Type': 'application/marc'}
    }).then(this.abort, () => {});
  };
  
  this.saveForm = () => {
    // Do the overwriting stuff which if the template was smarter we wouldn't
    // even have to do.
    // TODO what do we do about the indicator fields?
    
    for (let [tag, subfieldTag, , fieldName, always] of this.marcOverwrite) {
      // find the variable field with the tag
      // TODO should this dance + the subfield one below be combined?
      let field = null;
      for (let aField of this.item.marc.fields.variable) {
        if (parseInt(aField.tag, 10) === tag) {
          field = aField;
          break;
        }
      }
      
      if (field === null) {
        if (always) {
          field = {tag: tag, ind1: ' ', ind2: ' ', subfields: []};
          this.item.marc.fields.variable.push(field);
        } else {
          continue;
        }
      }
      
      // find the subfield
      let subfield = null;
      for (let aSubfield of field.subfields) {
        if (aSubfield.tag === subfieldTag) {
          subfield = aSubfield;
          break;
        }
      }
      
      if (subfield === null) {
        if (always) {
          subfield = {tag: subfieldTag, value: ''};
          field.subfields.push(subfield);
        } else {
          continue;
        }
      }
      
      // find the value, overwrite
      if (fieldName in this.item) {
        subfield.value = this.item[fieldName];
      } else if (always) {
        return; // validation will fail anyways, might as well fail now
      }
    }
    
    this.item.status = 'in';
    
    // FIXME FIXME FIXME FIXME FIXME FIXME Generate a leader!!!!!!!!!!!
    // FIXME FIXME FIXME FIXME This one is just for testing, FIX IT!!!!
    this.item.marc.leader = '123456789012345678901234';
    
    $http.post('/v0/items', this.item)
    .then(this.abort, () => {});
  };
});