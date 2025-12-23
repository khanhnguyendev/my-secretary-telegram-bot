const CATEGORIES = require('./categories.config');

function detectCategory(title) {
  const lower = title.toLowerCase();

  // Sort categories by priority descending
  const sortedCategories = [...CATEGORIES].sort((a, b) => b.priority - a.priority);

  for (const cat of sortedCategories) {
    if (cat.keywords.some(k => lower.includes(k))) {
      return cat;
    }
  }

  return { name: 'General', emoji: '🗓️' };
}

module.exports = { detectCategory };