/* global angular */

angular.module('app', [])
.directive('tab', () => ({
  restrict: 'E',
  transclude: true,
  scope: {
    heading: '@'
  },
  require: '^tabset',
  template: '<div role="tabpanel" ng-show="active" ng-transclude></div>',
  link: (scope, elem, attr, tabset) => {
    scope.active = false;
    tabset.addTab(scope);
  }
}))
.directive('tabset', () => ({
  restrict: 'E',
  transclude: true,
  scope: {},
  templateUrl: 'tabset.html',
  bindToController: true,
  controllerAs: 'tabset',
  controller: function() {
    this.tabs = [];
    
    this.addTab = tab => {
      this.tabs.push(tab);
      
      if (this.tabs.length === 1) {
        tab.active = true;
      }
    };
    
    this.select = selectedTab => {
      // Deactivate all other tabs
      for (let tab of this.tabs) {
        if (tab.active && tab !== selectedTab) {
          tab.active = false;
        }
      }
      
      selectedTab.active = true;
    };
  }
}))
.controller('PatronCtrl', function($scope, $http) {
  // GET the patrons and put in this.patrons
  $http.get('/v0/patrons')
  .then(res => {
    this.patrons = res.data.data;
  }, () => {
    this.patrons = []; // Error!
  });
});