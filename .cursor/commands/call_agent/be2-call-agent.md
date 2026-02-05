# BE2: ElevenLabs 연동 개발 지시서

> **프로젝트**: AI Call Agent (4시간 해커톤)
> **역할**: BE2 - ElevenLabs 연동 담당
> **담당 시간**: Phase 1 (0:30-2:00)

## IMPORTANT: 필독 문서

작업 시작 전에 반드시 읽어야 할 파일들:
1. **`.cursorrules`** — 프로젝트 전체 규칙, 아키텍처, 코딩 컨벤션
2. **`.cursor/rules/team-workflow.mdc`** — 파일 오너십, 충돌 방지 규칙
3. **`.cursor/rules/api-contract.mdc`** — API 요청/응답 스키마 (SSOT)

---

## File Ownership

### BE2가 소유하는 파일 (ONLY these)
```
app/api/calls/[id]/start/route.ts
lib/elevenlabs.ts
```

### 절대 수정하지 마세요
- `app/api/calls/route.ts` — BE1 소유
- `app/api/calls/[id]/route.ts` — BE1 소유
- `lib/prisma.ts` — BE1 소유
- `lib/parser.ts` — BE1 소유
- `shared/types.ts` — BE1 소유 (읽기만 가능)
- `app/page.tsx`, `app/confirm/` — FE1 소유
- `app/calling/`, `app/result/`, `app/history/` — FE2 소유
- `components/` — FE1, FE2 소유

> **NOTE**: `start/route.ts`는 BE2 전용입니다. BE1이 만들지 않습니다.
> BE2가 이 파일을 처음부터 생성합니다.

---

## 역할 요약

**ElevenLabs Conversational AI**를 사용하여 실제 전화를 거는 기능을 개발합니다.

```
[당신이 만드는 부분]

┌─────────────────────────────────────────────────────────────────────┐
│                     ElevenLabs Integration                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Mock Mode (BE2-1, 최우선)                                       │
│     └── 실제 API 없이 전체 플로우 동작                               │
│                                                                     │
│  2. Agent 설정 (ElevenLabs 대시보드)                                 │
│     └── 예약 대행 프롬프트 작성                                      │
│                                                                     │
│  3. Start Route (POST /api/calls/[id]/start)                       │
│     └── 전화번호로 AI 통화 시작 or Mock 실행                         │
│                                                                     │
│  4. Outbound Call API 호출                                          │
│     └── ElevenLabs 실제 연동                                        │
│                                                                     │
│  5. Polling-based 결과 수집                                         │
│     └── 통화 완료 시 결과 DB 업데이트                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Call Flow                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  FE: [전화 걸기] 클릭                                                │
│       ↓                                                             │
│  BE2: POST /api/calls/[id]/start                                   │
│       ├── Mock mode → 5초 후 자동 완료                               │
│       └── Real mode → ElevenLabs Outbound Call API                 │
│       ↓                                                             │
│  BE2: status = CALLING → IN_PROGRESS → COMPLETED                   │
│       ↓                                                             │
│  FE: 폴링으로 결과 확인 → 결과 화면                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 사전 준비

### ElevenLabs 계정 설정

1. [ElevenLabs](https://elevenlabs.io) 로그인
2. Conversational AI 섹션으로 이동
3. Agent 생성 (아래 프롬프트 사용)
4. Twilio 연동 설정 (전화 발신용)
5. API Key 복사

### 환경 변수

```bash
# .env.local
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_AGENT_ID=your_agent_id
ELEVENLABS_MOCK=true    # 기본값: Mock mode ON
```

---

## 태스크 목록 (순서 변경됨)

> **CRITICAL**: BE2-1 Mock mode가 최우선입니다.
> Mock이 되어야 Phase 2에서 팀 전체가 통합 테스트할 수 있습니다.

### BE2-1: Mock Mode 구현 (필수 최우선) (20분)

**파일**: `lib/elevenlabs.ts`, `app/api/calls/[id]/start/route.ts`

**Mock mode가 해야 하는 것**:
1. `POST /api/calls/[id]/start` 호출 시 → status = CALLING
2. 5초 후 자동으로 → status = COMPLETED, result = SUCCESS
3. Summary 자동 생성 (파싱된 정보 기반)
4. 실제 ElevenLabs API 호출 없음

```typescript
// lib/elevenlabs.ts

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ''
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID || ''
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1'
const MOCK_MODE = process.env.ELEVENLABS_MOCK === 'true'

interface OutboundCallResponse {
  conversation_id: string
  status: string
}

export function isMockMode(): boolean {
  return MOCK_MODE
}

export async function startOutboundCall(
  phoneNumber: string,
  dynamicVariables: Record<string, string>
): Promise<OutboundCallResponse> {

  // Mock 모드: 실제 API 호출 없이 가짜 결과 반환
  if (MOCK_MODE) {
    console.log('🎭 Mock mode: Simulating call to', phoneNumber)
    return {
      conversation_id: `mock_${Date.now()}`,
      status: 'initiated'
    }
  }

  // 실제 API 호출
  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/convai/conversations/outbound-call`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_id: ELEVENLABS_AGENT_ID,
        customer_phone_number: phoneNumber,
        conversation_initiation_client_data: {
          dynamic_variables: dynamicVariables
        }
      })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs API error: ${error}`)
  }

  return response.json()
}

export async function getConversation(conversationId: string) {
  if (MOCK_MODE) {
    return {
      conversation_id: conversationId,
      status: 'completed',
      transcript: 'Mock transcript'
    }
  }

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/convai/conversations/${conversationId}`,
    {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    }
  )

  if (!response.ok) {
    throw new Error('Failed to get conversation')
  }

  return response.json()
}
```

**Start Route with Mock**:

```typescript
// app/api/calls/[id]/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOutboundCall, isMockMode } from '@/lib/elevenlabs'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Call 정보 조회
    const call = await prisma.call.findUnique({
      where: { id: params.id }
    })

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // 2. 상태를 CALLING으로 변경
    await prisma.call.update({
      where: { id: params.id },
      data: { status: 'CALLING' }
    })

    // 3. ElevenLabs Outbound Call 시작 (or Mock)
    const phoneNumber = formatPhoneNumber(call.targetPhone)

    const result = await startOutboundCall(phoneNumber, {
      target_name: call.targetName,
      date: call.parsedDate || '오늘',
      time: call.parsedTime || '',
      service: call.parsedService || '예약',
      customer_name: '고객',
      call_id: call.id
    })

    // 4. conversationId 저장 + IN_PROGRESS
    await prisma.call.update({
      where: { id: params.id },
      data: {
        conversationId: result.conversation_id,
        status: 'IN_PROGRESS'
      }
    })

    // 5. Mock mode: 5초 후 자동 완료
    if (isMockMode()) {
      setTimeout(async () => {
        try {
          await prisma.call.update({
            where: { id: params.id },
            data: {
              status: 'COMPLETED',
              result: 'SUCCESS',
              summary: `${call.targetName}에 ${call.parsedDate || ''} ${call.parsedTime || ''} ${call.parsedService || '예약'}이 완료되었습니다. (Mock)`,
              completedAt: new Date()
            }
          })
          console.log('🎭 Mock: Call completed for', params.id)
        } catch (e) {
          console.error('Mock completion error:', e)
        }
      }, 5000)
    }

    return NextResponse.json({
      success: true,
      conversationId: result.conversation_id
    })

  } catch (error) {
    console.error('Error starting call:', error)

    // 실패 시 상태 업데이트
    await prisma.call.update({
      where: { id: params.id },
      data: {
        status: 'FAILED',
        result: 'ERROR'
      }
    })

    return NextResponse.json(
      { error: 'Failed to start call' },
      { status: 500 }
    )
  }
}

// 전화번호 포맷팅 (한국 → E.164)
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('010')) {
    return `+82${cleaned.slice(1)}`
  }
  return `+82${cleaned}`
}
```

---

### BE2-2: Agent 생성 (15분)

**ElevenLabs 대시보드에서 설정**

#### 예약 Agent 프롬프트

```
You are a friendly phone assistant making a reservation call on behalf of a customer.

## Your Goal
Make a reservation at {{target_name}} with the following details:
- Date: {{date}}
- Time: {{time}}
- Service: {{service}}
- Customer Name: {{customer_name}}

## Instructions
1. Greet politely: "안녕하세요, 예약 문의 드립니다."
2. State your request: "{{date}} {{time}}에 {{service}} 예약하고 싶은데 가능할까요?"
3. If the slot is unavailable, ask: "그러면 다른 시간은 언제 가능할까요?"
4. Confirm the final booking: "그럼 {{date}} {{time}}에 {{service}} 예약으로 확정해 주세요."
5. Provide customer name when asked: "예약자 이름은 {{customer_name}}입니다."
6. End politely: "감사합니다. 좋은 하루 되세요."

## Important Rules
- Speak naturally in Korean (해요체)
- Be polite and professional
- Always confirm the final reservation details before ending
- If you can't understand something, politely ask to repeat

## Language
Korean (한국어)
```

#### Agent 설정

| 설정 | 값 |
|------|-----|
| Voice | Korean voice (예: "Rachel - Korean") |
| Model | Turbo v2.5 |
| First Message | "안녕하세요, 예약 문의 드립니다." |
| End Call Phrases | "감사합니다", "안녕히 계세요" |

---

### BE2-3: POST /api/calls/[id]/start (20분)

**BE2-1에 이미 포함** - Mock mode + 실제 모드 모두 지원하는 start route

---

### BE2-4: ElevenLabs Outbound Call API 연동 (20분)

**BE2-1의 `startOutboundCall`에 이미 포함** - `MOCK_MODE=false`일 때 실제 API 호출

---

### BE2-5: Polling-based 통화 결과 수집 (15분)

실제 모드(`ELEVENLABS_MOCK=false`)에서 통화 결과를 폴링으로 수집합니다.

> **NOTE**: 이전 버전에서는 Webhook + ngrok을 사용했지만,
> 로컬 dev 단순화를 위해 Polling으로 변경되었습니다.

```typescript
// start/route.ts에 추가 (실제 모드용)

// Real mode: 통화 결과 폴링
if (!isMockMode()) {
  pollConversationResult(params.id, result.conversation_id)
}

async function pollConversationResult(callId: string, conversationId: string) {
  const maxAttempts = 60  // 최대 3분 (3초 * 60)
  let attempts = 0

  const interval = setInterval(async () => {
    attempts++

    try {
      const conversation = await getConversation(conversationId)

      if (conversation.status === 'completed' || conversation.status === 'failed') {
        clearInterval(interval)

        const transcript = conversation.transcript || ''
        let result: string
        if (conversation.status === 'completed') {
          // 간단한 성공 판단
          if (transcript.includes('예약') && (transcript.includes('완료') || transcript.includes('확정'))) {
            result = 'SUCCESS'
          } else if (transcript.includes('불가') || transcript.includes('안 됩니다')) {
            result = 'REJECTED'
          } else {
            result = 'SUCCESS'
          }
        } else {
          result = 'ERROR'
        }

        await prisma.call.update({
          where: { id: callId },
          data: {
            status: 'COMPLETED',
            result,
            summary: conversation.summary || `통화가 ${result === 'SUCCESS' ? '성공' : '실패'}했습니다.`,
            completedAt: new Date()
          }
        })
      }
    } catch (error) {
      console.error('Polling error:', error)
    }

    if (attempts >= maxAttempts) {
      clearInterval(interval)
      await prisma.call.update({
        where: { id: callId },
        data: {
          status: 'FAILED',
          result: 'ERROR',
          summary: '통화 시간이 초과되었습니다.',
          completedAt: new Date()
        }
      })
    }
  }, 3000)
}
```

---

## 파일 구조

```
lib/
└── elevenlabs.ts           ← ElevenLabs API 래퍼 + Mock mode

app/
└── api/
    └── calls/
        └── [id]/
            └── start/
                └── route.ts  ← 통화 시작 (BE2 전용)
```

---

## 체크포인트

| 시간 | 체크 |
|------|------|
| **0:50** | **Mock mode 완성 (CRITICAL)** |
| 1:05 | Agent 프롬프트 작성 완료 |
| 1:25 | start/route.ts 완성 (Mock + Real) |
| 1:45 | Outbound Call API 동작 (가능하면) |
| 2:00 | Polling 결과 수집 동작 |

---

## 테스트 명령어

```bash
# Mock mode 테스트
# 1. 먼저 BE1의 POST /api/calls로 Call 생성
curl -X POST http://localhost:3000/api/calls \
  -H "Content-Type: application/json" \
  -d '{"requestText": "내일 오후 3시에 OO미용실 커트 예약해줘", "targetPhone": "010-1234-5678"}'

# 2. 반환된 ID로 start 호출
curl -X POST http://localhost:3000/api/calls/{id}/start

# 3. 5초 후 상태 확인
curl http://localhost:3000/api/calls/{id}
# → status: "COMPLETED", result: "SUCCESS"
```

---

## 주의사항

1. **Mock mode가 최우선**: BE2-1 완성 전에 다른 태스크 진행하지 마세요
2. **전화번호 형식**: E.164 형식 필수 (+821012345678)
3. **ngrok 불필요**: Webhook 대신 Polling 사용
4. **비용 주의**: 실제 통화는 비용 발생 → 테스트는 팀원 번호로
5. **start/route.ts는 BE2 전용**: BE1이 만들지 않음

---

## Phase 2 통합 시 할 일

- FE2와 폴링 타이밍 확인 (FE: 3초, BE Mock: 5초 후 완료)
- Mock 모드로 E2E 테스트
- (가능하면) 실제 ElevenLabs 연동 테스트 (팀원 번호)
