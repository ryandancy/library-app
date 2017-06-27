/* global angular */

angular.module('libraryApp')
.filter('range', () => (input, total) => {
  total = parseInt(total);
  
  for (let i = 0; i < total; i++) {
    input.push(i);
  }
  
  return input;
});