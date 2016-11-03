var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

module.exports = mongoose.model('Checkout', {
  created: Date,
  updated: Date,
  dueDate: Date,
  item: ObjectId,
  patron: ObjectId,
  renewals: Number,
  status: {
    type: String,
    enum: ['onTime', 'late', 'returned', 'lost']
  }
});