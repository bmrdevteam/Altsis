const passport = require('passport');
const local = require('./localStrategy');

module.exports = () => {
    local();
};