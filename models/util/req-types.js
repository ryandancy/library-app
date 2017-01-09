// Types with required property set, to avoid repetition
const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

let types = [String, Number, Boolean, Date, ObjectId];
let reqTypes = {};
for (let type of types) {
  reqTypes[type.name] = {type: type, required: true};
}

module.exports = reqTypes;