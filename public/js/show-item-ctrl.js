/* global angular */

angular.module('libraryApp')
.controller('ShowItemCtrl', function($scope, $http, $location, $routeParams) {
  // Handle showing and editing this item
  
  this.editing = false;
  
  let id = $routeParams.id;
  this.item = {};
  
  $http.get(`/v0/items/${id}`).then(res => {
    this.item = res.data;
  }, () => {});
});