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

// LLM-based title generation (simulated with rules for now)
function generateTitle({ rawTitle, categoryName }) {
  try {
    const lower = rawTitle.toLowerCase().trim();

    switch (categoryName) {
      case 'Study':
        // Format: "<Subject> Study" or "<Subject> Practice"
        // Remove filler words: session, class, lesson, time
        // Keep acronyms uppercase (IELTS, TOEIC)
        let studyTitle = rawTitle.replace(/\b(session|class|lesson|time)\b/gi, '').trim();
        if (studyTitle.toUpperCase().includes('IELTS')) {
          return 'IELTS Study';
        }
        if (studyTitle.toLowerCase().includes('english')) {
          return 'English Practice';
        }
        return studyTitle || 'Study Session';

      case 'Ryan&Mimi':
        // Warm, personal tone, allow dash phrases
        if (lower.includes('couple time')) {
          if (lower.includes('shower')) return 'Couple Time – Shower';
          if (lower.includes('massage')) return 'Couple Time – Massage & Relax';
          return 'Couple Time';
        }
        if (lower.includes('private time')) {
          if (lower.includes('shower')) return 'Private Time – Shower';
          if (lower.includes('massage')) return 'Private Time – Massage & Relax';
          return 'Private Time';
        }
        if (lower.includes('date')) return 'Date Night';
        return capitalize(rawTitle);

      case 'Household':
        // Simple noun phrase
        if (lower.includes('housework')) return 'Housework';
        if (lower.includes('clean')) return 'Cleaning';
        return capitalize(rawTitle);

      case 'Meal':
        // Use meal name only
        if (lower.includes('dinner') || lower.includes('eat')) return 'Dinner';
        if (lower.includes('lunch')) return 'Lunch';
        if (lower.includes('breakfast')) return 'Breakfast';
        return 'Meal';

      default:
        // General: Capitalize and clean input, remove filler words
        return capitalize(rawTitle.replace(/\b(time|session)\b/gi, '').trim());
    }
  } catch (error) {
    console.warn('Title generation failed, using fallback:', error.message);
    return capitalize(rawTitle);
  }
}

function formatEventTitle({ rawTitle }) {
  const category = detectCategory(rawTitle);
  const generatedTitle = generateTitle({ rawTitle, categoryName: category.name });

  return `${category.emoji} ${category.name} · ${generatedTitle}`;
}

module.exports = {
  formatEventTitle,
  capitalize,
  pad2,
  generateTitle
};