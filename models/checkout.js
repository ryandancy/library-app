var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var reqt = require('./util/req-types.js');

module.exports = mongoose.model('Checkout', {
  created: {
    type: reqt.Date,
    default: Date.now
  },
  updated: {
    type: reqt.Date,
    default: Date.now
  },
  dueDate: reqt.Date,
  item: reqt.ObjectId,
  patron: reqt.ObjectId,
  renewals: reqt.Number,
  status: {
    type: reqt.String,
    enum: ['onTime', 'late', 'returned', 'lost']
  }
});