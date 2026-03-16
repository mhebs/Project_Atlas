Project Atlas

An OpenClaw-style agent harness for retail investing.

Mission

Build a system that enables semi-active retail investors to define strategy rules — and have an autonomous agent execute those rules intelligently within strict guardrails.

This is not an AI stock picker.
This is not a robo advisor.
This is not automated gambling.

It is a strategy execution harness.

Core Thesis

Retail investors:

Want agency

Do not want to stare at charts all day

Do not want to be fully passive

Struggle with execution (timing, taxes, monitoring, order mechanics)

There is a middle ground between passive index funds and hyperactive trading.

Project Atlas explores that middle ground.

What This Is (and Is Not)
This IS:

A strategy-based execution engine

Deterministic guardrails + constrained autonomy

Transparent reasoning logs

User-defined risk parameters

Execution optimization layer

Behavioral nudging (prevent self-sabotage)

This is NOT:

A black-box AI alpha generator

A meme-stock bot

High-frequency trading

A replacement for financial advice

An RIA (at least not in this phase)

Product Concept

User defines:

Strategy rules

Risk constraints

Capital allocation

Execution preferences (limit orders, tax sensitivity, etc.)

Agent:

Monitors markets continuously

Executes within defined guardrails

Logs reasoning transparently

Nudges user behavior when needed

Architecture (Conceptual)

Strategy Layer
Human-defined rules and objectives.

Risk Layer
Hard constraints (max drawdown, position sizing, stop rules).

Execution Layer
Limit logic, spread optimization, tax-aware sequencing.

Monitoring Layer
Market + event scanning.

Behavioral Layer
Nudges to prevent emotional override.

Audit Layer
Transparent decision logs.

MVP Scope (Phase 1)

Paper trading only.

Limit orders only

Deterministic rule execution

Full reasoning logs

No autonomous strategy creation

No leverage

No options

No margin

This phase proves:

Is execution friction real?

Does automation meaningfully improve discipline?

Do users trust autonomous execution within constraints?

Regulatory Awareness

This project explicitly avoids:

Providing financial advice

Recommending securities

Autonomous discretionary trading on live capital (initially)

Before any real capital deployment, compliance and licensing implications must be fully evaluated.

Current Tech Stack

Next.js (App Router)

React

Tailwind CSS

shadcn/ui

Vercel (deployment)

GitHub (source control)

Development Workflow

UI prototyping via v0

Code iteration via Cursor

Version control via GitHub

Preview deploys via Vercel

Design Philosophy

Clean

Calm

Institutional

No casino aesthetics

Transparency over hype

Guardrails > growth hacks

The agent should feel like a disciplined partner, not a dopamine machine.

## Optional Frontend (Local Dev)

This `Project_Atlas` app is an optional frontend for the CLI-first agent in the parent repo.
It reads local files from the parent workspace:

- `workspace/STRATEGY.md`
- `workspace/PORTFOLIO.md`
- `workspace/USER.md`
- `workspace/sessions/*.json`

The CLI agent continues to work without this frontend.

### Local setup

1. Install dependencies:
   - `cd /Users/armstrongflg/autonomous-investing/Project_Atlas`
   - `npm install`
2. Configure environment:
   - `cp .env.example .env.local`
   - Update `ATLAS_REPO_ROOT` if your repo is in a different location
3. Start the frontend:
   - `npm run dev`

### Notes

- The chat screen sends messages through `POST /api/chat/turn` and renders direct item/delta events from the agent.
- `workspace/sessions/*.json` is used for persistence and reload history, not live streaming.
- Strategy, Portfolio, and User screens are markdown-driven views over the workspace files.

## Claude CLI Runtime Requirements

The agent defaults to `LLM_PROVIDER=claude-cli`.

### Local

1. Install Claude CLI:
   - `npm install -g @anthropic-ai/claude-code`
2. Authenticate:
   - `claude auth login`
3. Verify:
   - `./scripts/claude-preflight.sh`

### Docker

- The container installs Claude CLI and runs preflight at startup.
- Agent startup fails if `claude auth status --json` is not authenticated.
- Provide auth context to the container before running agent jobs.

### CI

- Run `./scripts/ci-claude-preflight.sh` before any agent execution steps.
- The preflight hard-fails CI when Claude CLI is missing or unauthenticated.
