// utilities for routing -- i.e. validation

// helper function for error validation, returns true if validation passed
function validate(req, res, code = 422) {
  var errors = req.validationErrors();
  if (errors) {
    res.status(code).json(errors);
  }
  return !errors;
}

function handleDBError(err, res, code = 500) {
  if (err) res.status(code).send(err); // REVIEW will this work?
  return !err;
}