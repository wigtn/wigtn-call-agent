# BE2: ElevenLabs + Dynamic Prompt 개발 지시서 (v2)

> **프로젝트**: WIGVO (4시간 해커톤)
> **역할**: BE2 - ElevenLabs 연동 + Dynamic Prompt 담당
> **담당 시간**: Phase 1 (0:30-2:00)
> **버전**: v2 (Dynamic Agent Platform)

## Mode Selection (자동)

사용자의 요청 의도를 파악하여 적절한 모드로 동작하세요:

| 사용자 의도 | 모드 | 동작 |
|------------|------|------|
| 태스크 구현 요청 ("BE2-1 시작해", "Mock mode 만들어줘") | **Agent** | 아래 태스크 목록에서 해당 항목을 찾아 바로 구현 |
| 복잡한 기능 시작 ("ElevenLabs 연동 전체 설계해줘") | **Plan → Agent** | 계획 수립 → 사용자 승인 → 구현 |
| 버그/에러 수정 ("통화가 안 걸려", "Mock이 완료 안 돼") | **Debug** | 로그 삽입 → 원인 추적 → 수정 |
| 코드 이해/질문 ("elevenlabs.ts 구조 설명해줘") | **Ask** | 코드를 읽고 설명만, 수정하지 않음 |

> 명시적 모드 지정이 없으면 **Agent 모드**로 진행하세요.

---

## IMPORTANT: 필독 문서

작업 시작 전에 반드시 읽어야 할 파일들:
1. **`.cursorrules`** — 프로젝트 전체 규칙, 아키텍처, 코딩 컨벤션
2. **`.cursor/rules/team-workflow.mdc`** — 파일 오너십, 충돌 방지 규칙
3. **`.cursor/rules/api-contract.mdc`** — API 요청/응답 스키마 (SSOT)
4. **`docs/TECH_chat-collection-architecture.md`** — 채팅 수집 기술 스펙

---

## File Ownership

### BE2가 소유하는 파일 (ONLY these)
```
app/api/calls/[id]/start/route.ts
lib/elevenlabs.ts
lib/prompt-generator.ts           # 신규: Dynamic Prompt 생성
```

### 절대 수정하지 마세요
- `app/api/calls/route.ts` — BE1 소유
- `app/api/calls/[id]/route.ts` — BE1 소유
- `app/api/conversations/` — BE1 소유
- `app/api/chat/` — BE1 소유
- `app/auth/` — BE1 소유
- `lib/prisma.ts` — BE1 소유
- `lib/supabase/` — BE1 소유 (import는 자유, 수정 금지)
- `shared/types.ts` — BE1 소유 (읽기만 가능)
- `middleware.ts` — BE1 소유
- `app/page.tsx`, `app/login/` — FE1 소유
- `app/calling/`, `app/result/`, `app/history/` — FE2 소유
- `components/` — FE1, FE2 소유

---

## 역할 요약 (v2)

**ElevenLabs Conversational AI**를 사용하여 실제 전화를 거는 기능 + **채팅에서 수집한 데이터로 Dynamic System Prompt**를 생성합니다.

```
[당신이 만드는 부분 - v2]

┌─────────────────────────────────────────────────────────────────────┐
│                  Dynamic Prompt Generator (신규 v2)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CollectedData (BE1에서 전달)                                        │
│  ├── target_name: "OO미용실"                                         │
│  ├── target_phone: "010-1234-5678"                                  │
│  ├── scenario_type: "RESERVATION"                                   │
│  ├── primary_datetime: "내일 오후 3시"                               │
│  ├── service: "남자 커트"                                            │
│  ├── fallback_datetimes: ["모레 오전"]                               │
│  ├── fallback_action: "ask_available"                               │
│  └── customer_name: "김철수"                                         │
│                        │                                            │
│                        ▼                                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │            lib/prompt-generator.ts                            │  │
│  │                                                               │  │
│  │  generateDynamicPrompt(collectedData) → System Prompt         │  │
│  │                                                               │  │
│  │  출력:                                                        │  │
│  │  "OO미용실에 전화해서 내일 오후 3시에 남자 커트 예약을           │  │
│  │   요청하세요. 예약자 이름은 김철수입니다.                       │  │
│  │   희망 시간 불가 시 가능한 시간을 물어보세요."                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                        │                                            │
│                        ▼                                            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ElevenLabs Integration                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Mock Mode (BE2-1, 최우선)                                       │
│     └── 실제 API 없이 전체 플로우 동작                               │
│                                                                     │
│  2. Start Route (POST /api/calls/[id]/start)                       │
│     ├── Call 정보 조회                                              │
│     ├── conversation.collected_data 조회                            │
│     ├── Dynamic Prompt 생성                                         │
│     └── ElevenLabs Outbound Call 시작                               │
│                                                                     │
│  3. Polling-based 결과 수집                                         │
│     └── 통화 완료 시 결과 DB 업데이트                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 태스크 목록

### BE2-1: Dynamic Prompt Generator (신규, 20분)

**파일**: `lib/prompt-generator.ts`

**목적**: 채팅에서 수집한 `CollectedData`를 ElevenLabs Agent가 이해할 수 있는 Dynamic System Prompt로 변환

```typescript
// lib/prompt-generator.ts

import { CollectedData } from '@/shared/types'

interface DynamicPromptResult {
  systemPrompt: string
  dynamicVariables: Record<string, string>
}

export function generateDynamicPrompt(data: CollectedData): DynamicPromptResult {
  // 시나리오별 기본 프롬프트 템플릿
  const templates = {
    RESERVATION: generateReservationPrompt(data),
    INQUIRY: generateInquiryPrompt(data),
    AS_REQUEST: generateASRequestPrompt(data)
  }

  const scenarioType = data.scenario_type || 'RESERVATION'
  const template = templates[scenarioType]

  return {
    systemPrompt: template.systemPrompt,
    dynamicVariables: template.dynamicVariables
  }
}

function generateReservationPrompt(data: CollectedData): DynamicPromptResult {
  const targetName = data.target_name || '업체'
  const datetime = data.primary_datetime || '희망 시간'
  const service = data.service || '예약'
  const customerName = data.customer_name || '고객'
  const partySize = data.party_size || 1

  // Fallback 전략 생성
  let fallbackInstruction = ''
  if (data.fallback_action === 'ask_available') {
    fallbackInstruction = '희망 시간이 불가능하면 "그럼 언제 가능한지 알려주시겠어요?"라고 물어보세요.'
  } else if (data.fallback_action === 'next_day') {
    const fallbacks = data.fallback_datetimes?.join(', ') || '다음 날'
    fallbackInstruction = `희망 시간이 불가능하면 "${fallbacks}"은 어떤지 물어보세요.`
  } else if (data.fallback_action === 'cancel') {
    fallbackInstruction = '희망 시간이 불가능하면 정중히 끊으세요.'
  }

  // 특별 요청
  const specialRequest = data.special_request
    ? `\n\n## 특별 요청\n"${data.special_request}"도 전달해주세요.`
    : ''

  const systemPrompt = `
당신은 고객을 대신해 ${targetName}에 전화를 거는 AI 비서입니다.

## 목표
${datetime}에 ${service} 예약을 요청하세요.

## 예약 정보
- 장소: ${targetName}
- 희망 일시: ${datetime}
- 서비스: ${service}
- 예약자: ${customerName}
- 인원: ${partySize}명

## 대화 흐름
1. 인사: "안녕하세요, 예약 문의 드립니다."
2. 요청: "${datetime}에 ${service} 예약 가능할까요?"
3. 가능 → 예약 확정: "네, 그럼 ${customerName} 이름으로 예약 부탁드립니다."
4. 불가 → ${fallbackInstruction || '다른 시간을 물어보세요.'}
5. 마무리: "감사합니다. 좋은 하루 되세요."
${specialRequest}

## 규칙
- 자연스러운 한국어 해요체 사용
- 예약이 확정되면 일시와 이름을 다시 확인
- 상대방이 못 알아들으면 천천히 다시 말하기
`.trim()

  return {
    systemPrompt,
    dynamicVariables: {
      target_name: targetName,
      datetime,
      service,
      customer_name: customerName,
      party_size: String(partySize)
    }
  }
}

function generateInquiryPrompt(data: CollectedData): DynamicPromptResult {
  const targetName = data.target_name || '업체'
  const service = data.service || '서비스'
  const specialRequest = data.special_request || '문의 사항'

  const systemPrompt = `
당신은 고객을 대신해 ${targetName}에 전화를 거는 AI 비서입니다.

## 목표
${service}에 대해 문의하세요.

## 문의 내용
${specialRequest}

## 대화 흐름
1. 인사: "안녕하세요, 문의 드릴 게 있어서 전화드렸습니다."
2. 질문: "${specialRequest}"
3. 답변 경청 후 필요시 추가 질문
4. 마무리: "알려주셔서 감사합니다. 좋은 하루 되세요."

## 규칙
- 자연스러운 한국어 해요체 사용
- 중요한 정보는 다시 확인
- 상대방이 못 알아들으면 천천히 다시 말하기
`.trim()

  return {
    systemPrompt,
    dynamicVariables: {
      target_name: targetName,
      service,
      question: specialRequest
    }
  }
}

function generateASRequestPrompt(data: CollectedData): DynamicPromptResult {
  const targetName = data.target_name || '업체'
  const datetime = data.primary_datetime || '가능한 빠른 시간'
  const service = data.service || 'AS'
  const customerName = data.customer_name || '고객'
  const specialRequest = data.special_request || '수리 요청'

  const systemPrompt = `
당신은 고객을 대신해 ${targetName}에 전화를 거는 AI 비서입니다.

## 목표
${service} AS/수리 접수를 요청하세요.

## 접수 정보
- 업체: ${targetName}
- 희망 방문일: ${datetime}
- 서비스: ${service}
- 고객명: ${customerName}
- 증상: ${specialRequest}

## 대화 흐름
1. 인사: "안녕하세요, AS 접수 문의 드립니다."
2. 설명: "${service}가 ${specialRequest} 상태인데 수리 가능할까요?"
3. 가능 → 일정 조율: "${datetime}에 방문 가능하실까요?"
4. 마무리: "감사합니다. ${customerName} 이름으로 접수 부탁드립니다."

## 규칙
- 자연스러운 한국어 해요체 사용
- 방문 일정과 예상 비용 확인
- 상대방이 못 알아들으면 천천히 다시 말하기
`.trim()

  return {
    systemPrompt,
    dynamicVariables: {
      target_name: targetName,
      datetime,
      service,
      customer_name: customerName,
      issue: specialRequest
    }
  }
}

// ElevenLabs Dynamic Variables 형식으로 변환
export function formatForElevenLabs(data: CollectedData): Record<string, string> {
  const { dynamicVariables } = generateDynamicPrompt(data)
  return dynamicVariables
}
```

---

### BE2-2: Mock Mode + ElevenLabs 연동 (20분)

**파일**: `lib/elevenlabs.ts`

```typescript
// lib/elevenlabs.ts

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ''
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID || ''
const ELEVENLABS_PHONE_NUMBER_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID || ''
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
    console.log('🎭 Dynamic variables:', dynamicVariables)
    return {
      conversation_id: `mock_${Date.now()}`,
      status: 'initiated'
    }
  }

  // 실제 API 호출 (ElevenLabs + Twilio Outbound Call)
  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/convai/twilio/outbound-call`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_id: ELEVENLABS_AGENT_ID,
        agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
        to_number: phoneNumber,
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

---

### BE2-3: POST /api/calls/[id]/start (v2) (25분)

**파일**: `app/api/calls/[id]/start/route.ts`

```typescript
// app/api/calls/[id]/start/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startOutboundCall, isMockMode, getConversation } from '@/lib/elevenlabs'
import { generateDynamicPrompt, formatForElevenLabs } from '@/lib/prompt-generator'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // 1. Call 정보 조회
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*, conversations(collected_data)')
      .eq('id', params.id)
      .single()

    if (callError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // 2. 상태를 CALLING으로 변경
    await supabase
      .from('calls')
      .update({ status: 'CALLING' })
      .eq('id', params.id)

    // 3. collected_data에서 Dynamic Prompt 생성
    const collectedData = call.conversations?.collected_data || {}
    const { systemPrompt, dynamicVariables } = generateDynamicPrompt(collectedData)

    console.log('📞 Starting call with dynamic prompt:')
    console.log('System Prompt:', systemPrompt.substring(0, 200) + '...')
    console.log('Dynamic Variables:', dynamicVariables)

    // 4. ElevenLabs Outbound Call 시작 (or Mock)
    const phoneNumber = formatPhoneNumber(call.target_phone)

    const result = await startOutboundCall(phoneNumber, {
      ...dynamicVariables,
      call_id: call.id
    })

    // 5. conversationId 저장 + IN_PROGRESS
    await supabase
      .from('calls')
      .update({
        elevenlabs_conversation_id: result.conversation_id,
        status: 'IN_PROGRESS'
      })
      .eq('id', params.id)

    // 6. Mock mode: 5초 후 자동 완료
    if (isMockMode()) {
      setTimeout(async () => {
        try {
          const mockSummary = generateMockSummary(collectedData)

          await supabase
            .from('calls')
            .update({
              status: 'COMPLETED',
              result: 'SUCCESS',
              summary: mockSummary,
              completed_at: new Date().toISOString()
            })
            .eq('id', params.id)

          // conversation status도 업데이트
          if (call.conversation_id) {
            await supabase
              .from('conversations')
              .update({ status: 'COMPLETED' })
              .eq('id', call.conversation_id)
          }

          console.log('🎭 Mock: Call completed for', params.id)
        } catch (e) {
          console.error('Mock completion error:', e)
        }
      }, 5000)
    } else {
      // Real mode: Polling 시작
      pollConversationResult(supabase, params.id, result.conversation_id, call.conversation_id)
    }

    return NextResponse.json({
      success: true,
      conversationId: result.conversation_id
    })

  } catch (error) {
    console.error('Error starting call:', error)

    const supabase = await createClient()

    // 실패 시 상태 업데이트
    await supabase
      .from('calls')
      .update({
        status: 'FAILED',
        result: 'ERROR'
      })
      .eq('id', params.id)

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
  if (cleaned.startsWith('02')) {
    return `+82${cleaned.slice(1)}`
  }
  return `+82${cleaned}`
}

// Mock 모드용 요약 생성
function generateMockSummary(collectedData: any): string {
  const targetName = collectedData.target_name || '업체'
  const datetime = collectedData.primary_datetime || '요청 시간'
  const service = collectedData.service || '예약'
  const scenarioType = collectedData.scenario_type || 'RESERVATION'

  if (scenarioType === 'RESERVATION') {
    return `${targetName}에 ${datetime} ${service} 예약이 완료되었습니다. (Mock)`
  } else if (scenarioType === 'INQUIRY') {
    return `${targetName}에 문의가 완료되었습니다. (Mock)`
  } else {
    return `${targetName}에 AS 접수가 완료되었습니다. (Mock)`
  }
}

// Real mode: 통화 결과 폴링
async function pollConversationResult(
  supabase: any,
  callId: string,
  elevenlabsConversationId: string,
  conversationId: string | null
) {
  const maxAttempts = 60  // 최대 3분 (3초 * 60)
  let attempts = 0

  const interval = setInterval(async () => {
    attempts++

    try {
      const conversation = await getConversation(elevenlabsConversationId)

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

        await supabase
          .from('calls')
          .update({
            status: 'COMPLETED',
            result,
            summary: conversation.summary || `통화가 ${result === 'SUCCESS' ? '성공' : '실패'}했습니다.`,
            completed_at: new Date().toISOString()
          })
          .eq('id', callId)

        // conversation status도 업데이트
        if (conversationId) {
          await supabase
            .from('conversations')
            .update({ status: 'COMPLETED' })
            .eq('id', conversationId)
        }
      }
    } catch (error) {
      console.error('Polling error:', error)
    }

    if (attempts >= maxAttempts) {
      clearInterval(interval)
      await supabase
        .from('calls')
        .update({
          status: 'FAILED',
          result: 'ERROR',
          summary: '통화 시간이 초과되었습니다.',
          completed_at: new Date().toISOString()
        })
        .eq('id', callId)
    }
  }, 3000)
}
```

---

## CollectedData → Dynamic Variables 매핑

| CollectedData 필드 | ElevenLabs Dynamic Variable | 설명 |
|-------------------|----------------------------|------|
| `target_name` | `target_name` | 전화할 곳 이름 |
| `primary_datetime` | `datetime` | 희망 일시 |
| `service` | `service` | 서비스 종류 |
| `customer_name` | `customer_name` | 예약자 이름 |
| `party_size` | `party_size` | 인원수 |
| `fallback_datetimes` | (프롬프트에 포함) | 대안 시간 |
| `fallback_action` | (프롬프트에 포함) | 불가 시 대응 |
| `special_request` | `special_request` | 특별 요청 |

---

## 체크포인트

| 시간 | 체크 |
|------|------|
| **0:50** | **Dynamic Prompt Generator 완성** |
| 1:05 | lib/elevenlabs.ts 완성 |
| **1:25** | **Mock mode 완성 (CRITICAL)** |
| 1:45 | start/route.ts 완성 (Mock + Real) |
| 2:00 | Polling 결과 수집 동작 |

---

## 테스트 명령어

```bash
# Mock mode 테스트 (BE1 API가 준비된 후)
# 1. 채팅으로 정보 수집 완료
# 2. Call 생성
curl -X POST http://localhost:3000/api/calls \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "{conversation_id}"}'

# 3. Start 호출
curl -X POST http://localhost:3000/api/calls/{call_id}/start

# 4. 5초 후 상태 확인
curl http://localhost:3000/api/calls/{call_id}
# → status: "COMPLETED", result: "SUCCESS"
```

---

## 주의사항

1. **Mock mode가 최우선**: BE2-1, BE2-3 Mock 완성 전에 다른 태스크 진행하지 마세요
2. **Dynamic Prompt**: collected_data 형식은 BE1의 `shared/types.ts` 참고
3. **전화번호 형식**: E.164 형식 필수 (+821012345678)
4. **비용 주의**: 실제 통화는 비용 발생 → 테스트는 팀원 번호로

---

## Phase 2 통합 시 할 일

- BE1에게 collected_data 형식 확인
- FE2와 폴링 타이밍 확인 (FE: 3초, BE Mock: 5초 후 완료)
- Mock 모드로 E2E 테스트
- Dynamic Prompt가 시나리오별로 잘 생성되는지 확인
