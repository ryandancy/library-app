/* global angular */
// TODO more error handling

angular.module('libraryApp')
.controller('AddItemCtrl', function($scope, $http, $location, marcOverwrite) {
  $scope.inputType = 'form'; // use form input by default
  
  this.item = {marc: {fields: {control: [], variable: []}}};
  
  this.marcOverwrite = marcOverwrite.data;
  
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
    try {
      marcOverwrite.overwrite(this.item);
    } catch (e) {
      return; // validation will fail anyways, might as well fail now
      // TODO actually show the error or something
    }
    
    this.item.status = 'in';
    
    let itemTypeMap = {
      'language material': 'a',
      'notated music': 'c',
      'manuscript notated music': 'd',
      'cartographic material': 'e',
      'manuscript cartographic material': 'f',
      'projected medium': 'g',
      'nonmusical sound recording': 'i',
      'musical sound recording': 'j',
      'two-dimensional nonprojectable graphic': 'k',
      'computer file': 'm',
      'kit': 'o',
      'mixed materials': 'p',
      'three-dimensional artifact or naturally occuring object': 'r',
      'manuscript language material': 't'
    };
    
    let typeChar = itemTypeMap[this.item.itemType];
    
    // ????? will be replaced by length server-side
    this.item.marc.leader = `?????n${typeChar}m  2200024   4500`;
    
    $http.post('/v0/items', this.item)
    .then(this.abort, () => {});
  };
});