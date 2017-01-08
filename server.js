var express = require('express');
var app = express();
var mongoose = require('mongoose');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var expressValidator = require('express-validator');

var config = require('./config.js');

var baseUri = '/v0';

// use native ES6 promises
mongoose.Promise = global.Promise;

mongoose.connect(`mongodb://localhost/${config.db}`);

mongoose.plugin(require('mongoose-timestamp'), {
  createdAt: 'created',
  updatedAt: 'updated'
});

// the static directory is /public
app.use(express.static(__dirname + '/public'));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(bodyParser.json());
app.use(bodyParser.text({type: ['text/plain', 'application/marc']}));
app.use(expressValidator({
  customValidators: {
    notPresent: value => {
      return value === undefined;
    }
  }
}));
app.use(methodOverride());

var router = express.Router();

// routes
require('./routes/routes.js')(router, baseUri);

app.use(baseUri, router);

// start the app
app.listen(8080);
console.log('Listening on port 8080'); // eslint-disable-line no-console

module.exports = app;