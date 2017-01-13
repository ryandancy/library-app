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
.filter('range', () => (input, total) => {
  total = parseInt(total);
  
  for (let i = 0; i < total; i++) {
    input.push(i);
  }
  
  return input;
})
.controller('PatronCtrl', function($scope, $http) {
  // GET the patrons and put in this.patrons
  this.getPatrons = (page = 0) => {
    this.page = page;
    
    $http.get(`/v0/patrons?page=${page}`)
    .then(res => {
      let perPage = 30;
      
      this.patrons = res.data.data;
      this.numPatrons = res.data.maxItems;
      this.maxPage = Math.round(res.data.maxItems / perPage);
      
      if (res.status === 206) {
        let range = res.headers('Range').split('/')[0];
        let [low, high] = range.split('-');
        
        this.lowIndex = parseInt(low);
        this.highIndex = parseInt(high);
      }
    }, () => {
      this.patrons = []; // Error!
    });
  };
  this.getPatrons();
  
  // Handle adding a new patron
  // TODO more error handling
  
  this.adding = false;
  this.patron = {};
  
  this.startAdd = () => {
    this.adding = true;
  };
  
  this.abortAdd = () => {
    this.adding = false;
  };
  
  this.clearAdd = () => {
    this.patron = {}; // BUG only clears valid fields...
  };
  
  this.doAdd = () => {
    $http.post('/v0/patrons', this.patron)
    .then(() => {
      this.adding = false;
      this.patron = {};
      this.getPatrons(this.page);
    }, () => {});
  };
  
  // Handle editing patrons
  
  const PATRON_UNMODIFIABLES = ['created', 'updated', 'id', 'checkouts'];
  
  this.editing = null;
  this.editPatron = {};
  
  this.toggleEdit = patron => {
    if (this.editing) {
      this.editing = null;
    } else {
      this.editing = patron;
    }
    
    this.editPatron = angular.copy(patron);
    for (let unmod of PATRON_UNMODIFIABLES) {
      delete this.editPatron[unmod];
    }
  };
  
  this.saveEdit = () => {
    $http.put(`/v0/patrons/${this.editing.id}`, this.editPatron)
    .then(() => {
      this.editing = false;
      this.editPatron = {};
      this.getPatrons(this.page);
    }, () => {});
  };
});