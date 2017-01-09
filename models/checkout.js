const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const reqt = require('./util/req-types.js');

let checkoutSchema = new Schema({
  dueDate: reqt.Date,
  itemID: reqt.ObjectId,
  patronID: reqt.ObjectId,
  renewals: reqt.Number,
  status: {
    type: String,
    enum: ['onTime', 'late', 'returned', 'lost'],
    required: true
  }
});

module.exports = mongoose.model('Checkout', checkoutSchema);