/* global angular */
// TODO this has many, many similarities to show-patron-ctrl.js -- merge?
// TODO more error handling

angular.module('libraryApp')
.controller('ShowItemCtrl', function($scope, $http, $location,
    $routeParams, marcOverwrite) {
  // Handle showing this item
  
  this.marcOverwrite = marcOverwrite.data;
  
  let ITEM_UNMODIFIABLES = ['created', 'updated', 'id', 'checkoutID'];
  
  let id = $routeParams.id;
  this.item = {};
  
  $http.get(`/v0/items/${id}`).then(res => {
    this.item = res.data;
  }, () => {});
  
  this.back = () => {
    this.abortEdit();
    $location.path('/items');
  };
  
  // Handle editing this item
  
  this.editItem = {};
  this.editing = false;
  
  this.startEdit = () => {
    this.editing = true;
    this.editItem = angular.copy(this.item);
    for (let unmod of ITEM_UNMODIFIABLES) {
      delete this.editItem[unmod];
    }
  };
  
  this.abortEdit = () => {
    this.editing = false;
    this.editItem = {};
  };
  
  this.saveEdit = () => {
    // MARC overwriting stuff!
    try {
      marcOverwrite.overwrite(this.editItem);
    } catch (e) {
      return; // validation will fail anyways, might as well fail now
      // TODO actually show the error or something
    }
    
    $http.put(`/v0/items/${id}`, this.editItem)
    .then(this.abortEdit, () => {});
  };
  
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
  
  // Handle deleting this item
  
  this.delItem = () => {
    $http.delete(`/v0/items/${id}`)
    .then(this.back, () => {});
  };
});