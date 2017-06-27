/* global angular */

angular.module('libraryApp', ['ngRoute'])
.config(function($routeProvider) {
  $routeProvider.when('/patrons', {
    templateUrl: 'patron.html',
    controller: 'PatronCtrl as patronCtrl'
  });
});