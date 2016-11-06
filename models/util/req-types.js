// types with required property set, to avoid repetition
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = mongoose.Types.ObjectId;

var types = [String, Number, Boolean, Date, ObjectId];
var reqTypes = {};
for (type of types) {
  reqTypes[type.name] = new Schema({type: type, required: true});
}

module.exports = reqTypes;