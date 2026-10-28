# Quiz AI

[![CI](https://github.com/Ziad-Alghawi/nextjs-quiz-ai/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Ziad-Alghawi/nextjs-quiz-ai/actions/workflows/ci.yml)
[![Docker](https://github.com/Ziad-Alghawi/nextjs-quiz-ai/actions/workflows/docker.yml/badge.svg?branch=main)](https://github.com/Ziad-Alghawi/nextjs-quiz-ai/actions/workflows/docker.yml)

A study app that turns course PDFs into multiple-choice quizzes. Students organise their material
in courses, generate quizzes from chosen chapters with Google Gemini, practise with instant
feedback and explanations, take course exams and follow their progress over time.

**Live:** https://quiz.ziadalghawi.com ("Try it free" and the sample quiz work without an account;
payments run in Stripe test mode: card `4242 4242 4242 4242`)

![Demo: guest trial, a quiz with explanations, sign-up that keeps the trial, and a share link](docs/demo.gif)

<sub>Recorded on a local production build; the quiz in the demo comes from a mock instead of Gemini.</sub>

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
- **Guest trial:** "Try it free" without an account: up to 3 quizzes from your own PDFs, with 5 or
  10 questions each. Signing up and then signing in on the same device moves the trial quizzes,
  their attempts and their quota use to the account. Guests are deleted after 7 days.
- **Quiz sharing:** a public link for a generated or review quiz, which can be turned off at any
  time. Anyone with the link can play the quiz without an account (results aren't saved, and the
  page isn't indexed); signed-in users can save a copy to their "My quizzes" folder.
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
| Quality   | Vitest, Playwright, ESLint, Prettier, knip, jscpd, GitHub Actions                         |
| Hosting   | Vercel (app), Supabase (Postgres)                                                         |
| DevOps    | Docker, GHCR, Trivy, Helm, kind, Argo CD, Sealed Secrets                                  |

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
  Cron[Vercel Cron] -->|daily guest cleanup| API
  Services --> SMTP[Email]
  Browser -->|sign-in| Auth[Better Auth] --> DB
  Auth --> Google[Google OAuth]
```

- **Reads:** Server Components call the services in `src/server/services`.
- **Writes:** Server Actions validate the input with Zod, check the session and call a service.
- **Route handlers** only where plain HTTP is needed: PDF upload and generation, the Stripe
  webhook, auth, `/api/health` and the daily guest cleanup (`/api/cron/cleanup-guests`, called by
  Vercel Cron in production).
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
    try/                guest trial
    shared/             shared quizzes, playable without an account
    actions/            Server Actions (Zod + session check + service call)
    api/                route handlers: uploads, generation, Stripe webhook, auth, health, cron
  server/services/      business logic and database access
  lib/                  plans, env validation, scoring, Zod schemas, pure helpers
  components/           shared components; ui/ holds the primitives
  db/schema.ts          Drizzle schema
drizzle/                SQL migrations
e2e/                    Playwright end-to-end tests
vercel.json             Vercel Cron: daily guest cleanup
scripts/migrate.ts      migration runner of the migrations image
deploy/                 Kubernetes: local Postgres, sealed env, Helm chart, Argo CD apps
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

| Name                     | Purpose                                           |
| ------------------------ | ------------------------------------------------- |
| `DATABASE_URL`           | PostgreSQL connection                             |
| `AUTH_SECRET`            | Signs session cookies                             |
| `GOOGLE_CLIENT_ID`       | Google sign-in                                    |
| `GOOGLE_CLIENT_SECRET`   | Google sign-in                                    |
| `GEMINI_API_KEY`         | Quiz generation                                   |
| `STRIPE_SECRET_KEY`      | Checkout and billing portal                       |
| `STRIPE_WEBHOOK_SECRET`  | Verifies Stripe webhook signatures                |
| `STRIPE_PRICE_ID`        | The Pro monthly price (`price_…`)                 |
| `STRIPE_YEARLY_PRICE_ID` | The Pro yearly price (`price_…`)                  |
| `APP_URL`                | Public base URL (auth and Stripe return links)    |
| `CRON_SECRET`            | Optional: lets the daily guest cleanup run        |
| `EMAIL_TRANSPORT`        | `console` (default) or `smtp`                     |
| `SMTP_HOST`              | SMTP server (only with `EMAIL_TRANSPORT=smtp`)    |
| `SMTP_PORT`              | SMTP port (only with `EMAIL_TRANSPORT=smtp`)      |
| `SMTP_USER`              | SMTP account (only with `EMAIL_TRANSPORT=smtp`)   |
| `SMTP_PASSWORD`          | SMTP password (only with `EMAIL_TRANSPORT=smtp`)  |
| `EMAIL_FROM`             | Sender address (only with `EMAIL_TRANSPORT=smtp`) |

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
- **Guest trial:** guests can't open account pages or actions (courses, billing, settings,
  sharing) and can't change an email, password or profile. Each guest gets 3 quizzes in total, all
  guests together 5 per day (part of the daily cap), documents are cut at 50,000 characters, and an
  IP address can start 3 guest sessions per hour. The daily guest counter is one row updated in the
  same transaction as the global cap, so new guests and parallel requests can't get past it.
- **Shared quizzes:** a link holds 24 random bytes, not the quiz id; a link that was turned off is
  a 404; exams can't be shared.
- **Cleanup:** the guest cleanup route runs only with `CRON_SECRET` as a Bearer token (compared in
  constant time) and answers 401 without it.

## Tests and quality checks

- **Unit tests** (Vitest): validation schemas, scoring, exam and review selection, model routing,
  error mapping, the session helper, the health route and the Stripe webhook (signed payloads).
- **Database tests** against a real Postgres: quotas under parallel requests, courses, chapters,
  reviews, exams, attempts, stats, billing, auth rules, sharing and the guest trial.
- **End-to-end tests** (Playwright): sign-up and sign-in, course and quiz flows, the sample quiz,
  sharing, saving a copy and the guest trial, against a production build on its own database.
  Quiz generation is mocked and the Gemini and Stripe keys are invalid, so a test can't cost money.
  One account and one guest are signed in once per run and reused, because sign-ins are
  rate-limited per IP address.
- **CI** (GitHub Actions, on every push and pull request): lint, format check, typecheck,
  unused-code check (knip), unit tests, migrations plus database tests against Postgres 17, a
  production build, `helm lint` plus `helm template` for the chart, and the end-to-end tests in
  their own job.
- **Docker workflow:** builds and scans the images; see
  [Containers and Kubernetes](#containers-and-kubernetes).
- **Duplication** is checked manually with jscpd, at the end of each development phase.

```bash
npm run lint
npm run format:check     # Prettier
npm run typecheck
npm run check:unused     # knip
npm test
npm run test:db          # needs the Docker database
npm run test:e2e         # needs Docker; builds the app and starts it on port 3100
npm run build
npx jscpd@4 src          # duplication report (manual, not in CI)
```

## Containers and Kubernetes

Production runs on Vercel and Supabase. The same app is also packaged as container images and
deployed with GitOps to a local Kubernetes cluster (kind).

```mermaid
flowchart LR
  PR[Pull request] --> GH[GitHub]
  GH -->|every push and PR| CI[CI: lint, types, tests, build, helm lint]
  GH -->|PR: build + Trivy scan| DW[Docker workflow]
  DW -->|merge into develop or main| GHCR[(GHCR images)]
  GH -->|main| Vercel[Vercel production] --> Supabase[(Supabase Postgres)]
  subgraph kind[Local cluster: kind]
    Argo[Argo CD] -->|PreSync| Job[Migrations Job]
    Argo --> App[App Deployment]
    Argo --> Cron[Guest cleanup CronJob]
    Cron -->|daily, Bearer CRON_SECRET| App
    Argo --> PG[(Postgres)]
    Argo --> SS[SealedSecret]
    SS -->|Sealed Secrets controller decrypts| Secret[App Secret]
    Secret --> App
    Job --> PG
    App --> PG
  end
  GH -->|deploy/ on develop| Argo
  GHCR -->|images| App
  GHCR -->|images| Job
```

| Image                                         | Contents                                                        |
| --------------------------------------------- | --------------------------------------------------------------- |
| `ghcr.io/ziad-alghawi/nextjs-quiz-ai`         | Next.js standalone server, health check on `/api/health`        |
| `ghcr.io/ziad-alghawi/nextjs-quiz-ai-migrate` | `scripts/migrate.ts` and `drizzle/` (drizzle-orm's `migrate()`) |

- **Images:** multi-stage build on a pinned `node:24-alpine` tag, built without secrets, run as
  the non-root `node` user, no package managers in the final images.
- **Docker workflow:** pull requests build both images and run Trivy, failing on fixable
  CRITICAL/HIGH findings; all findings go to the Security tab. Merges into `develop` and `main`
  push the images, tagged `sha-<commit>` and with the branch name (`latest` from `main`). Every
  action is pinned to a commit SHA, and each job gets only the permissions it needs.
- **Helm chart** (`deploy/helm/quiz-ai`): a migrations Job runs before every install and upgrade
  and waits for the database. Pods use a read-only root filesystem and drop all capabilities.
  Readiness checks `/api/health`, liveness only the port, so a database outage doesn't restart
  pods. A CronJob calls the guest cleanup route once a day through the Service, with
  `CRON_SECRET` from the app's Secret; without it the job fails visibly.
- **Argo CD** (`deploy/argocd`): an AppProject limited to this repository and the `quiz-ai`
  namespace, and two Applications that follow `develop` with automated sync, prune and self-heal.
- **Secrets:** the app's environment is committed as a SealedSecret
  (`deploy/k8s/quiz-ai-env.sealed.yaml`); only the Sealed Secrets controller in the cluster can
  decrypt it. It holds local values only.

### Docker Compose

```bash
cp .env.example .env     # the database URL, APP_URL and email are set by docker-compose.yml
docker compose --profile app up --build   # Postgres, migrations, app on http://localhost:3000
docker compose --profile app down
```

The keys in `.env` only need values in the right format (e.g. `price_…`) for the pages to work;
real keys are needed only for the features that call those services.

### Kubernetes with kind

Requirements: Docker, [kind](https://kind.sigs.k8s.io), kubectl and Helm. Every command names the
cluster's context, so nothing goes to another cluster by mistake.

```bash
kind create cluster --name quiz-ai        # context: kind-quiz-ai
```

`.env.k8s` (git-ignored like every `.env*` file) holds the app's environment, with the keys from `.env.example` and:

```bash
DATABASE_URL=postgres://quiz_ai:quiz_ai@postgres:5432/quiz_ai
APP_URL=http://localhost:3000
EMAIL_TRANSPORT=console
CRON_SECRET=<at least 32 characters, for the guest cleanup CronJob>
```

**With Helm only:**

```bash
kubectl --context kind-quiz-ai create namespace quiz-ai
kubectl --context kind-quiz-ai -n quiz-ai create secret generic quiz-ai-env --from-env-file=.env.k8s
kubectl --context kind-quiz-ai -n quiz-ai apply -f deploy/k8s/postgres.yaml
helm --kube-context kind-quiz-ai -n quiz-ai install quiz-ai deploy/helm/quiz-ai --wait
kubectl --context kind-quiz-ai -n quiz-ai port-forward svc/quiz-ai 3000:80   # http://localhost:3000
```

**With Argo CD and Sealed Secrets:**

```bash
kubectl --context kind-quiz-ai create namespace argocd
kubectl --context kind-quiz-ai -n argocd apply --server-side \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/v3.5.5/manifests/install.yaml
kubectl --context kind-quiz-ai apply \
  -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.40.0/controller.yaml
kubectl --context kind-quiz-ai -n kube-system rollout status deploy/sealed-secrets-controller
```

A SealedSecret can only be decrypted by the cluster whose key sealed it, and every new cluster
gets a new key. So after creating a cluster, seal `.env.k8s` again with
[kubeseal](https://github.com/bitnami-labs/sealed-secrets/releases) and commit the result
(in a fork, also change `repoURL` in `deploy/argocd/*.yaml`):

```bash
kubectl create secret generic quiz-ai-env -n quiz-ai --from-env-file=.env.k8s --dry-run=client -o yaml \
  | kubeseal --context kind-quiz-ai --controller-namespace kube-system \
      --controller-name sealed-secrets-controller --format yaml \
  > deploy/k8s/quiz-ai-env.sealed.yaml
```

Once the new file is on `develop`, apply the project and the two Applications:

```bash
kubectl --context kind-quiz-ai apply -f deploy/argocd/
kubectl --context kind-quiz-ai -n argocd get applications     # Synced / Healthy
```

The Argo CD UI: `kubectl --context kind-quiz-ai -n argocd port-forward svc/argocd-server 8080:443`,
then https://localhost:8080 as `admin` with the password from
`kubectl --context kind-quiz-ai -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d`.

Remove everything with `kind delete cluster --name quiz-ai`.

## Next

- Run the Kubernetes setup on a hosted cluster with a public domain and HTTPS
- NetworkPolicies between the app, the database and the cleanup job
- Metrics and dashboards with Prometheus and Grafana

## Author

Built by Ziad Alghawi ([GitHub](https://github.com/Ziad-Alghawi)).

## License

[MIT](LICENSE)
