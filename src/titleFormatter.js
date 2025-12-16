const CATEGORIES = [
  {
    name: 'Sport',
    emoji: '🏸',
    keywords: ['badminton', 'gym', 'sport', 'run', 'running']
  },
  {
    name: 'Study',
    emoji: '📘',
    keywords: ['english', 'study', 'learn', 'course']
  },
  {
    name: 'Meeting',
    emoji: '📞',
    keywords: ['meeting', 'call', 'sync', 'discussion']
  },
  {
    name: 'Personal',
    emoji: '🧠',
    keywords: ['personal', 'rest', 'family', 'relax']
  },
  {
    name: 'Private',
    emoji: '💞',
    keywords: [
      'family time',
      'private time',
      'couple',
      'bonding',
      'fb',
      'pt',
      'trả bài',
      'sinh hoạt'
    ]
  }
];

function detectCategory(title) {
  const lower = title.toLowerCase();

  for (const cat of CATEGORIES) {
    if (cat.keywords.some(k => lower.includes(k))) {
      return cat;
    }
  }

  return { name: 'General', emoji: '🗓️', private: false };
}

function capitalize(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^\w/, c => c.toUpperCase());
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatEventTitle({ rawTitle }) {
  const cleanTitle = capitalize(rawTitle);
  const category = detectCategory(cleanTitle);

  return {
    summary: `${category.emoji} ${cleanTitle}`,
    display: `${category.emoji} ${cleanTitle}`,
    visibility: category.name === 'Private' ? 'private' : 'default'
  };
}


module.exports = {
  formatEventTitle
};
