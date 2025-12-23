const { detectCategory } = require('./titleFormatter');

function parseInput(text) {
  text = text.toLowerCase().trim();

  // Normalize natural language
  text = text.replace(/\btonight\b/g, '');
  text = text.replace(/\btomorrow\b/g, 'mai');
  text = text.replace(/\bmorning\b/g, '8-10');
  text = text.replace(/\bafternoon\b/g, '14-16');
  text = text.replace(/\bevening\b/g, '18-20');
  text = text.trim();

  // Extract date if present
  let date = null;
  if (text.startsWith('mai')) {
    date = 'mai';
    text = text.slice(3).trim();
  } else if (/^t[2-7]/i.test(text)) {
    const match = text.match(/^t[2-7]/i);
    date = match[0];
    text = text.slice(2).trim();
  }

  // Split by @ for location
  const parts = text.split('@');
  const main = parts[0].trim();
  const location = parts[1]?.trim();

  // Find time range: \d+(: \d+)?(?:am|pm|h)? \s*-\s* \d+(: \d+)?(?:am|pm|h)?
  const timeMatch = main.match(/(\d+(?::\d+)?(?:am|pm|h)?)\s*-\s*(\d+(?::\d+)?(?:am|pm|h)?)/i);
  if (!timeMatch) return null;

  const startStr = timeMatch[1];
  const endStr = timeMatch[2];
  let title = main.replace(timeMatch[0], '').trim();

  // If title starts with :, remove it
  if (title.startsWith(':')) {
    title = title.slice(1).trim();
  }

  if (!title) {
    console.warn(`No title found in: ${text}`);
    return null;
  }

  // Parse start and end times
  const parseTime = (str) => {
    str = str.toLowerCase().replace('h', '');
    let hour = 0, minute = 0;
    if (str.includes(':')) {
      [hour, minute] = str.split(':').map(Number);
    } else {
      hour = Number(str.replace(/[^\d]/g, ''));
    }
    if (str.includes('pm') && hour !== 12) hour += 12;
    if (str.includes('am') && hour === 12) hour = 0;
    return { hour, minute };
  };

  const start = parseTime(startStr);
  const end = parseTime(endStr);

  const start_time = `${String(start.hour).padStart(2, '0')}:${String(start.minute).padStart(2, '0')}`;
  const end_time = `${String(end.hour).padStart(2, '0')}:${String(end.minute).padStart(2, '0')}`;

  const category = detectCategory(title);

  return {
    title,
    start_time,
    end_time,
    category: category.name,
    emoji: category.emoji,
    location,
    date
  };
}

// New function to parse grouped weekly schedules
function parseGroupedInput(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const events = [];
  let currentTitle = null;

  for (const line of lines) {
    // Check if it's a header (no bullet prefix)
    if (!line.startsWith('-') && !line.startsWith('•') && !line.startsWith('*')) {
      currentTitle = line;
      continue;
    }

    // It's a bullet line
    if (!currentTitle) {
      console.warn(`Bullet line without header: ${line}`);
      continue;
    }

    // Remove bullet prefix
    let bulletContent = line.replace(/^[-•*]\s*/, '');

    // Parse day and time: e.g., "T3, 21:00 - 22:00"
    const dayTimeMatch = bulletContent.match(/^([a-zA-Z0-9]+),\s*(\d+(?::\d+)?)\s*-\s*(\d+(?::\d+)?)/);
    if (!dayTimeMatch) {
      console.warn(`Invalid bullet format: ${line}`);
      continue;
    }

    const dayStr = dayTimeMatch[1].toUpperCase();
    const startTimeStr = dayTimeMatch[2];
    const endTimeStr = dayTimeMatch[3];

    // Map Vietnamese day to weekday number (0=Sunday, 1=Monday, etc.)
    const dayMap = {
      'T2': 1, // Monday
      'T3': 2, // Tuesday
      'T4': 3, // Wednesday
      'T5': 4, // Thursday
      'T6': 5, // Friday
      'T7': 6, // Saturday
      'CN': 0  // Sunday
    };

    const weekday = dayMap[dayStr];
    if (weekday === undefined) {
      console.warn(`Unknown day: ${dayStr} in ${line}`);
      continue;
    }

    // Parse times
    const parseTime = (str) => {
      if (str.includes(':')) {
        const [h, m] = str.split(':').map(Number);
        return { hour: h, minute: m };
      } else {
        return { hour: Number(str), minute: 0 };
      }
    };

    const start = parseTime(startTimeStr);
    const end = parseTime(endTimeStr);

    const start_time = `${String(start.hour).padStart(2, '0')}:${String(start.minute).padStart(2, '0')}`;
    const end_time = `${String(end.hour).padStart(2, '0')}:${String(end.minute).padStart(2, '0')}`;

    const category = detectCategory(currentTitle);

    events.push({
      title: currentTitle,
      start_time,
      end_time,
      category: category.name,
      emoji: category.emoji,
      weekday, // Add weekday for date calculation
      date: null // Will be calculated later
    });
  }

  return events;
}

module.exports = { parseInput, parseGroupedInput };
