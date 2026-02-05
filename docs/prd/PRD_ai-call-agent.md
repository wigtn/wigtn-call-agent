# AI Call Agent PRD

> **Version**: 1.1
> **Created**: 2026-02-05
> **Updated**: 2026-02-05 (Digging Review 반영)
> **Status**: Draft

## 1. Overview

### 1.1 Problem Statement

전화 통화가 어려운 사람들(사회 불안, 언어 장벽, 청각 장애 등)은 예약이나 문의 전화를 하는 데 큰 부담을 느낍니다. 간단한 미용실 예약, 식당 예약, 영업시간 문의 등도 전화를 해야 할 때 스트레스를 받습니다.

**"전화 대신 AI가 대신 걸어주는 서비스"**가 필요합니다.

### 1.2 Goals

- 사용자가 요청만 입력하면 AI가 대신 전화해서 예약/문의 처리
- ElevenLabs Conversational AI를 활용한 자연스러운 AI 음성 통화
- 통화 완료 후 결과를 사용자에게 명확하게 전달
- 전화 통화 부담 없이 일상적인 예약/문의 해결

### 1.3 Non-Goals (Out of Scope)

- 실시간 사용자 개입 (통화 중 타이핑으로 대화 참여)
- 복잡한 협상이 필요한 통화 (가격 협상, 클레임 등)
- 긴급 전화 (112, 119 등)
- 개인 민감 정보가 필요한 통화 (금융, 의료 상담)

### 1.4 Scope

| 포함 | 제외 |
|------|------|
| 예약 전화 (미용실, 식당, 병원 등) | 금융/보험 관련 전화 |
| 간단한 문의 (영업시간, 위치, 가격) | 복잡한 상담/협상 |
| 한국어 통화 | 다국어 동시 지원 |
| 통화 결과 알림 | 실시간 통화 모니터링 |
| 통화 녹음 및 요약 | 장기 녹음 보관 (30일+) |

---

## 2. User Stories

### 2.1 Primary User

**페르소나**: 전화 통화가 불편한 사람
- 사회 불안이 있어 전화가 부담스러운 직장인
- 청각이 불편하거나 말하기 어려운 장애인
- 한국어 통화가 익숙하지 않은 외국인

As a **전화 통화가 불편한 사용자**,
I want to **원하는 예약/문의 내용을 입력하면 AI가 대신 전화해주길**
so that **전화 스트레스 없이 예약과 문의를 처리할 수 있다**.

### 2.2 User Stories

| ID | Story | Priority |
|----|-------|----------|
| US-001 | 사용자로서, 예약 요청을 입력하면 AI가 대신 전화해서 예약해준다 | P0 |
| US-002 | 사용자로서, 문의 내용을 입력하면 AI가 대신 전화해서 답변을 받아온다 | P0 |
| US-003 | 사용자로서, AI 통화가 끝나면 결과를 알림으로 받는다 | P0 |
| US-004 | 사용자로서, 통화 내용 요약을 확인할 수 있다 | P0 |
| US-005 | 사용자로서, 통화 녹음을 다시 들을 수 있다 | P1 |
| US-006 | 사용자로서, 이전 통화 기록을 확인할 수 있다 | P1 |
| US-007 | 사용자로서, 자주 전화하는 곳을 저장해둘 수 있다 | P2 |

### 2.3 Acceptance Criteria (Gherkin)

```gherkin
Scenario: 미용실 예약 대행
  Given 사용자가 로그인되어 있다
  When "강남 OO미용실에 내일 오후 3시에 커트 예약해줘"라고 요청한다
  Then AI가 전화번호를 확인하고 (없으면 검색 제안)
  And AI가 미용실에 전화를 건다
  And AI가 "내일 오후 3시 커트 예약" 목표로 대화한다
  And 예약 성공/실패 결과가 사용자에게 알림된다
  And 통화 요약이 저장된다

Scenario: 영업시간 문의 대행
  Given 사용자가 로그인되어 있다
  When "XX식당 영업시간 알려줘"라고 요청한다
  Then AI가 식당에 전화를 건다
  And AI가 영업시간을 문의한다
  And "평일 11시-22시, 주말 12시-21시"와 같은 정보가 사용자에게 전달된다

Scenario: 통화 실패 처리
  Given AI가 전화를 시도한다
  When 3회 시도 후에도 연결되지 않는다
  Then "연결되지 않았습니다. 다시 시도하시겠습니까?" 알림이 전송된다
  And 사용자는 재시도 또는 취소를 선택할 수 있다
```

---

## 3. Functional Requirements

| ID | Requirement | Priority | Dependencies |
|----|-------------|----------|--------------|
| **요청 입력** | | | |
| FR-001 | 자연어로 예약/문의 요청 입력 | P0 | - |
| FR-002 | 전화번호 직접 입력 또는 검색 연동 | P0 | FR-001 |
| FR-002-1 | **전화번호 형식 검증 (E.164, 한국 번호 패턴)** | P0 | FR-002 |
| FR-002-2 | **긴급번호 차단 (112, 119, 110 등)** | P0 | FR-002 |
| FR-003 | 요청 유형 자동 분류 (예약/문의) | P0 | FR-001 |
| FR-004 | 요청 내용 확인 및 수정 | P0 | FR-001 |
| FR-004-1 | **대기 중인 요청 취소** | P0 | FR-001 |
| **AI 통화** | | | |
| FR-005 | ElevenLabs Conversational AI로 전화 발신 | P0 | FR-001, FR-002 |
| FR-006 | 목표 기반 자율 대화 (예약 성공까지) | P0 | FR-005 |
| FR-007 | 상대방 응답에 맥락 맞게 대응 | P0 | FR-005 |
| FR-008 | 통화 녹음 (동의 안내 후) | P0 | FR-005 |
| FR-008-1 | **녹음 동의 안내 자동 재생** | P0 | FR-008 |
| FR-008-2 | **녹음 동의 여부 저장** | P0 | FR-008 |
| FR-009 | 통화 실패 시 자동 재시도 (최대 3회) | P1 | FR-005 |
| FR-009-1 | **통화 예외 처리 (끊김, 인식 실패, 음성메일)** | P0 | FR-005 |
| FR-009-2 | **통화 중 요청 취소 (진행 중인 통화 종료)** | P1 | FR-005 |
| **결과 처리** | | | |
| FR-010 | 통화 완료 시 결과 알림 (성공/실패/부분성공) | P0 | FR-005 |
| FR-010-1 | **부분 성공 시 대안 확정 플로우** | P1 | FR-010 |
| FR-011 | 통화 내용 AI 요약 생성 | P0 | FR-008 |
| FR-012 | 예약 정보 구조화 저장 (날짜, 시간, 장소 등) | P0 | FR-006 |
| FR-013 | 문의 결과 구조화 저장 (질문, 답변) | P0 | FR-006 |
| **기록 관리** | | | |
| FR-014 | 통화 기록 목록 조회 | P1 | FR-010 |
| FR-015 | 통화 상세 조회 (요약, 녹음, 전문) | P1 | FR-011 |
| FR-016 | 자주 사용하는 장소 저장 | P2 | - |
| **비용 관리** | | | |
| FR-017 | **사용자별 통화 비용 추적** | P1 | FR-005 |
| FR-018 | **일일/월간 사용 한도 설정 및 알림** | P1 | FR-017 |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric | Target | Description |
|--------|--------|-------------|
| 통화 시작 시간 | < 30초 | 요청 제출 → 전화 발신 |
| 평균 통화 시간 | < 3분 | 예약/문의 1건 기준 |
| 결과 알림 | < 1분 | 통화 종료 → 알림 수신 |

### 4.2 Security

| Item | Requirement |
|------|-------------|
| 인증 | 이메일/비밀번호 기반 로그인 |
| API 키 | ElevenLabs/Twilio 키 서버 환경변수 |
| 통화 녹음 | 암호화 저장 (AES-256), 동의 안내 필수 |
| 데이터 전송 | HTTPS (TLS 1.3) |

#### 4.2.1 비밀번호 정책

| 항목 | 정책 |
|------|------|
| 최소 길이 | 8자 이상 |
| 복잡도 | 영문 + 숫자 필수 |
| 로그인 실패 | 5회 실패 시 15분 계정 잠금 |

#### 4.2.2 Rate Limiting

| API | Limit | Window |
|-----|-------|--------|
| POST /api/v1/calls (통화 요청) | 5회 | 시간당 |
| 전체 API | 100회 | 분당 |

#### 4.2.3 세션 관리

| 항목 | 정책 |
|------|------|
| 세션 만료 | 24시간 (활동 시 갱신) |
| 동시 로그인 | 최대 3개 디바이스 |
| 토큰 만료 | Access Token 1시간, Refresh Token 7일 |
| 강제 로그아웃 | 비밀번호 변경 시 전체 세션 무효화 |

#### 4.2.4 전화번호 검증 정책

| 항목 | 정책 |
|------|------|
| 형식 | E.164 국제 형식 (+821012345678) |
| 한국 번호 패턴 | 010, 02-06x, 07x 허용 |
| 금지 번호 | 112, 119, 110, 114, 1644-xxxx, 15xx-xxxx 등 |
| 검증 시점 | 요청 생성 시 + 발신 직전 |

#### 4.2.5 통화 녹음 동의 프로세스

| 단계 | 처리 |
|------|------|
| 1. 통화 연결 | 자동 안내: "이 통화는 서비스 품질을 위해 녹음됩니다" |
| 2. 상대방 반응 | 끊거나 거부 의사 표현 시 녹음 중단 |
| 3. 동의 여부 저장 | `recordingConsent` 필드에 기록 |
| 4. 미동의 통화 | 녹음 URL null 처리, transcript만 저장 |

> ⚠️ **법적 근거**: 한국 통신비밀보호법에 따라 통화 녹음 시 상대방에게 고지 필수

### 4.3 Usability

- 3단계 이내 요청 완료 (요청 입력 → 확인 → 전송)
- 직관적인 결과 표시 (성공/실패 명확히)
- 모바일 반응형 지원

### 4.4 Reliability

- 서비스 가용성: 99%
- 통화 실패 시 자동 재시도 (최대 3회)
- 통화 기록 보관: 30일

### 4.5 비용 관리

| 항목 | 정책 |
|------|------|
| 사용자별 일일 한도 | 10통화 또는 $5 |
| 사용자별 월간 한도 | 50통화 또는 $25 |
| 한도 도달 시 | 알림 + 추가 통화 차단 |
| 비용 표시 | 각 통화 결과에 예상 비용 표시 |
| 사전 안내 | 통화 요청 확인 화면에 예상 비용 표시 |

**예상 통화당 비용**:
| 항목 | 비용 |
|------|------|
| ElevenLabs Conversational AI | ~$0.10-0.20/분 |
| Twilio 발신 (한국) | ~$0.04/분 |
| **예상 총 비용** | **~$0.15-0.25/분** |

---

## 5. Technical Design

### 5.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │   │
│  │  │  요청 입력    │  │  결과 대시보드 │  │   통화 기록      │  │   │
│  │  │  (예약/문의)  │  │  (성공/실패)  │  │   (히스토리)    │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              │ REST API                             │
│                              ▼                                      │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Backend (Next.js API Routes)                     │
│  ┌───────────────┐  ┌─────────────────┐  ┌───────────────────┐    │
│  │ Call Manager  │  │  Result Handler │  │  Notification     │    │
│  │ (요청 처리)    │  │  (결과 처리)    │  │  (알림 전송)      │    │
│  └───────┬───────┘  └────────┬────────┘  └─────────┬─────────┘    │
└──────────┼───────────────────┼─────────────────────┼────────────────┘
           │                   │                     │
           ▼                   │                     │
┌──────────────────────────────┴─────────────────────┴────────────────┐
│                                                                     │
│              ElevenLabs Conversational AI Platform                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐ │   │
│  │   │  Agent  │ →  │   ASR   │ →  │   LLM   │ →  │   TTS   │ │   │
│  │   │ (프롬프트)│    │ (음성인식)│    │ (대화)  │    │ (음성) │ │   │
│  │   └─────────┘    └─────────┘    └─────────┘    └─────────┘ │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              │ Twilio Integration                   │
│                              ▼                                      │
│                       ┌──────────────┐                              │
│                       │   상대방     │                              │
│                       │ (미용실 등)  │                              │
│                       └──────────────┘                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │   Database   │
                        │ (PostgreSQL) │
                        └──────────────┘
```

### 5.2 ElevenLabs Conversational AI 활용

**핵심**: ElevenLabs가 TTS/STT/대화 로직을 모두 처리

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI Call Agent Flow                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. 사용자 요청                                                      │
│     "내일 오후 3시에 OO미용실 커트 예약해줘"                           │
│     ↓                                                               │
│  2. 요청 파싱 & Agent 설정                                           │
│     - 목표: 예약                                                     │
│     - 장소: OO미용실                                                 │
│     - 날짜: 내일 오후 3시                                            │
│     - 서비스: 커트                                                   │
│     ↓                                                               │
│  3. ElevenLabs Outbound Call API 호출                               │
│     agent_id: "reservation-agent"                                   │
│     to_number: "+821012345678"                                      │
│     conversation_initiation_client_data: {                          │
│       goal: "예약",                                                  │
│       date: "내일 오후 3시",                                         │
│       service: "커트",                                               │
│       customer_name: "홍길동"                                        │
│     }                                                               │
│     ↓                                                               │
│  4. AI Agent 자율 대화                                               │
│     AI: "안녕하세요, 예약 문의 드립니다. 내일 오후 3시에             │
│          커트 예약 가능할까요?"                                       │
│     상대방: "네, 가능합니다. 성함이 어떻게 되세요?"                   │
│     AI: "홍길동입니다."                                              │
│     상대방: "네, 예약 완료되었습니다."                                │
│     AI: "감사합니다. 안녕히 계세요."                                  │
│     ↓                                                               │
│  5. 결과 처리                                                        │
│     - 통화 성공 여부 판단                                            │
│     - 예약 정보 추출 (날짜, 시간, 확정 여부)                          │
│     - AI 요약 생성                                                   │
│     ↓                                                               │
│  6. 사용자 알림                                                      │
│     "예약이 완료되었습니다!                                          │
│      장소: OO미용실                                                  │
│      일시: 내일(2/6) 오후 3시                                        │
│      서비스: 커트"                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 통화 예외 처리

| 상황 | 처리 방식 |
|------|----------|
| API 호출 실패 | 30초 후 자동 재시도 (최대 3회) |
| 통화 중 상대방 끊음 | CallResult=REJECTED, 사용자에게 알림 |
| 음성 인식 실패 (연속 3회) | "죄송합니다, 다시 말씀해 주시겠어요?" 재시도 |
| 음성 인식 실패 (연속 5회) | 통화 종료, CallResult=ERROR, 직접 통화 안내 |
| 음성메일 감지 | 메시지 남기기 또는 재시도 (사용자 설정에 따라) |
| 부재중 (30초 무응답) | CallResult=NO_ANSWER, 재시도 큐에 추가 |
| 통화중 (BUSY) | CallResult=BUSY, 5분 후 자동 재시도 |
| 상대방 이해 불가 | "혹시 ~라는 말씀이실까요?" 확인 질문 |

**재시도 정책**:
```
시도 1 → 실패 → 30초 대기 → 시도 2 → 실패 → 1분 대기 → 시도 3 → 실패 → 사용자 알림
```

### 5.4 알림 시스템

**알림 채널 우선순위**:
| 채널 | 조건 | 우선순위 |
|------|------|----------|
| Web Push | 브라우저 열린 상태 | 1순위 |
| 인앱 알림 | 항상 | 기본 |
| 이메일 | Web Push 실패 시 | 2순위 |

**알림 내용**:
| 결과 | 포함 정보 |
|------|----------|
| SUCCESS | 예약 확정 정보, 장소, 일시, 캘린더 추가 버튼 |
| PARTIAL_SUCCESS | 대안 정보, 확인/거절 버튼 |
| FAILED | 실패 사유, 재시도 버튼 |
| NO_ANSWER | 부재중 안내, 재시도 버튼 |

**부분 성공(PARTIAL_SUCCESS) 처리 플로우**:
1. AI가 대안 시간 제안받음 → PARTIAL_SUCCESS 저장
2. 사용자에게 "대안 시간: 오후 4시 - 수락하시겠습니까?" 알림
3. 사용자 수락 시 → SUCCESS로 변경
4. 사용자 거절 시 → 기록 종료 또는 재통화 선택

### 5.5 Tech Stack

| Layer | Technology | Reason |
|-------|------------|--------|
| Frontend | Next.js 16 (App Router) | SSR, React Server Components |
| Styling | Tailwind CSS + shadcn/ui | 빠른 개발 |
| Backend | Next.js API Routes | 풀스택 단일 배포 |
| Database | PostgreSQL | 안정성, 확장성 |
| ORM | Prisma | 타입 안전성 |
| 인증 | NextAuth.js | 간편한 인증 |
| **AI 통화** | **ElevenLabs Conversational AI** | 자율 대화 에이전트 |
| **전화 연동** | **ElevenLabs + Twilio** | Outbound Call API |
| AI 요약 | ElevenLabs 내장 or OpenAI | 통화 요약 |
| 알림 | Web Push / Email | 결과 알림 |

### 5.4 Database Schema

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String    // hashed
  name          String?
  createdAt     DateTime  @default(now())
  calls         Call[]
  savedPlaces   SavedPlace[]
}

model SavedPlace {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  name        String    // "단골 미용실"
  phoneNumber String
  address     String?
  category    PlaceCategory
  notes       String?   // 메모 (단골 직원 이름 등)
  createdAt   DateTime  @default(now())
}

model Call {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])

  // 요청 정보
  requestType     RequestType   // RESERVATION | INQUIRY
  requestText     String        // 원본 요청 텍스트
  targetName      String        // "OO미용실"
  targetPhone     String

  // 예약 상세 (RESERVATION인 경우)
  reservationDate DateTime?
  reservationTime String?       // "오후 3시"
  serviceName     String?       // "커트"

  // 문의 상세 (INQUIRY인 경우)
  inquiryQuestion String?       // "영업시간이 어떻게 되나요?"
  inquiryAnswer   String?       // "평일 10시-22시입니다"

  // 통화 결과
  status          CallStatus    @default(PENDING)
  result          CallResult?
  resultDetail    String?       // 상세 결과 메시지

  // ElevenLabs 연동
  elevenLabsConversationId String?
  twilioCallSid   String?

  // 녹음 및 요약
  recordingUrl    String?
  recordingConsent Boolean  @default(false) // 녹음 동의 여부
  transcript      String?       // 통화 전문
  summary         String?       // AI 요약

  // 재시도 추적
  attempts        Int       @default(0)  // 시도 횟수
  lastAttemptAt   DateTime? // 마지막 시도 시간

  // 비용
  duration        Int?          // 초 단위
  cost            Float?        // USD

  // 시간
  createdAt       DateTime  @default(now())
  startedAt       DateTime?
  endedAt         DateTime?
}

enum RequestType {
  RESERVATION   // 예약
  INQUIRY       // 문의
}

enum CallStatus {
  PENDING       // 대기 중
  CALLING       // 발신 중
  IN_PROGRESS   // 통화 중
  COMPLETED     // 완료
  FAILED        // 실패
  CANCELLED     // 취소됨
}

enum CallResult {
  SUCCESS           // 성공 (예약 완료 / 문의 답변 받음)
  PARTIAL_SUCCESS   // 부분 성공 (희망 시간 불가, 대안 제시됨)
  NO_ANSWER         // 부재중
  BUSY              // 통화중
  REJECTED          // 거절됨 (예약 불가 등)
  ERROR             // 시스템 오류
}

enum PlaceCategory {
  BEAUTY        // 미용실
  RESTAURANT    // 식당
  HOSPITAL      // 병원
  CAFE          // 카페
  OTHER         // 기타
}
```

### 5.5 API Specification

---

#### API: 통화 요청 생성

##### `POST /api/v1/calls`

**Description**: 새로운 AI 통화 요청 생성

**Authentication**: Required (Bearer Token)

**Request Body**:
```json
{
  "requestText": "string (required) - 자연어 요청, 예: '내일 오후 3시에 OO미용실 커트 예약해줘'",
  "targetPhone": "string (optional) - 전화번호 (없으면 검색 필요)",
  "targetName": "string (optional) - 장소 이름"
}
```

**Request Example**:
```json
{
  "requestText": "내일 오후 3시에 강남 OO미용실에 커트 예약해줘",
  "targetPhone": "+821012345678",
  "targetName": "OO미용실"
}
```

**Response 201 Created**:
```json
{
  "success": true,
  "data": {
    "callId": "string - 통화 ID",
    "status": "PENDING",
    "parsedRequest": {
      "type": "RESERVATION",
      "targetName": "OO미용실",
      "targetPhone": "+821012345678",
      "date": "2026-02-06",
      "time": "15:00",
      "service": "커트"
    },
    "estimatedStartTime": "string (ISO 8601) - 예상 통화 시작 시간"
  }
}
```

**Error Responses**:
| Status | Code | Message | Description |
|--------|------|---------|-------------|
| 400 | INVALID_REQUEST | Cannot parse request | 요청 파싱 실패 |
| 400 | MISSING_PHONE | Phone number required | 전화번호 누락 |
| 400 | EMERGENCY_NUMBER | Emergency numbers not allowed | 긴급 전화 차단 |
| 429 | RATE_LIMITED | Too many requests | Rate limit 초과 |

---

#### API: 통화 상태 조회

##### `GET /api/v1/calls/{callId}`

**Description**: 통화 상태 및 결과 조회

**Authentication**: Required

**Response 200 OK**:
```json
{
  "success": true,
  "data": {
    "call": {
      "id": "string",
      "requestType": "RESERVATION",
      "requestText": "string",
      "targetName": "OO미용실",
      "targetPhone": "string",
      "status": "COMPLETED",
      "result": "SUCCESS",
      "resultDetail": "예약이 완료되었습니다",

      "reservation": {
        "date": "2026-02-06",
        "time": "15:00",
        "service": "커트",
        "confirmed": true
      },

      "summary": "OO미용실에 내일(2/6) 오후 3시 커트 예약이 완료되었습니다.",
      "duration": 45,
      "recordingUrl": "string | null",

      "createdAt": "string (ISO 8601)",
      "endedAt": "string (ISO 8601)"
    }
  }
}
```

---

#### API: 통화 기록 목록

##### `GET /api/v1/calls`

**Description**: 사용자의 통화 기록 목록 조회

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | 페이지 번호 (default: 1) |
| limit | number | 페이지당 개수 (default: 20) |
| status | string | 필터: COMPLETED, FAILED 등 |
| type | string | 필터: RESERVATION, INQUIRY |
| search | string | 장소명 검색 |
| dateFrom | string | 시작 날짜 (ISO 8601) |
| dateTo | string | 종료 날짜 (ISO 8601) |

**Response 200 OK**:
```json
{
  "success": true,
  "data": {
    "calls": [
      {
        "id": "string",
        "requestType": "RESERVATION",
        "targetName": "OO미용실",
        "status": "COMPLETED",
        "result": "SUCCESS",
        "summary": "예약 완료",
        "createdAt": "string (ISO 8601)"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

---

#### Webhook: 통화 결과 수신

##### `POST /api/webhooks/elevenlabs`

**Description**: ElevenLabs에서 통화 결과 수신

**Headers**:
| Header | Required | Description |
|--------|----------|-------------|
| X-ElevenLabs-Signature | Yes | 웹훅 서명 |

**Request Body (from ElevenLabs)**:
```json
{
  "conversation_id": "string",
  "status": "completed",
  "call_sid": "string",
  "duration": 45,
  "recording_url": "string",
  "transcript": "string - 전체 대화 내용",
  "metadata": {
    "call_id": "string - 우리 시스템의 call ID"
  }
}
```

**웹훅 보안**:
| 항목 | 정책 |
|------|------|
| Signature 검증 | HMAC-SHA256 with secret key |
| Timestamp 검증 | 5분 이내 요청만 수락 |
| 재전송 방지 | conversation_id 중복 체크 |
| 실패 로깅 | 검증 실패 시 모니터링 알림 |

---

### 5.8 ElevenLabs Agent 설정

#### 예약 Agent 프롬프트 예시

```
You are a phone assistant making a reservation call on behalf of a customer.

## Your Goal
Make a reservation at the given establishment with the following details:
- Date: {{date}}
- Time: {{time}}
- Service: {{service}}
- Customer Name: {{customer_name}}

## Instructions
1. Greet politely and state you're calling to make a reservation
2. Provide the requested date and time
3. If the slot is unavailable, ask for alternative times
4. Confirm the reservation details before ending
5. Thank them and end the call politely

## Important Rules
- Speak naturally in Korean
- Be polite and professional
- If they ask questions you can't answer, say you'll confirm with the customer
- Always confirm the final reservation details

## Language
Korean (한국어)
```

#### 문의 Agent 프롬프트 예시

```
You are a phone assistant making an inquiry call on behalf of a customer.

## Your Goal
Get the answer to the following question:
{{inquiry_question}}

## Instructions
1. Greet politely and state your question clearly
2. Listen carefully to the answer
3. If needed, ask clarifying questions
4. Thank them and end the call politely

## Important Rules
- Speak naturally in Korean
- Be polite and brief
- Get the specific information requested

## Language
Korean (한국어)
```

#### 한국어 대화 가이드라인

AI Agent가 자연스러운 한국어 대화를 위해 따라야 할 규칙:

| 항목 | 가이드라인 |
|------|-----------|
| 존댓말 | 해요체 필수 사용 ("~해요", "~할까요?") |
| 인사 시작 | "안녕하세요, [목적] 문의/예약 드립니다" |
| 인사 종료 | "감사합니다. 좋은 하루 되세요" |
| 예약 확인 | 핵심 정보 반드시 복창 ("그럼 내일 오후 3시 커트 예약이죠?") |
| 호칭 | "선생님" 또는 생략 (이름 직접 부르지 않음) |
| 확인 질문 | "혹시 ~라는 말씀이실까요?" |
| 대안 수락 | "네, 그 시간으로 부탁드릴게요" |
| 대안 거절 | "죄송하지만 그 시간은 어려울 것 같아요. 다른 시간 있을까요?" |

**자연스러운 대화 예시**:
```
AI: 안녕하세요, 내일 오후 3시에 커트 예약 가능한지 문의드립니다.
상대: 3시요? 잠시만요... 3시는 예약이 꽉 찼는데, 4시는 어떠세요?
AI: 4시요? 네, 4시도 괜찮을 것 같습니다. 4시로 부탁드릴게요.
상대: 네, 성함이 어떻게 되세요?
AI: 홍길동입니다.
상대: 네, 홍길동 고객님 내일 오후 4시 커트 예약 완료됐습니다.
AI: 감사합니다. 그럼 내일 4시에 뵙겠습니다. 좋은 하루 되세요.
```

---

## 6. UI/UX Design

### 6.1 주요 화면

#### 화면 1: 요청 입력

```
┌─────────────────────────────────────────────────────────────┐
│  AI Call Agent                                  [기록] [설정]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                   📞 AI에게 전화 부탁하기                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  무엇을 도와드릴까요?                                │   │
│  │                                                     │   │
│  │  ┌───────────────────────────────────────────┐     │   │
│  │  │  내일 오후 3시에 OO미용실 커트 예약해줘     │     │   │
│  │  │                                           │     │   │
│  │  │                                           │     │   │
│  │  └───────────────────────────────────────────┘     │   │
│  │                                                     │   │
│  │  전화번호 (선택)                                     │   │
│  │  ┌───────────────────────────────────────────┐     │   │
│  │  │  010-1234-5678                            │     │   │
│  │  └───────────────────────────────────────────┘     │   │
│  │                                                     │   │
│  │                   [ 🔍 번호 검색 ]                   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                       [ 📞 전화 부탁하기 ]                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 예시:                                                   │
│  • "내일 저녁 7시에 XX식당 2명 예약해줘"                     │
│  • "OO병원 토요일 진료하는지 확인해줘"                       │
│  • "강남 XX카페 영업시간 알려줘"                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 화면 2: 요청 확인

```
┌─────────────────────────────────────────────────────────────┐
│  AI Call Agent                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                   📋 요청 내용 확인                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📍 장소: OO미용실                                   │   │
│  │  📞 전화: 010-1234-5678                             │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📅 요청 유형: 예약                                  │   │
│  │  📆 날짜: 내일 (2월 6일)                             │   │
│  │  ⏰ 시간: 오후 3시                                   │   │
│  │  ✂️ 서비스: 커트                                     │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  AI가 다음과 같이 전화합니다:                        │   │
│  │  "안녕하세요, 내일 오후 3시에 커트 예약하고          │   │
│  │   싶은데 가능할까요?"                                │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  💰 예상 비용: ~$0.15-0.25 (1-2분 기준)             │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│            [ ← 수정하기 ]        [ ✅ 전화 걸기 ]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 화면 3: 통화 진행 중

```
┌─────────────────────────────────────────────────────────────┐
│  AI Call Agent                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                      📞 통화 중...                          │
│                                                             │
│                   ┌─────────────────┐                       │
│                   │                 │                       │
│                   │   🤖  ↔️  📱    │                       │
│                   │                 │                       │
│                   │   AI    미용실  │                       │
│                   │                 │                       │
│                   └─────────────────┘                       │
│                                                             │
│                      OO미용실                               │
│                    010-1234-5678                            │
│                                                             │
│                   ⏱️ 00:32 경과                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📝 진행 상황                                               │
│  ✅ 전화 연결됨                                             │
│  ✅ 예약 요청 전달 중...                                    │
│  ⏳ 예약 확정 대기 중                                       │
│                                                             │
│                     [ 🚫 통화 취소 ]                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 화면 4: 결과 화면 (성공)

```
┌─────────────────────────────────────────────────────────────┐
│  AI Call Agent                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                   ✅ 예약이 완료되었습니다!                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📍 OO미용실                                         │   │
│  │  📆 2026년 2월 6일 (목)                              │   │
│  │  ⏰ 오후 3시                                         │   │
│  │  ✂️ 커트                                             │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📝 AI 요약                                          │   │
│  │                                                     │   │
│  │  OO미용실에 전화하여 내일(2/6) 오후 3시 커트        │   │
│  │  예약을 요청했습니다. 예약이 정상적으로 확정         │   │
│  │  되었으며, 방문 시 이름(홍길동)을 말씀하시면         │   │
│  │  됩니다.                                            │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📞 통화 시간: 45초                                  │   │
│  │                                                     │   │
│  │  [ 🔊 녹음 듣기 ]  [ 📋 전체 대화 보기 ]            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│           [ 📅 캘린더에 추가 ]   [ 🏠 홈으로 ]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Phases

### Phase 1: MVP Core (P0)

- [ ] 프로젝트 초기 설정 (Next.js, Prisma, Tailwind)
- [ ] 사용자 인증 (NextAuth.js + 비밀번호 정책 + 세션 관리)
- [ ] 요청 입력 UI
- [ ] 자연어 요청 파싱 (GPT-4)
- [ ] **전화번호 검증 로직 (E.164, 긴급번호 차단)**
- [ ] **요청 취소 기능**
- [ ] ElevenLabs Agent 설정 (예약/문의 + 한국어 가이드라인)
- [ ] ElevenLabs Outbound Call API 연동
- [ ] **녹음 동의 안내 자동 재생**
- [ ] **통화 예외 처리 (끊김, 인식 실패, 음성메일)**
- [ ] 통화 결과 웹훅 처리 + **서명 검증**
- [ ] 결과 화면 UI
- [ ] 기본 알림 (웹 푸시 + 인앱)
- [ ] Rate Limiting 적용

**Deliverable**: 예약/문의 요청 → AI 통화 → 결과 확인 (보안/예외처리 포함)

### Phase 2: Enhanced Features (P1)

- [ ] 통화 기록 목록/상세 페이지 + **검색 기능**
- [ ] 통화 녹음 재생
- [ ] 통화 전문(transcript) 표시
- [ ] 통화 실패 시 재시도 (attempts 추적)
- [ ] **부분 성공 대안 확정 플로우**
- [ ] 이메일 알림 (Web Push 실패 시)
- [ ] **사용자별 비용 추적 및 표시**
- [ ] **일일/월간 사용 한도**

**Deliverable**: 완전한 통화 기록 관리 + 비용 관리

### Phase 3: Polish (P2)

- [ ] 자주 사용하는 장소 저장
- [ ] 전화번호 검색 연동 (네이버/카카오 지도)
- [ ] 캘린더 연동 (예약 자동 추가)
- [ ] 다크 모드
- [ ] 모바일 최적화

**Deliverable**: 완성도 높은 사용자 경험

---

## 8. Success Metrics

| Metric | Target | Measurement | 계산 공식 |
|--------|--------|-------------|----------|
| 통화 성공률 | > 80% | 요청 → 목표 달성 비율 | (SUCCESS + PARTIAL_SUCCESS) / 전체 완료 통화 |
| 예약 완료율 | > 70% | 예약 요청 → 예약 확정 | SUCCESS(예약) / 전체 예약 요청 |
| 문의 답변율 | > 90% | 문의 요청 → 답변 수신 | SUCCESS(문의) / 전체 문의 요청 |
| 평균 통화 시간 | < 2분 | 연결 → 종료 | SUM(duration) / 연결 성공 통화 수 |
| 사용자 만족도 | > 4.0/5.0 | 인앱 피드백 | AVG(rating) |
| 재시도 성공률 | > 50% | 첫 시도 실패 → 재시도 성공 | 재시도 후 SUCCESS / 재시도 발생 건 |

---

## 9. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| AI 대화 품질 | High | Medium | 프롬프트 최적화, 실패 시 사람 개입 안내 |
| 상대방 거부 | Medium | Medium | "봇 전화입니다" 안내, 자연스러운 대화 |
| ElevenLabs 장애 | High | Low | 상태 모니터링, 재시도 로직 |
| 비용 폭증 | High | Low | Rate Limiting, 일일 한도 |
| 잘못된 예약 | High | Medium | 결과 확인 단계, 취소 안내 |

---

## 10. Resolved Questions

| 질문 | 결정 | 사유 |
|------|------|------|
| 녹음 동의 처리 방법 | 통화 시작 시 자동 안내 멘트 재생 | 한국 통신비밀보호법 준수 |
| 전화번호 검증 정책 | E.164 형식, 긴급번호 차단 | 오발신 방지, 법적 리스크 제거 |
| 비용 관리 방법 | 일일/월간 한도 + 사전 안내 | 예상치 못한 비용 방지 |
| 세션 관리 정책 | 24시간 만료, 동시 3디바이스 | 보안과 편의성 균형 |
| 부분 성공 처리 | 사용자에게 대안 확정 알림 | UX 개선, 자동 확정 리스크 제거 |

## 11. Open Questions

1. 전화번호 검색 API 선정 필요 (네이버 지도 / 카카오 지도)
2. ElevenLabs 한국어 Agent 품질 테스트 필요
3. 통화 실패 시 대체 연락 방법 (문자?) 검토
4. ElevenLabs 웹훅 시크릿 키 관리 방법 확인 필요

---

## Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| AI Call Agent | 사용자 대신 AI가 전화하는 서비스 |
| Conversational AI | 자율적으로 대화하는 AI 에이전트 |
| Outbound Call | 외부로 발신하는 전화 |

### B. Related Documents

- [ADR_voice-proxy-architecture.md](../adr/ADR_voice-proxy-architecture.md) - 아키텍처 비교 (Voice Proxy vs AI Call Agent)

### C. References

- [ElevenLabs Conversational AI](https://elevenlabs.io/conversational-ai)
- [ElevenLabs Outbound Call via Twilio](https://elevenlabs.io/docs/api-reference/twilio/outbound-call)
- [ElevenLabs Agents Platform](https://elevenlabs.io/docs/agents-platform/overview)
