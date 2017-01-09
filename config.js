// determine configuration (i.e. database location) based on environment
let env = process.env.NODE_ENV || 'development';
let config;
switch (env) {
  case 'production':
    config = {
      db: 'library'
    };
    break;
  case 'test':
    config = {
      db: 'library_test'
    };
    break;
  case 'development':
    config = {
      db: 'library_dev'
    };
    break;
}
module.exports = config;