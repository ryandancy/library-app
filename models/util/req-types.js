// Types with required property set, to avoid repetition
var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

var types = [String, Number, Boolean, Date, ObjectId];
var reqTypes = {};
for (var type of types) {
  reqTypes[type.name] = {type: type, required: true};
}

module.exports = reqTypes;