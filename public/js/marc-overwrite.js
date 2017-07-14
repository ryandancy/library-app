/* global angular */
// Overwrite specific MARC fields with separate values entered
// e.g. 100$a is overwritten with the `author` value

angular.module('libraryApp')
.service('marcOverwrite', function() {
  this.data = [
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
  
  this.overwrite = item => {
    // TODO what do we do about the indicator fields?
    
    for (let [tag, subfieldTag, , fieldName, always] of this.data) {
      // find the variable field with the tag
      // TODO should this dance + the subfield one below be combined?
      let field = null;
      for (let aField of item.marc.fields.variable) {
        if (parseInt(aField.tag, 10) === tag) {
          field = aField;
          break;
        }
      }
      
      if (field === null) {
        if (always) {
          field = {tag: tag, ind1: ' ', ind2: ' ', subfields: []};
          item.marc.fields.variable.push(field);
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
      if (fieldName in item) {
        subfield.value = item[fieldName];
      } else if (always) {
        throw 'required field not present';
      }
    }
  };
});