const CATEGORIES = [
  {
    name: 'Sport',
    emoji: '🏸',
    keywords: [
      'badminton',
      'gym',
      'sport',
      'run',
      'running',
      'swimming',
      'yoga',
      'cycling',
      'walk'
    ]
  },
  {
    name: 'Study',
    emoji: '📘',
    keywords: [
      'english',
      'study',
      'learn',
      'course',
      'reading',
      'homework',
      'practice',
      'revision'
    ]
  },
  {
    name: 'Meeting',
    emoji: '📞',
    keywords: [
      'meeting',
      'call',
      'sync',
      'discussion',
      'zoom',
      'team',
      'conference',
      'review'
    ]
  },
  {
    name: 'Personal',
    emoji: '🧠',
    keywords: [
      'personal',
      'rest',
      'family',
      'relax',
      'nap',
      'meditation',
      'shower',
      'eat',
      'meal',
      'break'
    ]
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
      'sinh hoạt',
      'date',
      'anniversary'
    ]
  },
  {
    name: 'Work',
    emoji: '💼',
    keywords: [
      'project',
      'task',
      'work',
      'deadline',
      'coding',
      'development',
      'review',
      'report'
    ]
  },
  {
    name: 'Entertainment',
    emoji: '🎮',
    keywords: [
      'movie',
      'game',
      'netflix',
      'youtube',
      'music',
      'tv',
      'entertainment',
      'hobby'
    ]
  },
  {
    name: 'Travel',
    emoji: '✈️',
    keywords: [
      'travel',
      'trip',
      'flight',
      'holiday',
      'tour',
      'commute',
      'ride'
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

  return `${category.emoji} ${category.name} · ${cleanTitle}`;
}


module.exports = {
  formatEventTitle
};
