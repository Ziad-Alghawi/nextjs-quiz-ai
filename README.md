# Quiz AI

Quiz AI is a full-stack quiz generation platform built around a simple idea: upload a document, let AI turn it into a structured quiz, then track how well you perform over time.

The project started as an AI workflow experiment and gradually became a complete product with authentication, document parsing, quiz generation, submissions, analytics, and subscription billing. Instead of manually writing questions, the app takes uploaded PDF content, extracts the important text, sends it through an LLM pipeline, stores the generated quiz in PostgreSQL, and presents the result through a clean quiz-taking flow.

## What the app does

- Lets users sign up with email and password or sign in with Google.
- Accepts PDF uploads and turns them into quizzes with AI.
- Stores quizzes, questions, answers, and submissions in PostgreSQL.
- Scores submissions on the server and shows the result right away.
- Tracks activity and learning progress in a dashboard.
- Limits quiz generation per month (Free and Pro plans) and sells Pro through Stripe subscriptions.

## Project journey

This project grew in layers:

1. Start with the core quiz experience: upload a file, generate questions, and answer them.
2. Add persistence with Drizzle and PostgreSQL so generated quizzes and submissions are saved.
3. Introduce authentication to give each user a private workspace (first NextAuth, now Better Auth with email/password and Google).
4. Add analytics so users can see quiz volume, question volume, submission count, average score, and activity over time.
5. Add Stripe billing to turn the quiz generator into a gated feature that can be deployed as a real product.
6. Deploy and run the project in production using Vercel.

The result is not just an AI demo. It is a full-stack SaaS-style project that combines product thinking, backend persistence, and external service integration.

## Tech stack

- Next.js 16 (App Router) and React 19
- TypeScript
- Better Auth for authentication (database sessions, rate limits stored in Postgres)
- Tailwind CSS 4 with Radix UI primitives
- LangChain with Google Gemini 2.5 Flash for quiz generation, unpdf for PDF text
- Drizzle ORM with PostgreSQL (Docker locally, Supabase in production)
- Stripe for subscriptions, checkout and the billing portal
- Zod for validation at every boundary
- Nodemailer for sign-in codes (Gmail SMTP)
- Vitest and GitHub Actions for tests and CI
- Vercel for deployment

## Core features

### 1. Authentication

Users sign up with email and password or sign in with Google. A forgotten password is reset with a 6-digit code sent by email, and the settings page changes the name, email and password, connects Google and deletes the account.

### 2. AI-powered quiz generation

Users upload a PDF, the server extracts its text, asks Gemini through LangChain for structured output that is validated with Zod, and stores the quiz in the database. A monthly quota (Free and Pro) and a short burst limit protect the AI budget.

### 3. Quiz experience

Generated quizzes are presented in a step-by-step interface with progress tracking, answer feedback, and a final score summary.

### 4. Dashboard analytics

Each user can review their generated quizzes and see metrics such as:

- Number of quizzes
- Number of questions
- Number of submissions
- Average score
- Submission activity heatmap

### 5. Subscription flow

Stripe Checkout and the billing portal sell the Pro plan. A signed webhook sets the plan from the subscription status.

## Architecture overview

### Frontend

- Next.js App Router pages and layouts
- Client components for upload, quiz interactions, and billing actions
- Shadcn UI components for reusable interface pieces

### Backend

- Route handlers only where HTTP is needed: quiz generation, the Stripe webhook, auth and a health check
- Server Actions for submissions, billing and account settings
- Services in `src/server/services` hold the business logic and all database queries
- Drizzle schema and migrations in `drizzle/`

### External services

- Google OAuth for sign-in
- Gemini API for quiz generation
- Supabase-hosted PostgreSQL for storage
- Stripe for subscriptions and webhook-driven access updates
- Gmail SMTP for password reset and email change codes

## Local development

Requirements: Node.js 20.9 or newer and Docker.

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in the values; the comments in the file explain each one. The server validates them at startup (`src/lib/env.ts`). Emails are printed to the terminal unless `EMAIL_TRANSPORT="smtp"` is set.

### 3. Start the database

```bash
npm run db:up        # Postgres 17 in Docker
npm run db:migrate   # apply the migrations in drizzle/
```

### 4. Run the app

```bash
npm run dev
```

Open http://localhost:3000 in the browser.

### 5. Checks

```bash
npm run lint
npm run typecheck
npm run check:unused   # unused files, exports and dependencies (knip)
npm test               # unit tests
npm run test:db        # database integration tests (needs the Docker database)
npm run build
```

CI runs the same checks on every push.

## Stripe webhook notes

For local development, forward events with the Stripe CLI (`stripe listen --forward-to localhost:3000/api/stripe/webhook`) and put the secret it prints into `STRIPE_WEBHOOK_SECRET`. In production, the webhook must send the `customer.subscription.*` events.

## Database model

The main entities are:

- `user`, `auth_account`, `auth_session`, `auth_verification`, `rate_limit` (Better Auth)
- `quizzes`, `questions`, `answers`
- `quiz_submissions`
- `quiz_generations` (monthly quota)

Together, these tables support authentication, generated quiz content, quotas, and user performance tracking.

## Why this project matters

Quiz AI demonstrates more than UI work. It shows how to combine:

- product-oriented thinking
- AI integration
- backend data modeling
- user authentication
- payment infrastructure
- deployable SaaS architecture

It is the kind of project that reflects both implementation skill and product ownership.
