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

  // Find time range: \d+(: \d+)?(?:am|pm)? - \d+(: \d+)?(?:am|pm)?
  const timeMatch = main.match(/(\d+(?::\d+)?(?:am|pm)?)-(\d+(?::\d+)?(?:am|pm)?)/i);
  if (!timeMatch) return null;

  const startStr = timeMatch[1];
  const endStr = timeMatch[2];
  const title = main.replace(timeMatch[0], '').trim();

  if (!title) return null;

  // Parse start and end hours (ignore minutes for now, as bot sets minute(0))
  const parseHour = (str) => {
    str = str.toLowerCase();
    let hour = Number(str.replace(/[^\d]/g, ''));
    if (str.includes('pm') && hour !== 12) hour += 12;
    if (str.includes('am') && hour === 12) hour = 0;
    return hour;
  };

  const start = parseHour(startStr);
  const end = parseHour(endStr);

  return {
    date,
    start,
    end,
    title,
    location
  };
}

module.exports = { parseInput };
