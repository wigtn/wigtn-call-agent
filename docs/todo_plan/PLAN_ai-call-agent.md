# Task Plan: AI Call Agent (4시간 해커톤 버전)

> **Generated from**: docs/prd/PRD_ai-call-agent.md
> **Created**: 2026-02-05
> **Updated**: 2026-02-06 (Key fixes applied)
> **Duration**: 4시간
> **Team**: 4명 (FE1, FE2, BE1, BE2)
> **Status**: pending

## Execution Config

| Option | Value | Description |
|--------|-------|-------------|
| `auto_commit` | true | 완료 시 자동 커밋 |
| `commit_per_phase` | true | Phase별 중간 커밋 |
| `quality_gate` | false | 시간 관계상 스킵 |

---

## Key Changes from Original Plan

| # | Change | Reason |
|---|--------|--------|
| 1 | **BE2-1 = Mock mode (mandatory)** | Mock이 되어야 전체 팀이 테스트 가능 |
| 2 | **Polling replaces Webhook** | ngrok 의존성 제거, 로컬 dev 단순화 |
| 3 | **start/route.ts → BE2 전용** | BE1/BE2 ownership 충돌 방지 |
| 4 | **Regex fallback parser** | GPT-4 API 실패 시 대비 |
| 5 | **Polling 3초 간격** | 서버 부하 줄이기 (2초→3초) |

---

## 4시간 타임라인

```
┌─────────────────────────────────────────────────────────────────────┐
│  0:00-0:30   Phase 0: 프로젝트 셋업 (전원)                          │
├─────────────────────────────────────────────────────────────────────┤
│  0:30-2:00   Phase 1: 핵심 기능 개발 (병렬)                         │
│              FE1: 입력/확인 UI                                       │
│              FE2: 결과/상태 UI                                       │
│              BE1: API + DB + Parser                                 │
│              BE2: Mock mode → ElevenLabs 연동                       │
├─────────────────────────────────────────────────────────────────────┤
│  2:00-3:00   Phase 2: 통합 & 연결 (전원)                            │
├─────────────────────────────────────────────────────────────────────┤
│  3:00-3:45   Phase 3: 테스트 & 버그 수정                            │
├─────────────────────────────────────────────────────────────────────┤
│  3:45-4:00   Phase 4: 데모 준비                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Demo 목표

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Demo Flow (2분)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. 사용자가 요청 입력                                               │
│     "내일 오후 3시에 OO미용실 커트 예약해줘"                          │
│     전화번호: 010-1234-5678                                         │
│                                                                     │
│  2. AI가 파싱 → 확인 화면                                            │
│     - 장소: OO미용실                                                 │
│     - 날짜: 내일 오후 3시                                            │
│     - 서비스: 커트                                                   │
│     → [전화 걸기] 버튼                                               │
│                                                                     │
│  3. 통화 중 화면                                                     │
│     - 로딩 애니메이션                                                │
│     - "AI가 전화 중입니다..." (polling every 3s)                     │
│                                                                     │
│  4. 결과 화면                                                        │
│     - "예약이 완료되었습니다!"                                       │
│     - 예약 정보 표시                                                 │
│     - AI 요약 표시                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: 프로젝트 셋업 (0:00-0:30)

> **전원 함께** - 한 명이 리드, 나머지는 환경 확인

### 리더 (BE1) 작업
- [ ] 0.1 Next.js 16 프로젝트 생성
- [ ] 0.2 Tailwind CSS + shadcn/ui 설치
- [ ] 0.3 Prisma 설정 + SQLite
- [ ] 0.4 기본 디렉토리 구조 생성
- [ ] 0.5 환경 변수 템플릿 (.env.example)
- [ ] 0.6 공유 타입 파일 생성 (shared/types.ts)
- [ ] 0.7 Git 초기 커밋 & Push

### 나머지 (FE1, FE2, BE2) 작업
- [ ] 환경 변수 설정 (각자 .env.local)
- [ ] ElevenLabs API 키 확인 (BE2)
- [ ] 역할별 지시서 확인
- [ ] `.cursorrules` 및 `.cursor/rules/` 파일 확인

**체크포인트**: `npm run dev` 실행 → localhost:3000 확인

---

## Phase 1: 핵심 기능 개발 (0:30-2:00)

> **병렬 작업** - 각자 독립적으로 개발

### FE1: 입력/확인 UI

| Task | 설명 | 예상 시간 |
|------|------|----------|
| FE1-1 | 메인 레이아웃 (헤더, 컨테이너) | 10분 |
| FE1-2 | 요청 입력 폼 (textarea + 전화번호) | 25분 |
| FE1-3 | 확인 화면 (파싱된 정보 표시) | 25분 |
| FE1-4 | 폼 유효성 검사 | 15분 |
| FE1-5 | API 연결 준비 (fetch 함수) | 15분 |

**산출물**: `/` 페이지 → 입력 → `/confirm` 페이지

### FE2: 결과/상태 UI

| Task | 설명 | 예상 시간 |
|------|------|----------|
| FE2-1 | 통화 중 화면 (로딩 상태) | 20분 |
| FE2-2 | 결과 화면 - 성공 | 25분 |
| FE2-3 | 결과 화면 - 실패 | 15분 |
| FE2-4 | 통화 기록 목록 (간단히) | 20분 |
| FE2-5 | 폴링으로 상태 업데이트 (3초 간격) | 10분 |

**산출물**: `/calling/[id]` → `/result/[id]` → `/history`

### BE1: API + DB

| Task | 설명 | 예상 시간 |
|------|------|----------|
| BE1-1 | Prisma 스키마 작성 (간소화) | 15분 |
| BE1-2 | DB 마이그레이션 | 5분 |
| BE1-3 | POST /api/calls - 통화 요청 생성 | 25분 |
| BE1-4 | GET /api/calls/[id] - 상태 조회 | 15분 |
| BE1-5 | GET /api/calls - 목록 조회 | 15분 |
| BE1-6 | 자연어 파싱 로직 (GPT-4 + regex fallback) | 15분 |

**산출물**: 동작하는 API 3개 + DB

> **NOTE**: `start/route.ts`는 BE2 전용. BE1은 만들지 않음.

### BE2: ElevenLabs 연동 (Task 순서 변경)

| Task | 설명 | 예상 시간 |
|------|------|----------|
| **BE2-1** | **Mock mode 구현 (필수 최우선)** | **20분** |
| BE2-2 | Agent 생성 (예약용 프롬프트) | 15분 |
| BE2-3 | POST /api/calls/[id]/start (start/route.ts) | 20분 |
| BE2-4 | ElevenLabs Outbound Call API 연동 | 20분 |
| BE2-5 | Polling-based 통화 결과 수집 | 15분 |

**산출물**: Mock 모드로 전체 플로우 동작 + (가능하면) 실제 전화 발신

> **CRITICAL**: BE2-1 Mock mode가 완성되어야 Phase 2 통합 가능.
> Mock이 안 되면 팀 전체가 블로킹됨.

---

## Phase 2: 통합 & 연결 (2:00-3:00)

> **전원 함께** - 페어 프로그래밍

### 통합 작업

| Task | 담당 | 설명 |
|------|------|------|
| INT-1 | FE1 + BE1 | 입력 폼 → API 연결 |
| INT-2 | FE1 + BE1 | 확인 화면 → 파싱 결과 표시 |
| INT-3 | FE2 + BE2 | 통화 중 화면 → 상태 폴링 (3초) |
| INT-4 | FE2 + BE2 | 결과 화면 → 폴링 결과 표시 |
| INT-5 | 전원 | End-to-End 플로우 테스트 (Mock 모드) |

**체크포인트**: 입력 → 확인 → 통화 → 결과 전체 플로우 동작 (Mock)

---

## Phase 3: 테스트 & 버그 수정 (3:00-3:45)

### 테스트 시나리오

| # | 시나리오 | 예상 결과 |
|---|---------|----------|
| 1 | 예약 요청 정상 입력 | 파싱 성공, 확인 화면 표시 |
| 2 | 전화번호 없이 제출 | 에러 메시지 표시 |
| 3 | 전화 걸기 클릭 (Mock) | 통화 중 화면 → 5초 후 결과 |
| 4 | 통화 실패 케이스 | 실패 화면 표시 |
| 5 | ElevenLabs 실제 연동 (optional) | `ELEVENLABS_MOCK=false`로 실제 통화 |

### 버그 수정 우선순위

1. **Critical**: 플로우가 끊기는 버그
2. **High**: UI 깨짐
3. **Low**: 사소한 스타일 이슈 (스킵 가능)

---

## Phase 4: 데모 준비 (3:45-4:00)

- [ ] Mock 모드로 전체 데모 리허설
- [ ] (가능하면) 실제 전화번호 테스트 (팀원 번호)
- [ ] 발표 스크립트 준비 (docs/PITCH.md)
- [ ] 스크린샷/영상 백업 (데모 실패 대비)
- [ ] 데모 시나리오 입력 데이터 준비

---

## 기술 스택 (간소화)

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Next.js API Routes |
| Database | **SQLite** (Prisma) |
| AI 파싱 | OpenAI GPT-4 + regex fallback |
| AI 통화 | ElevenLabs Conversational AI |

---

## 간소화된 DB 스키마

```prisma
model Call {
  id            String    @id @default(cuid())

  // 요청
  requestText   String    // 원본 요청
  requestType   String    // RESERVATION | INQUIRY
  targetName    String    // 장소명
  targetPhone   String    // 전화번호

  // 파싱 결과
  parsedDate    String?   // "2026-02-06"
  parsedTime    String?   // "15:00"
  parsedService String?   // "커트"

  // 통화 결과
  status        String    @default("PENDING") // PENDING, CALLING, IN_PROGRESS, COMPLETED, FAILED
  result        String?   // SUCCESS, NO_ANSWER, REJECTED, ERROR
  summary       String?   // AI 요약

  // ElevenLabs
  conversationId String?

  // 시간
  createdAt     DateTime  @default(now())
  completedAt   DateTime?
}
```

---

## 환경 변수

```bash
# .env.local
DATABASE_URL="file:./dev.db"

# OpenAI (파싱용)
OPENAI_API_KEY=sk-...

# ElevenLabs
ELEVENLABS_API_KEY=...
ELEVENLABS_AGENT_ID=...

# Mock mode (DEFAULT: true)
ELEVENLABS_MOCK=true

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## 스킵하는 기능 (4시간 내 불가)

| 기능 | 이유 |
|------|------|
| 사용자 인증 | 시간 부족, 데모에 불필요 |
| 전화번호 검증 (상세) | 기본 형식만 체크 |
| 녹음 동의 프로세스 | 데모용이므로 스킵 |
| Webhook (ngrok 필요) | **Polling으로 대체** |
| 웹훅 서명 검증 | Webhook 자체를 스킵 |
| 재시도 로직 | 복잡도 증가 |
| 비용 추적 | 데모에 불필요 |
| 통화 기록 검색 | 시간 부족 |
| 다크 모드 | 시간 부족 |

---

## 리스크 & 대응

| 리스크 | 대응 |
|--------|------|
| ElevenLabs 연동 실패 | **Mock 모드가 BE2-1 (최우선)** |
| GPT-4 API 실패 | **Regex fallback parser (BE1-6)** |
| API 키 문제 | 사전에 테스트 필수 |
| 통합 시 충돌 | Git branch 전략 + file-level ownership |
| 시간 부족 | Phase 3 축소, 버그는 "알려진 이슈"로 발표 |

---

## Git 브랜치 전략

```
main
  ├── feat/fe1-input-ui      (FE1)
  ├── feat/fe2-result-ui     (FE2)
  ├── feat/be1-api           (BE1)
  └── feat/be2-elevenlabs    (BE2)
```

**Phase 2 시작 시**: 모든 브랜치 → main 머지

---

## 성공 기준

| 항목 | 기준 |
|------|------|
| **필수** | 입력 → 확인 → 결과 플로우 동작 (Mock 모드) |
| **필수** | Mock mode로 전체 데모 가능 |
| **선택** | ElevenLabs 실제 통화 1회 이상 성공 |
| **선택** | 통화 기록 목록 표시 |
| **선택** | 실패 케이스 처리 |

---

## Commands 파일 위치

각 역할별 Cursor 지시서:
- `.cursor/commands/fe1-call-agent.md`
- `.cursor/commands/fe2-call-agent.md`
- `.cursor/commands/be1-call-agent.md`
- `.cursor/commands/be2-call-agent.md`
