const REGEX =
  /(?:(?<date>mai|T[2-7])\s+)?(?<start>\d{1,2})(?:h)?-(?<end>\d{1,2})(?:h)?\s*:\s*(?<title>[^@]+)(?:@(?<location>.+))?/i;

function parseInput(text) {
  const match = text.match(REGEX);
  if (!match) return null;

  const { date, start, end, title, location } = match.groups;

  return {
    date,
    start: Number(start),
    end: Number(end),
    title: title.trim(),
    location: location?.trim()
  };
}

module.exports = { parseInput };
