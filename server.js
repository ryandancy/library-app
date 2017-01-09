const express = require('express');
const app = express();
const mongoose = require('mongoose');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const expressValidator = require('express-validator');

const config = require('./config.js');

const baseUri = '/v0';

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

const router = express.Router();

// routes
require('./routes/routes.js')(router, baseUri);

app.use(baseUri, router);

// start the app
app.listen(8080);
console.log('Listening on port 8080'); // eslint-disable-line no-console

module.exports = app;