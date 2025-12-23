const { detectCategory } = require('./categoryDetector');

function capitalize(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatEventTitle({ rawTitle }) {
  const cleanTitle = capitalize(rawTitle);
  const category = detectCategory(cleanTitle);

  return `${category.emoji} ${category.name} · ${cleanTitle}`;
}

module.exports = {
  formatEventTitle,
  capitalize,
  pad2
};