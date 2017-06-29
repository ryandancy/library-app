/* global angular */

angular.module('libraryApp', ['ngRoute'])
.config(function($routeProvider) {
  $routeProvider
  .when('/patrons', {
    templateUrl: 'patron.html',
    controller: 'PatronCtrl as patronCtrl'
  })
  .when('/patrons/add', {
    templateUrl: 'add-patron.html',
    controller: 'AddPatronCtrl as addPatronCtrl'
  })
  .when('/patrons/:id', {
    templateUrl: 'show-patron.html',
    controller: 'ShowPatronCtrl as showPatronCtrl'
  })
  .when('/items', {
    templateUrl: 'item.html',
    controller: 'ItemCtrl as itemCtrl'
  });
});