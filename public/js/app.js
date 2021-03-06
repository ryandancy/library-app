/* global angular */

angular.module('libraryApp', ['ngRoute'])
.config($routeProvider => {
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
  })
  .when('/items/add', {
    templateUrl: 'add-item.html',
    controller: 'AddItemCtrl as addItemCtrl'
  })
  .when('/items/:id', {
    templateUrl: 'show-item.html',
    controller: 'ShowItemCtrl as showItemCtrl'
  })
  .when('/sign-out', {
    templateUrl: 'sign-out.html',
    controller: 'SignOutCtrl as signOutCtrl'
  });
});