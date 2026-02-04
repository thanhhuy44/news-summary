# News Crons

A Node.js application that automatically fetches and summarizes news articles from different categories and sends them to a Telegram channel using AI-powered summaries.

## Features

- Fetches news articles from multiple categories (Sports, Technology, Health)
- Uses Google's Gemini AI to generate concise summaries
- Sends formatted news updates to a Telegram channel
- RESTful API endpoints for manual triggering
- Configurable number of news articles per category

## Prerequisites

- Node.js (v16 or higher)
- Bun package manager
- Telegram Bot Token
- Google Gemini API Key

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=#
CRON_SOURCE_DOMAIN=https://znews.vn
MONGODB_URI=mongodb://localhost:27017/news-crons
TELEGRAM_BOT_TOKEN=#
TELEGRAM_CHAT_ID=#
GEMINI_API_KEY=#
GEMINI_MODEL=#
```

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd news-crons
```

1. Install dependencies:

```bash
bun install
```

1. Build the project:

```bash
bun run build
```

## Usage

### Development

```bash
bun run dev
```

### Production

```bash
bun run start
```

## API Endpoints

- `GET /`: Health check endpoint
- `GET /scrap`: Trigger news fetching for a specific category
  - Available categories: `the-thao`, `cong-nghe`, `suc-khoe`
- `GET /summarize`: Summary content of article

## Technologies Used

- TypeScript
- Express.js
- Cheerio (for web scraping)
- Google Gemini AI
- Node Telegram Bot API
- Axios
- Dotenv

## Project Structure

```
news-crons/
├── configs/         # Configuration files
├── dist/           # Compiled JavaScript files
├── node_modules/   # Dependencies
├── index.ts        # Main application file
├── package.json    # Project configuration
├── tsconfig.json   # TypeScript configuration
└── vercel.json     # Vercel deployment configuration
```

## License

Private - All rights reserved