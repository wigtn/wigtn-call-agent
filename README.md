# AI Call Agent

> AI가 사용자 대신 전화를 걸어 예약/문의를 처리해주는 서비스

## Problem

전화 통화가 어려운 사람들(사회 불안, 언어 장벽, 청각 장애 등)을 위해 AI가 대신 전화해주는 서비스입니다.

## Demo Flow

1. 사용자가 "내일 오후 3시에 OO미용실 커트 예약해줘" 입력
2. AI가 자연어를 파싱하여 확인 화면 표시
3. "전화 걸기" 클릭 → AI가 실제로 전화 발신
4. 통화 완료 → 결과 화면에 예약 정보 + AI 요약 표시

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router) + Tailwind CSS + shadcn/ui |
| Backend | Next.js API Routes |
| Database | SQLite (Prisma ORM) |
| AI Parsing | OpenAI GPT-4 |
| AI Calling | ElevenLabs Conversational AI + Twilio |

## Team Roles

| Role | Scope | Branch |
|------|-------|--------|
| **FE1** | Input/Confirm UI | `feat/fe1-input-ui` |
| **FE2** | Calling/Result/History UI | `feat/fe2-result-ui` |
| **BE1** | API + DB + Setup Lead | `feat/be1-api` |
| **BE2** | ElevenLabs Integration | `feat/be2-elevenlabs` |

## Quick Start

```bash
# Clone & install
git clone <repo-url>
cd wigtn-call-agent
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Run database migration
npx prisma migrate dev --name init

# Start dev server
npm run dev
```

Open http://localhost:3000

## Judging Criteria Alignment

| Criteria | How We Address It |
|----------|-------------------|
| **실용성** (Practicality) | 전화 불안을 가진 실제 사용자 문제 해결 |
| **창의성** (Creativity) | ElevenLabs Conversational AI로 실제 전화 발신하는 새로운 접근 |
| **완성도** (Completeness) | 입력→파싱→확인→통화→결과 풀 플로우 구현 |
| **임팩트** (Impact) | 사회적 약자(전화 불안, 청각 장애, 외국인) 지원 |

## Project Structure

```
docs/               # Documentation
  prd/              # Product Requirements Document
  todo_plan/        # Task plan & quickstart guide
.cursor/            # Cursor AI configuration
  rules/            # Auto-applied rules (api-contract, team-workflow)
  commands/         # Per-role command files
```

## Documentation

- [PRD](docs/prd/PRD_ai-call-agent.md) - Product Requirements
- [Task Plan](docs/todo_plan/PLAN_ai-call-agent.md) - 4-hour hackathon plan
- [Quick Start](docs/todo_plan/QUICKSTART_ai-call-agent.md) - Setup guide
- [Demo Script](docs/DEMO-SCRIPT.md) - 2-min demo flow
- [Pitch](docs/PITCH.md) - Presentation script
