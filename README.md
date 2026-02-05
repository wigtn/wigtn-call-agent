<p align="center">
  <h1 align="center">WIGVO</h1>
  <p align="center"><strong>WIGTN — Voice Only</strong></p>
  <p align="center">전화가 유일한 관문인 서비스를, AI가 대신 뚫어주는 음성 비서</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Prisma-SQLite-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
  <br />
  <img src="https://img.shields.io/badge/OpenAI-GPT--4-412991?logo=openai&logoColor=white" alt="OpenAI" />
  <img src="https://img.shields.io/badge/ElevenLabs-Conversational_AI-000000?logo=elevenlabs&logoColor=white" alt="ElevenLabs" />
  <img src="https://img.shields.io/badge/Twilio-Voice-F22F46?logo=twilio&logoColor=white" alt="Twilio" />
  <br />
  <img src="https://img.shields.io/badge/Hackathon-Cursor_Seoul_2026-F59E0B" alt="Hackathon" />
  <img src="https://img.shields.io/badge/Team-4_members-10B981" alt="Team" />
  <img src="https://img.shields.io/badge/Duration-4_hours-8B5CF6" alt="Duration" />
</p>

---

## Problem: The 'Voice-Only' Barrier

캐치테이블, 네이버 예약이 닿지 않는 **전통적 오프라인 서비스**는 여전히 전화가 유일한 관문입니다.

| 장벽 | 설명 |
|------|------|
| **디지털 파편화** | 부동산 중개소, 수리점, 노포 — 온라인 예약 시스템이 없는 곳이 아직 많음 |
| **심리적 비용** | 거절에 대한 두려움, 복잡한 용건 전달 시 커뮤니케이션 에너지 소모 |
| **정보 비대칭** | 앱에 '광고 중'이지만 실제로는 나간 매물, 확인하려면 전화를 돌려야 하는 비효율 |

## Solution

> 텍스트로 요청을 입력하면, **AI가 실제로 전화를 걸어** 용건을 처리하고 결과를 알려줍니다.

```
사용자 입력                          AI 동작                              결과
──────────────                      ──────                              ────
"강남역 OO빌라 201호              → AI가 중개사에 전화                → "계약 가능,
 아직 있는지 확인해줘"              → "OO빌라 201호 아직 있나요?"       오후 6시 방문 가능"
```

## Demo Flow

| Step | 화면 | 설명 |
|------|------|------|
| 1 | **요청 입력** | "직방에서 본 강남역 OO빌라 201호 아직 있는지 확인해줘" + 중개사 번호 |
| 2 | **AI 파싱** | 대상(OO공인중개사), 매물(201호), 용건(매물 확인) 추출 → 확인 화면 |
| 3 | **전화 발신** | [전화 걸기] 클릭 → AI가 중개사에 전화, 공손한 말투로 대화 |
| 4 | **결과 리포트** | "해당 매물은 계약 가능하며, 오후 6시 방문 가능합니다" |

## Impact

| 영역 | 내용 |
|------|------|
| **사회적 약자 지원** | 콜 포비아, 청각 장애인, 한국어가 서툰 외국인에게 '목소리 비서' 제공 |
| **비즈니스 효율** | 단순 반복 전화 문의를 AI가 처리 → 상호 대기 시간 단축 |
| **확장성** | 부동산 → 긴급 수리 AS → 노포 예약 → 병원 문의 — 전화 관문이 있는 모든 곳 |

## Tech Stack

| Layer | Technology | Role |
|-------|------------|------|
| Frontend | Next.js 16 (App Router) + Tailwind CSS + shadcn/ui | 모바일 우선 UI |
| Backend | Next.js API Routes | REST API |
| Database | SQLite + Prisma ORM | 통화 기록 저장 |
| AI Parsing | OpenAI GPT-4 | 자연어 → 구조화된 데이터 |
| AI Calling | ElevenLabs Conversational AI | 음성 대화 생성 |
| Phone | Twilio | 실제 전화 발신/수신 |

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│   Frontend   │────▶│   API Routes │────▶│   OpenAI GPT-4       │
│   Next.js    │     │   /api/calls │     │   자연어 파싱         │
└──────────────┘     └──────┬───────┘     └──────────────────────┘
                            │
                            ▼
                     ┌──────────────┐     ┌──────────────────────┐
                     │   SQLite     │     │   ElevenLabs + Twilio│
                     │   Prisma     │     │   AI 음성 통화        │
                     └──────────────┘     └──────────────────────┘
```

## Team

| Role | Scope | Branch |
|------|-------|--------|
| **FE1** | 입력/확인 UI | `feat/fe1-input-ui` |
| **FE2** | 통화/결과/기록 UI | `feat/fe2-result-ui` |
| **BE1** | API + DB + Setup Lead | `feat/be1-api` |
| **BE2** | ElevenLabs 연동 | `feat/be2-elevenlabs` |

## Quick Start

### BE1 (리드) — 최초 셋업

```bash
git clone <repo-url>
cd wigtn-call-agent
chmod +x scripts/setup-lead.sh
./scripts/setup-lead.sh
```

### FE1, FE2, BE2 — 멤버 셋업

```bash
git clone <repo-url>
cd wigtn-call-agent
chmod +x scripts/setup-member.sh
./scripts/setup-member.sh
```

> 자세한 셋업 가이드: [scripts/README.md](scripts/README.md)

## Judging Criteria

| 기준 | WIGVO의 대응 |
|------|-------------|
| **실용성** | 부동산 허위매물 확인, 수리 AS 접수 등 전화가 유일한 관문인 실제 문제 해결 |
| **창의성** | 챗봇이 아닌 **실제 음성 통화 대행** — ElevenLabs Conversational AI |
| **완성도** | 입력 → 파싱 → 확인 → 통화 → 결과 풀 플로우 + Mock/실제 통화 모드 |
| **임팩트** | 콜 포비아, 청각 장애, 언어 장벽 등 사회적 약자에게 '목소리 비서' 제공 |

## Project Structure

```
.cursor/
  rules/              # Always Apply rules
    api-contract.mdc   # API 요청/응답 스키마 (SSOT)
    team-workflow.mdc  # 파일 오너십 + 충돌 방지
  commands/            # Cursor slash commands
    fe1-call-agent.md  # /fe1-call-agent
    fe2-call-agent.md  # /fe2-call-agent
    be1-call-agent.md  # /be1-call-agent
    be2-call-agent.md  # /be2-call-agent
docs/
  DEMO-SCRIPT.md       # 2분 데모 시연 대본
  PITCH.md             # 2분 발표 스크립트
scripts/
  setup-lead.sh        # BE1 초기 셋업
  setup-member.sh      # 멤버 셋업
```

## Docs

| Document | Description |
|----------|-------------|
| [Demo Script](docs/DEMO-SCRIPT.md) | 2분 데모 시연 대본 (부동산 매물 확인) |
| [Pitch](docs/PITCH.md) | 2분 발표 스크립트 (심사 기준별 어필) |
| [Setup Guide](scripts/README.md) | Phase 0 셋업 스크립트 사용법 |
| [Cursor Guide](.cursor/README.md) | Cursor AI 설정 구조 + 사용 시나리오 |

## License

This project was built for the **Cursor Seoul Hackathon 2026**.
