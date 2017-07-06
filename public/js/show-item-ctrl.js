/* global angular */

angular.module('libraryApp')
.controller('ShowItemCtrl', function($scope, $http, $location, $routeParams) {
  // Handle showing this item
  
  this.editing = false;
  
  let id = $routeParams.id;
  this.item = {};
  
  $http.get(`/v0/items/${id}`).then(res => {
    this.item = res.data;
  }, () => {});
  
  // Handle showing/fetching raw MARC
  
  this.showingMarc = false;
  this.rawMarc = '';
  
  this.showMarc = () => {
    if (!this.rawMarc) {
      // fetch the MARC
      $http.get(`/v0/items/${id}/marc`, {
        headers: {'Accept': 'application/marc'}
      }).then(res => {
        this.rawMarc = res.data;
      }, () => {}); // TODO error handling?
    }
    this.showingMarc = true;
  };
  
  this.hideMarc = () => this.showingMarc = false;
});