# Calendar Telegram Bot

A Telegram bot that allows you to create, manage, and delete Google Calendar events directly from Telegram chats. It supports event creation with conflict detection, undo functionality, and robust error handling for Google Calendar's API.

## Features

- **Event Creation**: Parse natural language inputs to create events (e.g., "16-18: badminton at court 1").
- **Conflict Detection**: Checks for overlapping events before creation and prompts for confirmation.
- **Undo Support**: Restore recently deleted events with `/undo`.
- **Clear Events**: Delete all bot-created events for a day with `/clear` (with confirmation).
- **Retry Logic**: Handles Google Calendar API conflicts (409 errors) with automatic retries.
- **Multi-User Support**: Restrict access to allowed Telegram user IDs.
- **Logging**: Structured logging with Pino for debugging.

## Prerequisites

- Node.js (v14 or higher)
- A Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- Google Cloud Project with Calendar API enabled
- Service Account Key for Google Calendar access

## Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd my-secretary-telegram-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Google Calendar Setup
1. Create a Google Cloud Project at [console.cloud.google.com](https://console.cloud.google.com).
2. Enable the Google Calendar API.
3. Create a Service Account and download the JSON key.
4. Share your target Google Calendar with the Service Account email (Editor access).
5. Base64-encode the JSON key file:
   ```bash
   base64 -w 0 path/to/service-account.json
   ```

### 4. Environment Configuration
Create a `config.js` file or set environment variables:

```javascript
// config.js
module.exports = {
  BOT_TOKEN: 'your_telegram_bot_token',
  CALENDAR_ID: 'your_google_calendar_id@group.calendar.google.com',
  SERVICE_ACCOUNT_JSON: 'base64_encoded_service_account_json',
  ALLOWED_USERS: [123456789, 987654321], // Array of Telegram user IDs
  TIMEZONE: 'Asia/Ho_Chi_Minh' // Optional, defaults to system timezone
};
```

Or use environment variables:
```bash
export BOT_TOKEN=your_telegram_bot_token
export CALENDAR_ID=your_google_calendar_id
export SERVICE_ACCOUNT_JSON=base64_json
export ALLOWED_USERS=123456789,987654321
```

### 5. Run the Bot
```bash
node src/index.js
```

## Usage

### Creating Events
Send messages in the chat with event details. The bot parses time, title, and location.

**Examples:**
- `16-18: badminton` → Creates an event from 16:00 to 18:00 titled "Badminton".
- `mai 9-10: họp team @Online` → Tomorrow, 9:00-10:00, "Họp Team" at "Online".
- Multiple events:
  ```
  9-10: meeting
  14-15: lunch
  ```

The bot checks for conflicts and prompts if overlaps are detected.

### Commands

- `/clear` - Delete all bot-created events for today (asks for confirmation).
- `/clear tomorrow` - Delete events for tomorrow.
- `/clear YYYY-MM-DD` - Delete events for a specific date.
- `/undo` - Restore the most recently cleared events.

### Permissions
Only users listed in `ALLOWED_USERS` can interact with the bot.

## Input Format Details

- **Time**: `HH-HH` (e.g., `9-10` for 9:00-10:00).
- **Date**: Optional prefix like `mai` (tomorrow), `YYYY-MM-DD`, or omit for today.
- **Title**: Text after `:`, formatted nicely (e.g., "badminton" → "Badminton").
- **Location**: Use `@Location` at the end.

## Troubleshooting

- **Bot not responding**: Check `BOT_TOKEN` and ensure the bot is running.
- **Calendar errors**: Verify `CALENDAR_ID`, Service Account permissions, and API enablement.
- **409 Conflicts**: The bot retries automatically; if persistent, check Google Calendar's eventual consistency.
- **Logs**: Check console output for Pino logs (set `NODE_ENV=development` for detailed stack traces).
