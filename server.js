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

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(expressValidator({
  customSanitizers: {
    setDefault: function(value, defaultValue) {
      return value === undefined ? defaultValue : value;
    }
  }
}));
app.use(methodOverride());

var router = express.Router();

// routes
require('routes/routes.js')(router, baseUri);

app.use(baseUri, router);

// start the app
app.listen(8080);