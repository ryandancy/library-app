/* global angular */

angular.module('libraryApp')
.controller('PatronCtrl', function($scope, $http) {
  this.perPage = 30;
  this.sortBy = 'created';
  this.sortDir = 'asc';
  
  let computeMaxPage = () => {
    return Math.ceil(this.numPatrons / this.perPage) - 1;
  };
  
  // GET the patrons and put in this.patrons
  this.getPatrons = (page = 0, callback) => {
    this.page = page;
    
    $http.get(`/v0/patrons?page=${page}&per_page=${this.perPage}`
            + `&sort_by=${this.sortBy}&direction=${this.sortDir}`)
    .then(res => {
      this.patrons = res.data.data;
      this.numPatrons = res.data.maxItems;
      this.maxPage = computeMaxPage();
      
      if (res.status === 206) {
        let range = res.headers('Range').split('/')[0];
        let [low, high] = range.split('-');
        
        this.lowIndex = parseInt(low);
        this.highIndex = parseInt(high);
      } else {
        this.lowIndex = 0;
        this.highIndex = this.numPatrons - 1;
      }
      
      if (callback) callback();
    }, () => {
      this.patrons = []; // Error!
    });
  };
  this.getPatrons();
  
  // Handle changing per page and sorting
  
  this.changePerPage = perPage => {
    this.perPage = perPage;
    let newPage = Math.min(this.page, computeMaxPage());
    this.getPatrons(newPage);
  };
  
  this.changeSortBy = sortBy => {
    this.sortBy = sortBy;
    this.getPatrons(this.page);
  };
  
  this.changeSortDir = sortDir => {
    this.sortDir = sortDir;
    this.getPatrons(this.page);
  };
  
  // Handle showing and editing patrons
  
  const PATRON_UNMODIFIABLES = ['created', 'updated', 'id', 'checkouts'];
  
  this.showing = [];
  this.editing = null;
  this.editPatron = {};
  
  this.toggleShow = patron => {
    if (this.showing.includes(patron)) {
      this.showing = this.showing.filter(p => p !== patron);
    } else {
      this.showing.push(patron);
    }
  };
  
  this.startEdit = patron => {
    this.editing = patron;
    this.editPatron = angular.copy(patron);
    for (let unmod of PATRON_UNMODIFIABLES) {
      delete this.editPatron[unmod];
    }
  };
  
  this.abortEdit = () => {
    this.editing = null;
  };
  
  this.saveEdit = () => {
    $http.put(`/v0/patrons/${this.editing.id}`, this.editPatron)
    .then(() => {
      let oldIndex = this.patrons.indexOf(this.editing);
      this.showing = this.showing.splice(oldIndex, 1);
      
      this.editing = false;
      this.editPatron = {};
      this.getPatrons(this.page, () => {
        this.showing.push(this.patrons[oldIndex]);
      });
    }, () => {});
  };
  
  // Handle deleting a patron
  
  this.delPatron = () => {
    $http.delete(`/v0/patrons/${this.editing.id}`)
    .then(() => {
      this.editing = false;
      this.editPatron = {};
      
      if ((this.numPatrons - 1) % this.perPage === 0
          && this.page === this.maxPage
          && this.page > 0) {
        this.getPatrons(this.page - 1);
      } else {
        this.getPatrons(this.page);
      }
    }, () => {});
  };
  
  // Handle deleting ALL THE THINGS
  this.delAll = () => {
    let seriously = confirm('This will delete ALL PATRONS! '
      + 'This cannot be undone! Are you sure you want to do this?');
    if (!seriously) return;
    
    let honestly = confirm('Are you REALLY sure you want to do this?');
    if (!honestly) return;
    
    $http.delete('/v0/patrons')
    .then(() => {
      this.getPatrons(0);
    }, () => {});
  };
});