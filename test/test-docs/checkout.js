var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

// HACK using the renewals to keep track of which checkout is which
// NOTE using a placeholder ObjectId because the real one must be filled at
// runtime by a beforeEach hook
var placeholderObjectId = ObjectId('123456789012345678901234');
module.exports = [{
  dueDate: new Date(2017, 5, 16),
  itemID: placeholderObjectId,
  patronID: placeholderObjectId,
  renewals: 0,
  status: 'onTime'
}, {
  dueDate: new Date(2003, 10, 3),
  itemID: placeholderObjectId,
  patronID: placeholderObjectId,
  renewals: 1,
  status: 'late'
}, {
  dueDate: new Date(2013, 1, 25),
  itemID: placeholderObjectId,
  patronID: placeholderObjectId,
  renewals: 2,
  status: 'returned'
}, {
  dueDate: new Date(1998, 9, 4),
  itemID: placeholderObjectId,
  patronID: placeholderObjectId,
  renewals: 3,
  status: 'lost'
}];