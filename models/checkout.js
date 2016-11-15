var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var reqt = require('./util/req-types.js');

module.exports = mongoose.model('Checkout', {
  dueDate: reqt.Date,
  itemID: ObjectId,
  patronID: ObjectId,
  renewals: reqt.Number,
  status: {
    type: reqt.String,
    enum: ['onTime', 'late', 'returned', 'lost']
  }
});