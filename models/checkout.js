var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;
var Schema = mongoose.Schema;
var reqt = require('./util/req-types.js');

var checkoutSchema = new Schema({
  dueDate: reqt.Date,
  itemID: ObjectId,
  patronID: ObjectId,
  renewals: reqt.Number,
  status: {
    type: String,
    enum: ['onTime', 'late', 'returned', 'lost'],
    required: true
  }
}, {strict: 'throw'});

module.exports = mongoose.model('Checkout', checkoutSchema);