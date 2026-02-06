# WIGVO 구현 명세서 (Implementation Specification)

> 이 문서는 코드 구현 전 설계 명세입니다. 해커톤 당일 이 명세를 기반으로 구현합니다.

---

## 1. 전체 파이프라인 흐름

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WIGVO Pipeline                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   [1] 채팅 UI        [2] 정보 수집         [3] 구조화              │
│   ┌─────────┐       ┌─────────────┐       ┌─────────────┐          │
│   │  User   │──────▶│  GPT-4o-mini │──────▶│ CollectedData│          │
│   │  Input  │       │  Multi-turn  │       │    JSON      │          │
│   └─────────┘       └─────────────┘       └──────┬──────┘          │
│                                                   │                  │
│   [6] 결과 표시      [5] 통화 실행         [4] 프롬프트 생성        │
│   ┌─────────┐       ┌─────────────┐       ┌──────▼──────┐          │
│   │ Result  │◀──────│  ElevenLabs  │◀──────│   Dynamic    │          │
│   │  UI     │       │   + Twilio   │       │   Prompt     │          │
│   └─────────┘       └─────────────┘       └─────────────┘          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase 1: GPT 기반 정보 수집 시스템

### 2.1 System Prompt 설계 원칙

GPT-4o-mini에게 전달할 System Prompt는 다음 요소를 포함해야 합니다:

#### 역할 정의
- AI 비서로서 사용자의 전화 요청에 필요한 정보를 대화로 수집
- 친근하고 자연스러운 한국어 해요체 사용

#### 수집 대상 필드 (우선순위)

| 우선순위 | 필드명 | 설명 | 예시 |
|----------|--------|------|------|
| **필수** | target_name | 전화할 곳 이름 | "OO미용실" |
| **필수** | target_phone | 전화번호 | "010-1234-5678" |
| **필수** | scenario_type | 용건 유형 | RESERVATION / INQUIRY / AS_REQUEST |
| **필수** | primary_datetime | 희망 일시 | "내일 오후 3시" |
| 권장 | service | 구체적 서비스 | "남자 커트" |
| 권장 | customer_name | 예약자 이름 | "홍길동" |
| 권장 | party_size | 인원수 | 1 |
| 선택 | fallback_datetimes | 대안 시간 목록 | ["내일 4시", "모레 3시"] |
| 선택 | fallback_action | 불가 시 대응 | ASK_AVAILABLE / NEXT_DAY / CANCEL |
| 선택 | special_request | 특별 요청 | "창가 자리로 부탁드려요" |

#### 대화 규칙
1. 한 번에 1-2개 질문만 (사용자 피로도 방지)
2. 모호한 답변은 명확히 재확인
3. 정보가 충분하면 요약 후 확인 요청
4. 필수 4개 필드 수집 완료 시 종료

#### 응답 형식 규칙

GPT는 매 응답마다 **구조화된 JSON**을 포함해야 합니다:

```
응답 구조:
- message: 사용자에게 표시할 자연어 메시지
- collected: 현재까지 수집된 모든 필드 (null 허용)
- is_complete: 필수 정보 수집 완료 여부 (boolean)
```

JSON은 마크다운 코드 블록으로 감싸서 파싱 용이하게 합니다.

### 2.2 응답 파싱 알고리즘

GPT 응답에서 JSON을 추출하는 로직:

```
1. 정규식으로 ```json ... ``` 블록 탐색
2. 블록 발견 시:
   - JSON.parse 시도
   - 성공: message, collected, is_complete 추출
   - 실패: 전체 응답을 message로, 기본값 사용
3. 블록 미발견 시:
   - 전체 응답을 message로 처리
   - collected는 이전 상태 유지
   - is_complete는 false
```

### 2.3 상태 관리 전략

채팅 중 수집된 데이터 누적 방식:

```
초기 상태: 모든 필드 null

매 응답마다:
  1. GPT 응답의 collected 객체 수신
  2. 각 필드별로:
     - 새 값이 null이 아니면 → 업데이트
     - 새 값이 null이면 → 기존 값 유지
  3. 배열 필드(fallback_datetimes)는 비어있지 않을 때만 교체
```

### 2.4 완료 조건 판정

```
필수 필드 4개 모두 non-null:
  - target_name
  - target_phone
  - scenario_type
  - primary_datetime

AND GPT가 is_complete: true 반환

→ 정보 수집 완료, Phase 2로 진행
```

---

## 3. Phase 2: CollectedData 구조

### 3.1 타입 정의

```
CollectedData {
  // 필수 (Required)
  target_name: string        // 전화할 곳 이름
  target_phone: string       // 전화번호 (원본 형식)
  scenario_type: enum        // RESERVATION | INQUIRY | AS_REQUEST
  primary_datetime: string   // 자연어 일시 표현

  // 권장 (Recommended)
  service: string | null     // 구체적 서비스명
  customer_name: string | null
  party_size: number | null

  // 선택 (Optional)
  fallback_datetimes: string[]  // 대안 시간 목록
  fallback_action: enum | null  // ASK_AVAILABLE | NEXT_DAY | CANCEL
  special_request: string | null
}
```

### 3.2 시나리오 타입 판별 기준

| 키워드 | 시나리오 |
|--------|----------|
| 예약, 예매, 부킹, 잡아줘 | RESERVATION |
| 문의, 확인, 알아봐줘, 물어봐줘 | INQUIRY |
| AS, 수리, 고장, 접수 | AS_REQUEST |

GPT가 대화 맥락에서 자동 판별하도록 System Prompt에 명시합니다.

---

## 4. Phase 3: Dynamic Prompt 생성

### 4.1 설계 원칙

ElevenLabs Agent에게 전달할 System Prompt는:
- **CollectedData 기반으로 동적 생성**
- 시나리오 타입별 템플릿 사용
- 자연스러운 한국어 대화 흐름 포함
- Fallback 전략 명시

### 4.2 시나리오별 프롬프트 구조

#### RESERVATION (예약)

```
구조:
1. 역할 정의: "고객을 대신해 {target_name}에 전화를 거는 AI 비서"

2. 목표: "{primary_datetime}에 {service} 예약 요청"

3. 예약 정보 섹션:
   - 장소, 희망 일시, 서비스, 예약자, 인원

4. 대화 흐름:
   Step 1: 인사 ("안녕하세요, 예약 문의 드립니다")
   Step 2: 요청 ("{datetime}에 {service} 예약 가능할까요?")
   Step 3-가능: 예약 확정 ("{customer_name} 이름으로 예약")
   Step 3-불가: Fallback 전략 실행
   Step 4: 마무리 인사

5. Fallback 전략 (fallback_action에 따라):
   - ASK_AVAILABLE: "그럼 언제 가능한지 알려주시겠어요?"
   - NEXT_DAY: "{fallback_datetimes}은 어떤지" 제안
   - CANCEL: 정중히 종료

6. 규칙:
   - 해요체 사용
   - 예약 확정 시 일시+이름 재확인
   - 못 알아들으면 천천히 반복
```

#### INQUIRY (문의)

```
구조:
1. 역할 정의: 동일

2. 목표: "{service}에 대해 문의"

3. 문의 내용: {special_request}

4. 대화 흐름:
   Step 1: 인사 ("문의 드릴 게 있어서 전화드렸습니다")
   Step 2: 질문 전달
   Step 3: 답변 경청 + 추가 질문
   Step 4: 감사 인사

5. 규칙: 중요 정보 재확인
```

#### AS_REQUEST (AS/수리 접수)

```
구조:
1. 역할 정의: 동일

2. 목표: "{service} AS/수리 접수 요청"

3. 접수 정보:
   - 업체, 희망 방문일, 서비스, 고객명, 증상

4. 대화 흐름:
   Step 1: 인사 ("AS 접수 문의 드립니다")
   Step 2: 증상 설명 ("{service}가 {special_request} 상태")
   Step 3: 일정 조율
   Step 4: 접수 확정

5. 규칙: 방문 일정 + 예상 비용 확인
```

### 4.3 Dynamic Variables 매핑

ElevenLabs API에 전달할 변수:

| CollectedData 필드 | Dynamic Variable | 용도 |
|-------------------|------------------|------|
| target_name | target_name | 업체명 호칭 |
| primary_datetime | datetime | 일시 언급 |
| service | service | 서비스명 |
| customer_name | customer_name | 예약자명 |
| party_size | party_size | 인원 (문자열 변환) |
| special_request | question / issue | 문의 내용 또는 증상 |

---

## 5. Phase 4: ElevenLabs 전화 발신

### 5.1 API 엔드포인트

```
POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call
```

### 5.2 요청 페이로드 구조

```
{
  agent_id: 환경변수에서 로드,
  agent_phone_number_id: 환경변수에서 로드,
  to_number: E.164 형식 전화번호,
  conversation_initiation_client_data: {
    dynamic_variables: {
      // Phase 3에서 생성한 변수들
    }
  }
}
```

### 5.3 전화번호 포맷팅 규칙

한국 전화번호 → E.164 변환:

```
입력                    출력
─────────────────────   ─────────────────
010-1234-5678          +821012345678
01012345678            +821012345678
02-123-4567            +8221234567
+821012345678          +821012345678 (유지)
```

변환 알고리즘:
1. 숫자와 + 외 문자 제거
2. +로 시작하면 그대로 반환
3. 010으로 시작하면 +82 + 나머지(0 제외)
4. 02로 시작하면 +82 + 나머지(0 제외)
5. 그 외 +82 + 전체

### 5.4 응답 처리

성공 시:
```
{
  conversation_id: "conv_xxx"  // 통화 추적용 ID
}
```

이 ID로 통화 상태를 폴링합니다.

---

## 6. Phase 5: 통화 결과 폴링

### 6.1 상태 조회 API

```
GET https://api.elevenlabs.io/v1/convai/conversations/{conversation_id}
```

### 6.2 폴링 전략

```
설정:
- 폴링 간격: 5초
- 최대 대기: 180초 (3분)
- 타임아웃 시: 경고 후 종료 (통화는 계속됨)

상태 값:
- "processing": 통화 진행 중 → 계속 폴링
- "done": 통화 완료 → 결과 표시
- "failed": 통화 실패 → 에러 표시
```

### 6.3 결과 데이터 구조

통화 완료 시 응답:

```
{
  status: "done",
  analysis: {
    transcript_summary: "통화 요약 텍스트",
    // 기타 분석 데이터
  }
}
```

---

## 7. 에러 처리 전략

### 7.1 GPT API 에러

| 에러 | 대응 |
|------|------|
| Rate limit | 2초 후 재시도 (최대 3회) |
| Invalid API key | 사용자에게 설정 확인 요청 |
| Timeout | 재시도 또는 사용자에게 알림 |

### 7.2 ElevenLabs API 에러

| 에러 | 대응 |
|------|------|
| Invalid phone number | 번호 형식 재확인 요청 |
| Agent not found | 환경변수 확인 |
| Quota exceeded | 사용자에게 알림 |

### 7.3 JSON 파싱 에러

GPT 응답이 예상 형식이 아닐 때:
1. 전체 응답을 message로 표시
2. collected는 이전 상태 유지
3. 로그에 원본 응답 기록
4. 대화 계속 진행 (중단하지 않음)

---

## 8. UI/UX 명세

### 8.1 채팅 화면

```
┌────────────────────────────────────┐
│  WIGVO - AI 전화 비서              │
├────────────────────────────────────┤
│                                    │
│  🤖 안녕하세요! 어떤 전화를        │
│     대신 걸어드릴까요?             │
│                                    │
│                    미용실 예약 👤  │
│                    하고 싶어요     │
│                                    │
│  🤖 어느 미용실인가요?             │
│     전화번호도 알려주세요!         │
│                                    │
├────────────────────────────────────┤
│  [메시지 입력...]           [전송] │
└────────────────────────────────────┘
```

### 8.2 확인 화면

```
┌────────────────────────────────────┐
│  📋 수집된 정보                    │
├────────────────────────────────────┤
│  장소: OO미용실                    │
│  전화: 010-1234-5678               │
│  일시: 내일 오후 3시               │
│  서비스: 남자 커트                 │
│  예약자: 홍길동                    │
│  인원: 1명                         │
├────────────────────────────────────┤
│  [ 수정하기 ]    [ 전화 걸기 📞 ]  │
└────────────────────────────────────┘
```

### 8.3 통화 중 화면

```
┌────────────────────────────────────┐
│                                    │
│         📞 통화 중...              │
│                                    │
│      OO미용실에 전화하고 있어요    │
│                                    │
│          ⏱️ 00:32                  │
│                                    │
│  ──────────────────────────────    │
│  💡 AI가 예약을 진행하고 있습니다  │
│     잠시만 기다려주세요            │
│                                    │
└────────────────────────────────────┘
```

### 8.4 결과 화면

```
┌────────────────────────────────────┐
│  ✅ 예약 완료!                     │
├────────────────────────────────────┤
│                                    │
│  OO미용실                          │
│  📅 내일 오후 3시                  │
│  ✂️ 남자 커트                      │
│  👤 홍길동                         │
│                                    │
│  ─────────────────────────────     │
│  📝 통화 요약                      │
│  "내일 오후 3시 남자 커트 예약이   │
│   홍길동 이름으로 완료되었습니다"  │
│                                    │
├────────────────────────────────────┤
│  [ 새 전화 걸기 ]  [ 기록 보기 ]   │
└────────────────────────────────────┘
```

---

## 9. 파일 구조 (구현 시 생성)

```
app/
├── page.tsx                    # 메인 채팅 페이지
├── api/
│   ├── conversations/
│   │   └── route.ts            # 대화 시작 API
│   ├── chat/
│   │   └── route.ts            # 메시지 전송 API (GPT 호출)
│   └── calls/
│       ├── route.ts            # 전화 발신 API
│       └── [id]/
│           └── route.ts        # 통화 상태 조회 API

components/
├── chat/
│   ├── ChatContainer.tsx       # 채팅 전체 컨테이너
│   ├── ChatMessage.tsx         # 개별 메시지 컴포넌트
│   ├── ChatInput.tsx           # 메시지 입력창
│   └── CollectionSummary.tsx   # 수집 정보 요약 카드
├── call/
│   ├── CallProgress.tsx        # 통화 중 화면
│   └── CallResult.tsx          # 통화 결과 화면

lib/
├── supabase/
│   ├── client.ts               # 브라우저용 Supabase 클라이언트
│   └── server.ts               # 서버용 Supabase 클라이언트
├── prompts.ts                  # GPT System Prompt 상수
├── response-parser.ts          # GPT 응답 JSON 파싱
├── prompt-generator.ts         # Dynamic Prompt 생성기
└── phone-formatter.ts          # 전화번호 E.164 변환

hooks/
└── useChat.ts                  # 채팅 상태 관리 훅

types/
├── collected-data.ts           # CollectedData 타입
└── database.ts                 # Supabase 테이블 타입
```

---

## 10. API 엔드포인트 명세

### POST /api/conversations

대화 세션 시작

**Request:** 없음 (새 세션 생성)

**Response:**
```
{
  id: "uuid",
  status: "COLLECTING",
  initial_message: "안녕하세요! 어떤 전화를 대신 걸어드릴까요?"
}
```

### POST /api/chat

메시지 전송 및 GPT 응답

**Request:**
```
{
  conversation_id: "uuid",
  message: "미용실 예약하고 싶어요"
}
```

**Response:**
```
{
  message: "어느 미용실인가요?",
  collected: { ... },
  is_complete: false
}
```

### POST /api/calls

전화 발신 시작

**Request:**
```
{
  conversation_id: "uuid"
}
```

**Response:**
```
{
  call_id: "uuid",
  elevenlabs_conversation_id: "conv_xxx",
  status: "IN_PROGRESS"
}
```

### GET /api/calls/[id]

통화 상태 조회

**Response:**
```
{
  id: "uuid",
  status: "COMPLETED",
  result_summary: "예약 완료",
  transcript_summary: "..."
}
```

---

## 11. 환경변수

| 변수 | 용도 | 필수 |
|------|------|------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase 프로젝트 URL | ✅ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon key | ✅ |
| OPENAI_API_KEY | GPT API 키 | ✅ |
| ELEVENLABS_API_KEY | ElevenLabs API 키 | ✅ |
| ELEVENLABS_AGENT_ID | ElevenLabs Agent ID | ✅ |
| ELEVENLABS_PHONE_NUMBER_ID | Twilio 번호 ID | ✅ |

---

## 12. 구현 우선순위

### P0 (데모 필수)
1. 채팅 UI + GPT 연동
2. CollectedData 수집 및 표시
3. ElevenLabs 전화 발신
4. 결과 화면

### P1 (완성도)
1. Supabase 저장
2. 통화 기록 목록
3. 에러 처리 UI

### P2 (있으면 좋음)
1. 소셜 로그인
2. 통화 녹음 재생
3. 반복 예약

---

## 13. Database ER Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Database Schema                                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│    conversations    │
├─────────────────────┤
│ id          UUID PK │───────────────────────┐
│ user_id     UUID FK │                       │
│ status      TEXT    │                       │
│ collected_data JSONB│                       │
│ created_at  TIMESTAMPTZ                     │
│ updated_at  TIMESTAMPTZ                     │
└─────────────────────┘                       │
         │                                    │
         │ 1:N                                │ 1:1
         ▼                                    ▼
┌─────────────────────┐              ┌─────────────────────┐
│      messages       │              │       calls         │
├─────────────────────┤              ├─────────────────────┤
│ id          UUID PK │              │ id          UUID PK │
│ conversation_id  FK │              │ conversation_id  FK │
│ role        TEXT    │              │ user_id     UUID FK │
│ content     TEXT    │              │ target_phone   TEXT │
│ metadata    JSONB   │              │ target_name    TEXT │
│ created_at  TIMESTAMPTZ            │ status         TEXT │
└─────────────────────┘              │ elevenlabs_conv_id  │
                                     │ result       JSONB  │
                                     │ result_summary TEXT │
                                     │ created_at  TIMESTAMPTZ
                                     │ updated_at  TIMESTAMPTZ
                                     └─────────────────────┘
```

### 13.1 Status 값

**conversations.status:**
```
COLLECTING  → 정보 수집 중
READY       → 수집 완료, 전화 대기
CALLING     → 전화 중
COMPLETED   → 완료
CANCELLED   → 취소됨
```

**calls.status:**
```
PENDING     → 대기
CALLING     → 발신 중
IN_PROGRESS → 통화 중
COMPLETED   → 완료
FAILED      → 실패
```

### 13.2 JSONB 필드 구조

**collected_data:**
```json
{
  "target_name": "OO미용실",
  "target_phone": "010-1234-5678",
  "scenario_type": "RESERVATION",
  "primary_datetime": "내일 오후 3시",
  "service": "남자 커트",
  "fallback_datetimes": ["4시", "5시"],
  "fallback_action": "ASK_AVAILABLE",
  "customer_name": "홍길동",
  "party_size": 1,
  "special_request": null
}
```

**result:**
```json
{
  "status": "done",
  "transcript_summary": "예약이 완료되었습니다...",
  "confirmed_datetime": "내일 오후 3시 반",
  "additional_info": null
}
```

### 13.3 SQL 스키마

SQL 스키마는 `scripts/supabase-tables.sql` 파일에 정의되어 있습니다.

---

*이 명세서는 구현 가이드이며, 실제 코드는 해커톤 당일 작성합니다.*
