/* global angular */

angular.module('libraryApp')
.controller('ShowPatronCtrl', function($scope, $http, $location, $routeParams) {
  // Handle showing and editing this patron
  
  const PATRON_UNMODIFIABLES = ['created', 'updated', 'id', 'checkouts'];
  
  this.editing = false;
  this.editPatron = {};
  
  let id = $routeParams.id;
  this.patron = {};
  
  $http.get(`/v0/patrons/${id}`).then(res => {
    this.patron = res.data;
  }, () => {});
  
  this.back = () => {
    this.abortEdit();
    $location.path('/patrons');
  };
  
  this.startEdit = () => {
    this.editing = true;
    this.editPatron = angular.copy(this.patron);
    for (let unmod of PATRON_UNMODIFIABLES) {
      delete this.editPatron[unmod];
    }
  };
  
  this.abortEdit = () => {
    this.editing = false;
    this.editPatron = {};
  };
  
  this.saveEdit = () => {
    $http.put(`/v0/patrons/${id}`, this.editPatron)
    .then(this.abortEdit, () => {});
  };
  
  // Handle deleting this patron
  
  this.delPatron = () => {
    $http.delete(`/v0/patrons/${id}`)
    .then(this.back, () => {});
  };
});