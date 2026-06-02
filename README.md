# SENTRA B2B Lead Intelligence

This is a Next.js B2B lead generation tool powered by AI.

## Getting Started

To run the Next.js development server and the Prisma database viewer (Prisma Studio) simultaneously, use the following single command:

```bash
npm run dev:all
```

- **App:** [http://localhost:3000](http://localhost:3000)
- **Database Viewer:** [http://localhost:5555](http://localhost:5555)

Alternatively, if you only want to run the web application without the database viewer:

```bash
npm run dev
```

## Features

- **Local Business Search**: Uses Serper Places API for local business discovery.
- **Company Intel**: Uses Serper Web Search and Gemini AI for strategic company insights.
- **Decision Makers**: Discovers CEO/founder contacts.
- **AI Scoring**: Evaluates buying intent and prioritizes leads based on your ICP.
