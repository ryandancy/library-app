var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

module.exports = mongoose.model('Checkout', {
  created: {
    type: Date,
    default: Date.now,
    required: true
  },
  updated: {type: Date, required: true},
  dueDate: {type: Date, required: true},
  item: {type: ObjectId, required: true},
  patron: {type: ObjectId, required: true},
  renewals: {type: Number, required: true},
  status: {
    type: String,
    enum: ['onTime', 'late', 'returned', 'lost'],
    required: true
  }
});