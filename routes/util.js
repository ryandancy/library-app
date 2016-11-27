// utilities for routing -- i.e. validation

// helper function for error validation, returns true if validation passed
exports.validate = function(req, res, code = 422) {
  var errors = req.validationErrors();
  if (errors) {
    res.status(code).json(errors);
  }
  return !errors;
};

exports.handleDBError = function(err, res, code = 500) {
  if (err) {
    if (err instanceof Error) {
      err = err.toString();
    }
    res.status(code).send(err);
  }
  return !err;
};