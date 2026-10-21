# Quiz AI

[![CI](https://github.com/Ziad-Alghawi/nextjs-quiz-ai/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Ziad-Alghawi/nextjs-quiz-ai/actions/workflows/ci.yml)

A study app that turns course PDFs into multiple-choice quizzes. Students organise their material
in courses, generate quizzes from chosen chapters with Google Gemini, practise with instant
feedback and explanations, take course exams and follow their progress over time.

**Live:** https://quiz-ai-gamma.vercel.app (the sample quiz works without an account; payments run
in Stripe test mode: card `4242 4242 4242 4242`)

`main` is the live site; new work is developed on branches and released at planned checkpoints.

![Overview with stats, activity heatmap and quiz list](docs/screenshots/overview.png)

| Course page                                     | Quiz player                                      |
| ----------------------------------------------- | ------------------------------------------------ |
| ![Course page](docs/screenshots/course.png)     | ![Quiz player](docs/screenshots/quiz-player.png) |
| **Results**                                     | **Course exam**                                  |
| ![Results screen](docs/screenshots/results.png) | ![Course exam](docs/screenshots/exam.png)        |

## Features

- **Courses and chapters:** upload PDFs (up to 4 MB each) as chapters of a course. The text is
  extracted and saved; the file itself isn't stored.
- **AI quiz generation:** pick chapters and a question count; Gemini writes questions with four
  options and a short explanation each. The output is validated against a schema before it is saved.
- **Quick quiz:** one PDF straight to a quiz, without setting up a course.
- **Review quiz:** mix questions from 2 to 10 generated quizzes of a course. No AI call, so it is
  instant and doesn't count toward the monthly quota.
- **Quiz player:** one question at a time, keyboard shortcuts (1–4, Enter), the right answer and
  its explanation right after each answer.
- **Results and saved attempts:** score, every answer with the correct one and the explanation.
  Each attempt is saved and can be reopened later from the course page.
- **Practice mistakes:** retry only the questions you got wrong in an attempt.
- **Course exam:** 10, 20 or 30 questions from all quizzes of a course, a question navigator, no
  feedback until you finish. The server scores it; the browser never receives the correct answers.
- **Stats:** quizzes, questions, attempts, average score, streaks and an activity heatmap (keyboard
  accessible, no chart library).
- **Plans and billing:** Free (10 AI quizzes a month, 5–15 questions) and Pro (50 a month, up to
  25 questions), sold through Stripe Checkout and managed in the Stripe billing portal.
- **Accounts:** email and password or Google, password reset and email change with 6-digit codes,
  account deletion that also cancels the subscription.
- A **sample quiz** to try without an account, light and dark mode, and layouts down to phone width.

## Tech stack

| Area      | Choice                                                                                    |
| --------- | ----------------------------------------------------------------------------------------- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions), React 19                      |
| Language  | TypeScript (strict), Zod at every boundary                                                |
| Database  | PostgreSQL 17, Drizzle ORM, committed SQL migrations                                      |
| Auth      | Better Auth: email/password, Google OAuth, database sessions                              |
| AI        | Gemini 3.5 Flash-Lite with one retry on Gemini 3.8 Flash, via LangChain structured output |
| PDF       | unpdf (text extraction on the server)                                                     |
| Payments  | Stripe Checkout, billing portal and webhooks                                              |
| Email     | Nodemailer over SMTP                                                                      |
| UI        | Tailwind CSS 4, Radix UI primitives, lucide icons                                         |
| Quality   | Vitest, ESLint, Prettier, knip, jscpd, GitHub Actions                                     |
| Hosting   | Vercel (app), Supabase (Postgres)                                                         |

## Architecture

```mermaid
flowchart LR
  Browser -->|pages| RSC[Server Components]
  Browser -->|forms| SA[Server Actions]
  Browser -->|PDF upload, generation| API[Route handlers]
  RSC --> Services
  SA --> Services
  API --> Services
  Services[src/server/services] --> DB[(PostgreSQL)]
  Services -->|quiz generation| Gemini[Google Gemini]
  Services --> Stripe
  Stripe -->|signed webhook| API
  Services --> SMTP[Email]
  Browser -->|sign-in| Auth[Better Auth] --> DB
  Auth --> Google[Google OAuth]
```

- **Reads:** Server Components call the services in `src/server/services`.
- **Writes:** Server Actions validate the input with Zod, check the session and call a service.
- **Route handlers** only where plain HTTP is needed: PDF upload and generation, the Stripe
  webhook, auth and `/api/health`.
- **Business logic and every database query** live in the services; components and handlers stay
  thin. Plan limits and question counts have one source of truth, `src/lib/plans.ts`.
- **Generation:** the cheaper model goes first; only an error, an invalid schema or too few
  questions trigger one retry on the stronger model. Answers are shuffled in code, and the text
  sent to the model is capped to bound the cost per quiz.

### Project structure

```text
src/
  app/                  routes (App Router)
    (auth)/             sign-in, sign-up, password reset
    (user)/             signed-in pages: overview, courses, attempts, billing, settings
    quizzes/            quiz and exam players, sample quiz
    actions/            Server Actions (Zod + session check + service call)
    api/                route handlers: uploads, generation, Stripe webhook, auth, health
  server/services/      business logic and database access
  lib/                  plans, env validation, scoring, Zod schemas, pure helpers
  components/           shared components; ui/ holds the primitives
  db/schema.ts          Drizzle schema
drizzle/                SQL migrations
```

## Run it locally

Requirements: Node.js 24 and Docker (the database runs in a container).

```bash
npm install
cp .env.example .env     # fill in the values, see the table below
npm run db:up            # Postgres 17 in Docker
npm run db:migrate       # apply the migrations in drizzle/
npm run dev              # http://localhost:3000
```

With `EMAIL_TRANSPORT=console` (the default), emails such as reset and email-change codes are
printed to the terminal. For the
Stripe webhook, run `stripe listen --forward-to localhost:3000/api/stripe/webhook` and put the
secret it prints into `STRIPE_WEBHOOK_SECRET`.

### Environment variables

They are validated with Zod when the server starts (`src/lib/env.ts`); the SMTP variables are
required only with `EMAIL_TRANSPORT=smtp`.

| Name                    | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection                             |
| `AUTH_SECRET`           | Signs session cookies                             |
| `GOOGLE_CLIENT_ID`      | Google sign-in                                    |
| `GOOGLE_CLIENT_SECRET`  | Google sign-in                                    |
| `GEMINI_API_KEY`        | Quiz generation                                   |
| `STRIPE_SECRET_KEY`     | Checkout and billing portal                       |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe webhook signatures                |
| `STRIPE_PRICE_ID`       | The Pro subscription price (`price_…`)            |
| `APP_URL`               | Public base URL (auth and Stripe return links)    |
| `EMAIL_TRANSPORT`       | `console` (default) or `smtp`                     |
| `SMTP_HOST`             | SMTP server (only with `EMAIL_TRANSPORT=smtp`)    |
| `SMTP_PORT`             | SMTP port (only with `EMAIL_TRANSPORT=smtp`)      |
| `SMTP_USER`             | SMTP account (only with `EMAIL_TRANSPORT=smtp`)   |
| `SMTP_PASSWORD`         | SMTP password (only with `EMAIL_TRANSPORT=smtp`)  |
| `EMAIL_FROM`            | Sender address (only with `EMAIL_TRANSPORT=smtp`) |

## Security and cost control

- **Ownership on every read and write:** someone else's course, quiz or attempt is a 404, the same
  as a missing one, so ids can't be probed.
- **The server scores attempts:** the browser sends only the chosen answer ids; exams never send
  the correct answers to the browser.
- **Payments:** the price comes from server configuration. The webhook verifies Stripe's
  signature, and the subscription status alone decides the plan.
- **Authentication:** scrypt password hashes, database sessions, rate limits on sign-in, sign-up
  and password reset (stored in Postgres, so they work across serverless instances), and the same
  answer for new and existing emails at sign-up.
- **Uploads:** PDF signature and size checked on the server, caps on chapters per course and per
  user, and an upload rate limit.
- **AI cost:** monthly quotas, a burst limit of 3 generations per 10 minutes, a global daily cap,
  and a per-user database lock so parallel requests can't both take the last slot.

## Tests and quality checks

- **Unit tests** (Vitest): validation schemas, scoring, exam and review selection, model routing,
  error mapping, the session helper, the health route and the Stripe webhook (signed payloads).
- **Database tests** against a real Postgres: quotas under parallel requests, courses, chapters,
  reviews, exams, attempts, stats, billing and auth rules.
- **CI** (GitHub Actions, on every push and pull request): lint, format check, typecheck,
  unused-code check (knip), unit tests, migrations plus database tests against Postgres 17, and a
  production build.
- **Duplication** is checked manually with jscpd, at the end of each development phase.

```bash
npm run lint
npm run format:check     # Prettier
npm run typecheck
npm run check:unused     # knip
npm test
npm run test:db          # needs the Docker database
npm run build
npx jscpd@4 src          # duplication report (manual, not in CI)
```

## Roadmap

- Docker image and a Kubernetes deployment
- Guest trial without sign-up
- End-to-end tests with Playwright

## Author

Built by Ziad Alghawi ([GitHub](https://github.com/Ziad-Alghawi)).

## License

[MIT](LICENSE)
