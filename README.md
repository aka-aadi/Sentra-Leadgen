# SENTRA LeadGen AI 🚀

An enterprise-grade, AI-powered B2B Lead Generation and Enrichment platform. Sentra automates the entire outbound pipeline—from targeted company search to deep decision-maker extraction, AI scoring, and CRM-ready exports.

![Sentra Dashboard](https://github.com/aka-aadi/Sentra-Leadgen/assets/placeholder.png)

## ✨ Core Features

* **Automated Lead Pipelines:** Define a target (e.g., "SaaS CTOs in New York") and Sentra's engine autonomously searches, aggregates, and extracts relevant businesses.
* **Deep Enrichment Engine:** Integrates with Apollo.io and Google Serper to discover verified emails, phone numbers, LinkedIn profiles, and organizational charts.
* **AI Intelligence (Gemini AI):** Synthesizes recent news, funding data, tech stack, and strategic insights to assign a dynamic `Lead Score` and `Buying Intent`.
* **Superadmin Security:** Built-in secure authentication system to protect your pipeline data and API keys.
* **Stunning UI/UX:** Built with Next.js 16, Tailwind CSS, and Framer Motion. Features a fully adaptive Dark/Light mode with a hardware-accelerated Galaxy Particle engine.
* **Local Database:** Uses high-performance SQLite via Prisma ORM for ultra-fast, local data storage that doesn't expire.

## 🛠 Tech Stack

* **Framework:** Next.js 16 (App Router)
* **Styling:** Tailwind CSS + Framer Motion
* **Database:** SQLite (via Prisma ORM)
* **State Management:** Zustand + React Query
* **Icons:** Lucide React
* **AI/APIs:** Google Gemini AI, Apollo.io, Google Serper

## 🚀 Getting Started (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/aka-aadi/Sentra-Leadgen.git
cd Sentra-Leadgen
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add the following keys:
```env
# Database
DATABASE_URL="file:./dev.db"

# API Keys (Can also be set in the UI Settings panel)
GEMINI_API_KEY="your_gemini_key_here"
SERPER_API_KEY="your_serper_key_here"
APOLLO_API_KEY="your_apollo_key_here"
```

### 4. Initialize Database
Push the Prisma schema to create the local SQLite database:
```bash
npx prisma db push
```

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. 
**Default Login Password:** `Sentra@2026`

## ☁️ Deployment

Sentra is fully containerized and designed to be deployed for **free** on Google Cloud Platform (GCP) using the e2-micro Always Free tier. 

For full, step-by-step CI/CD and Docker deployment instructions, please read our [GCP Deployment Guide](./docs/GCP-DEPLOYMENT.md).

---
*Built with ❤️ for B2B Growth Teams.*
