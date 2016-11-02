var mongoose = require('mongoose');

module.exports = mongoose.model('Checkout', {
  created: Date,
  updated: Date,
  dueDate: Date,
  item: mongoose.Types.ObjectId,
  patron: mongoose.Types.ObjectId,
  renewals: Number,
  status: {
    type: String,
    enum: ['onTime', 'late', 'returned', 'lost']
  }
});