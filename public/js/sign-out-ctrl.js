/* global angular */

angular.module('libraryApp')
.controller('SignOutCtrl', function($scope, $http) {
  this.phases = {
    NAME_PHASE: 0,
    ITEMS_PHASE: 1
  };
  
  this.phase = this.phases.NAME_PHASE;
});