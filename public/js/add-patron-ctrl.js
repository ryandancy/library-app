/* global angular */
// TODO more error handling

angular.module('libraryApp')
.controller('AddPatronCtrl', function($scope, $http, $location) {
  this.patron = {};
  
  this.abort = () => {
    $location.path('/patrons');
  };
  
  this.clear = () => {
    this.patron = {}; // BUG only clears valid fields...
  };
  
  this.doAdd = () => {
    $http.post('/v0/patrons', this.patron)
    .then(this.abort, () => {});
  };
});