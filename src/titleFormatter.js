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
      'revision',
      'class',
      'lesson',
      'ielts',
      'learning',
      'học',
      'lớp'
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
    name: 'Ryan&Mimi',
    emoji: '💞',
    keywords: [
      'family time',
      'private time',
      'private time (Shower)',
      'private time (Massage)',
      'couple',
      'couple time',
      'couple time (Shower)',
      'couple time (Massage)',
      'date night',
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
    name: 'Household',
    emoji: '🏠',
    keywords: [
      'clean',
      'cleaning',
      'dọn',
      'rửa',
      'xếp',
      'quần áo',
      'chén',
      'nhà cửa',
      'dọn dẹp',
      'laundry',
      'wash',
      'fold',
      'tidy',
      'housework'
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
  detectCategory
};
