# AI Call Agent

> 전화가 유일한 관문인 서비스를, AI가 대신 뚫어주는 음성 비서

## Problem: The 'Voice-Only' Barrier

- **디지털 파편화**: 캐치테이블, 네이버 예약이 닿지 않는 **전통적 오프라인 서비스(부동산, 수리점, 노포)**는 여전히 '전화'가 유일한 관문입니다.
- **심리적 비용**: 거절당할지 모르는 상황에서의 전화 시도, 복잡한 요구사항 전달 시 발생하는 **커뮤니케이션 에너지 소모**가 큽니다.
- **정보 비대칭**: 앱에 '광고 중'이지만 실제로는 나간 매물, 확인하려면 전화를 돌려야 하는 비효율.

## Solution

사용자가 텍스트로 요청만 입력하면, AI가 실제로 전화를 걸어 용건을 처리하고 결과를 알려줍니다.

## Demo Flow (부동산 매물 확인)

1. **요청 입력**: "직방에서 본 강남역 OO빌라 201호 아직 있는지 확인해줘" + 중개사 전화번호
2. **AI 파싱**: 장소(OO공인중개사), 매물(OO빌라 201호), 용건(매물 확인) 추출 → 확인 화면 표시
3. **전화 발신**: [전화 걸기] 클릭 → AI가 중개사에 전화, 공손한 말투로 매물 확인
4. **결과 리포트**: "해당 매물은 계약 가능하며, 오후 6시 방문 가능합니다" → 결과 화면에 요약

## Impact: Accessibility for All

- **사회적 약자 지원**: 한국어가 서툰 외국인, 청각 장애인, 콜 포비아를 겪는 현대인에게 '목소리 비서'라는 실질적 도구 제공
- **비즈니스 효율**: 단순 반복적인 전화 문의를 AI가 처리하여 상호 간의 대기 시간을 획기적으로 단축
- **확장성**: 부동산 매물 확인, 긴급 수리 AS 접수, 노포 예약, 병원 문의 등 전화가 유일한 관문인 모든 서비스에 적용 가능

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
| **실용성** (Practicality) | 부동산 허위매물 확인, 수리 AS 접수 등 전화가 유일한 관문인 실제 문제 해결 |
| **창의성** (Creativity) | ElevenLabs Conversational AI로 AI가 직접 전화를 거는 새로운 접근 (챗봇이 아닌 음성 통화 대행) |
| **완성도** (Completeness) | 입력→파싱→확인→통화→결과 풀 플로우 구현 + Mock/실제 통화 모드 지원 |
| **임팩트** (Impact) | 콜 포비아, 청각 장애, 언어 장벽 등 사회적 약자에게 '목소리 비서' 제공 |

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
