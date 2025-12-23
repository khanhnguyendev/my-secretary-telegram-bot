const { formatEventTitle } = require('./categories/titleGenerator');
const { detectCategory } = require('./categories/categoryDetector');

module.exports = {
  formatEventTitle,
  detectCategory
};
