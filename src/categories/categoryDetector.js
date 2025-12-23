const CATEGORIES = require('./categories.config');

function detectCategory(title) {
  const lower = title.toLowerCase();

  // Sort categories by priority descending to ensure higher priority categories are checked first
  // Priority order: Ryan&Mimi (100) > Personal (10) > others (1)
  // This ensures personal care activities (shower, massage, relax, etc.) are always categorized as Ryan&Mimi
  const sortedCategories = [...CATEGORIES].sort((a, b) => b.priority - a.priority);

  for (const cat of sortedCategories) {
    if (cat.keywords.some(k => lower.includes(k))) {
      return cat;
    }
  }

  return { name: 'General', emoji: '🗓️' };
}

module.exports = { detectCategory };