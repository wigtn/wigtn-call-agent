# Tech Spec: 채팅 기반 정보 수집 아키텍처

> 채팅으로 정보 수집 → 구조화된 데이터 추출 → Dynamic System Prompt 생성

---

## 0. DB 연동 전략

### 비교: 실시간 저장 vs 최종 저장

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Option A: 실시간 DB 저장                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  User ──→ API ──→ Supabase 저장 ──→ LLM (DB 컨텍스트 포함)             │
│                        │                     │                          │
│                        ▼                     ▼                          │
│                   messages 테이블      최신 대화 기록 조회               │
│                                                                         │
│  장점:                                                                  │
│  • 새로고침/재접속해도 대화 유지                                         │
│  • 다른 디바이스에서 이어서 대화 가능                                     │
│  • 서버 재시작해도 데이터 유지                                           │
│  • 대화 기록 분석/통계 가능                                              │
│                                                                         │
│  단점:                                                                  │
│  • 매 메시지마다 DB I/O 발생                                            │
│  • 약간의 레이턴시 추가                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  Option B: 메모리 유지 + 최종 저장                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  User ──→ API ──→ 메모리/세션 유지 ──→ 완료 시 DB 저장                  │
│                        │                     │                          │
│                        ▼                     ▼                          │
│                  서버 메모리         conversations 테이블               │
│                  (또는 Redis)        (최종 결과만)                       │
│                                                                         │
│  장점:                                                                  │
│  • 빠름 (DB I/O 최소화)                                                 │
│  • 구현 단순                                                            │
│                                                                         │
│  단점:                                                                  │
│  • 새로고침하면 대화 손실                                                │
│  • 서버리스 환경에서 세션 유지 어려움 (Vercel 등)                        │
│  • 중간 대화 기록 없음                                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 권장: Option A (실시간 DB 저장)

**이유:**
1. Next.js on Vercel = Serverless → 메모리 세션 유지 불가
2. Supabase Realtime 활용 가능
3. 대화 중간에 이탈해도 복구 가능
4. 해커톤 데모 중 새로고침해도 안전

---

### DB 스키마 설계

```sql
-- Supabase SQL

-- 대화 세션
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'COLLECTING',  -- COLLECTING, READY, CALLING, COMPLETED, CANCELLED
  collected_data JSONB DEFAULT '{}', -- 수집된 정보 (최신 상태)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 대화 메시지
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,  -- 'user' | 'assistant'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',  -- 추가 정보 (파싱된 데이터 등)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_status ON conversations(status);

-- RLS (Row Level Security)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 본인 대화만 접근 가능
CREATE POLICY "Users can access own conversations"
  ON conversations FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can access own messages"
  ON messages FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );
```

### 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        실시간 DB 저장 흐름                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. 대화 시작                                                           │
│     ─────────────                                                       │
│     POST /api/conversations                                             │
│         │                                                               │
│         ├── conversations 테이블에 새 레코드 생성                        │
│         │   { id, user_id, status: 'COLLECTING', collected_data: {} }  │
│         │                                                               │
│         └── 초기 인사 메시지 저장                                        │
│             messages { role: 'assistant', content: '안녕하세요!' }      │
│                                                                         │
│  2. 메시지 전송                                                          │
│     ─────────────                                                       │
│     POST /api/chat                                                      │
│         │                                                               │
│         ├── ① 사용자 메시지 DB 저장                                     │
│         │   messages { role: 'user', content: '...' }                  │
│         │                                                               │
│         ├── ② DB에서 최근 메시지 조회 (최대 20개)                        │
│         │   SELECT * FROM messages                                      │
│         │   WHERE conversation_id = ? ORDER BY created_at              │
│         │                                                               │
│         ├── ③ LLM 호출 (조회된 대화 기록 포함)                           │
│         │                                                               │
│         ├── ④ Assistant 응답 파싱                                       │
│         │   { message, collected_data, is_complete }                   │
│         │                                                               │
│         ├── ⑤ Assistant 메시지 DB 저장                                  │
│         │   messages { role: 'assistant', content: '...' }             │
│         │                                                               │
│         └── ⑥ 수집 데이터 업데이트                                       │
│             UPDATE conversations                                        │
│             SET collected_data = ?,                                     │
│                 status = ?,                                             │
│                 updated_at = NOW()                                      │
│                                                                         │
│  3. 전화 시작                                                           │
│     ─────────────                                                       │
│     POST /api/calls                                                     │
│         │                                                               │
│         ├── conversations.collected_data 조회                           │
│         │                                                               │
│         ├── calls 테이블에 레코드 생성                                   │
│         │                                                               │
│         └── conversations.status = 'CALLING'                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 구현 코드

```typescript
// lib/supabase/chat.ts

import { createClient } from '@/lib/supabase/server'

// 대화 시작
export async function createConversation(userId: string) {
  const supabase = await createClient()

  // 1. 대화 세션 생성
  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      status: 'COLLECTING',
      collected_data: {}
    })
    .select()
    .single()

  if (error) throw error

  // 2. 초기 인사 메시지 저장
  const greeting = '안녕하세요! 어떤 전화를 대신 걸어드릴까요? 😊'

  await supabase.from('messages').insert({
    conversation_id: conversation.id,
    role: 'assistant',
    content: greeting
  })

  return { conversation, greeting }
}

// 대화 기록 조회 (LLM 컨텍스트용)
export async function getConversationHistory(conversationId: string) {
  const supabase = await createClient()

  const { data: messages } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(20)  // 최근 20개만 (토큰 제한)

  return messages || []
}

// 메시지 저장
export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, unknown>
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      metadata: metadata || {}
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// 수집 데이터 업데이트
export async function updateCollectedData(
  conversationId: string,
  collectedData: CollectedData,
  status?: ConversationStatus
) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {
    collected_data: collectedData,
    updated_at: new Date().toISOString()
  }

  if (status) {
    updateData.status = status
  }

  const { error } = await supabase
    .from('conversations')
    .update(updateData)
    .eq('id', conversationId)

  if (error) throw error
}

// 대화 세션 조회 (복구용)
export async function getConversation(conversationId: string) {
  const supabase = await createClient()

  const { data: conversation } = await supabase
    .from('conversations')
    .select(`
      *,
      messages (
        id, role, content, created_at
      )
    `)
    .eq('id', conversationId)
    .single()

  return conversation
}
```

### API Route 수정

```typescript
// app/api/chat/route.ts

import { OpenAI } from 'openai'
import {
  getConversationHistory,
  saveMessage,
  updateCollectedData
} from '@/lib/supabase/chat'
import { parseAssistantResponse } from '@/lib/response-parser'
import { COLLECTION_SYSTEM_PROMPT } from '@/lib/prompts'

const openai = new OpenAI()

export async function POST(request: Request) {
  const { conversationId, message } = await request.json()

  // 1. 사용자 메시지 DB 저장
  await saveMessage(conversationId, 'user', message)

  // 2. DB에서 대화 기록 조회
  const history = await getConversationHistory(conversationId)

  // 3. LLM용 메시지 구성
  const llmMessages = [
    { role: 'system' as const, content: COLLECTION_SYSTEM_PROMPT },
    ...history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))
  ]

  // 4. OpenAI 호출
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: llmMessages,
    temperature: 0.7
  })

  const assistantContent = completion.choices[0].message.content || ''

  // 5. 응답 파싱
  const parsed = parseAssistantResponse(assistantContent)

  // 6. Assistant 메시지 DB 저장
  await saveMessage(conversationId, 'assistant', parsed.message, {
    collected: parsed.collected,
    is_complete: parsed.is_complete
  })

  // 7. 수집 데이터 업데이트
  await updateCollectedData(
    conversationId,
    parsed.collected,
    parsed.is_complete ? 'READY' : 'COLLECTING'
  )

  // 8. 응답
  return Response.json({
    message: parsed.message,
    collected: parsed.collected,
    is_complete: parsed.is_complete
  })
}
```

---

### 대화 복구 (새로고침 시)

```typescript
// hooks/useChat.ts (수정)

export function useChat() {
  // ...

  // 기존 대화 복구
  const resumeConversation = useCallback(async (conversationId: string) => {
    const res = await fetch(`/api/conversations/${conversationId}`)
    const data = await res.json()

    setConversationId(data.id)
    setMessages(data.messages.map((m: DbMessage) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.created_at)
    })))
    setCollectedData(data.collected_data)
    setIsComplete(data.status === 'READY')
  }, [])

  // 페이지 로드 시 localStorage에서 conversationId 확인
  useEffect(() => {
    const savedId = localStorage.getItem('currentConversationId')
    if (savedId) {
      resumeConversation(savedId)
    } else {
      startConversation()
    }
  }, [])

  // ...
}
```

---

### 요약 생성 방식

DB에 대화가 저장되어 있으므로, 요약은 두 가지 방식 가능:

#### 방식 1: 실시간 추적 (권장)

매 턴마다 LLM이 `collected_data`를 업데이트 → 최종 상태가 곧 요약

```typescript
// 이미 구현된 방식
// LLM 응답에 collected_data 포함 → DB 저장 → 최신 상태 유지
```

#### 방식 2: 사후 요약 (필요 시)

대화 완료 후 전체 기록으로 요약 생성

```typescript
// lib/summarizer.ts

export async function summarizeConversation(conversationId: string) {
  const history = await getConversationHistory(conversationId)

  const prompt = `
다음 대화에서 수집된 정보를 JSON으로 요약하세요:

${history.map(m => `${m.role}: ${m.content}`).join('\n')}

출력 형식:
{
  "target_name": "...",
  "target_phone": "...",
  ...
}
`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0
  })

  return JSON.parse(completion.choices[0].message.content || '{}')
}
```

**권장: 방식 1** (실시간 추적)
- 추가 API 호출 불필요
- 항상 최신 상태 유지
- is_complete 판단도 동시에 가능

---

## 1. 아키텍처 선택

### 비교 분석

| 접근법 | 복잡도 | 의존성 | 해커톤 적합 |
|--------|--------|--------|------------|
| LangChain SummaryMemory | 높음 | langchain | ❌ 목적 불일치 (요약 vs 추출) |
| LangChain BufferMemory + StructuredOutput | 중간 | langchain, zod | ⚠️ 과한 복잡도 |
| **직접 구현 (Stateful Chat)** | 낮음 | openai만 | ✅ 권장 |

### 선택: 직접 구현

**이유:**
1. 대화 길이가 짧음 (5-10턴) → SummaryMemory 불필요
2. LangChain 러닝커브 → 해커톤 시간 낭비
3. 완전한 제어 가능 → 디버깅 용이
4. Next.js API Routes와 자연스러운 통합

---

## 2. 핵심 설계

### 2.1 State Machine

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Conversation State Machine                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐    정보 부족     ┌──────────┐    정보 충분           │
│  │ INITIAL  │ ──────────────→ │COLLECTING│ ──────────────→ READY  │
│  └──────────┘                 └──────────┘                         │
│       │                            │                                │
│       │         사용자 취소         │                                │
│       └─────────────────────────→ CANCELLED                        │
│                                                                     │
│  State 전이 조건:                                                   │
│  - INITIAL → COLLECTING: 첫 메시지 수신                             │
│  - COLLECTING → READY: 필수 정보 모두 수집 완료                      │
│  - READY → CALLING: [전화 걸기] 클릭                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 구조

```typescript
// types/chat.ts

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface CollectedData {
  // 필수 (모두 채워져야 READY)
  target_name: string | null
  target_phone: string | null
  scenario_type: 'RESERVATION' | 'INQUIRY' | 'AS_REQUEST' | null
  primary_datetime: string | null  // ISO 8601

  // 선택 (있으면 좋음)
  service: string | null
  fallback_datetimes: string[]     // 대안 시간들
  fallback_action: 'ask_available' | 'next_day' | 'cancel' | null
  customer_name: string | null
  party_size: number | null
  special_request: string | null
}

interface ConversationState {
  id: string
  status: 'INITIAL' | 'COLLECTING' | 'READY' | 'CALLING' | 'COMPLETED' | 'CANCELLED'
  messages: Message[]
  collectedData: CollectedData
  missingFields: string[]          // 아직 수집 안 된 필수 필드
  createdAt: Date
  updatedAt: Date
}
```

### 2.3 수집 완료 판단 로직

```typescript
// lib/collection-checker.ts

const REQUIRED_FIELDS = [
  'target_name',
  'target_phone',
  'scenario_type',
  'primary_datetime'
] as const

const RECOMMENDED_FIELDS = [
  'fallback_datetimes',  // 최소 1개 대안
  'fallback_action'
] as const

function checkCollectionStatus(data: CollectedData): {
  isComplete: boolean
  missingRequired: string[]
  missingRecommended: string[]
} {
  const missingRequired = REQUIRED_FIELDS.filter(field =>
    data[field] === null || data[field] === undefined
  )

  const missingRecommended = RECOMMENDED_FIELDS.filter(field => {
    if (field === 'fallback_datetimes') {
      return !data.fallback_datetimes?.length
    }
    return data[field] === null
  })

  return {
    isComplete: missingRequired.length === 0,
    missingRequired,
    missingRecommended
  }
}
```

---

## 3. LLM 프롬프트 설계

### 3.1 System Prompt (정보 수집 에이전트)

```typescript
const COLLECTION_SYSTEM_PROMPT = `
당신은 WIGVO의 AI 비서입니다.
사용자의 전화 예약/문의 요청에 필요한 정보를 대화로 수집합니다.

## 수집할 정보

### 필수 (반드시 수집)
1. target_name: 전화할 곳 이름 (예: "OO미용실")
2. target_phone: 전화번호 (예: "010-1234-5678")
3. scenario_type: 용건 유형
   - RESERVATION: 예약
   - INQUIRY: 문의
   - AS_REQUEST: AS/수리 접수
4. primary_datetime: 희망 일시 (예: "내일 오후 3시")

### 권장 (가능하면 수집)
5. service: 구체적 서비스 (예: "남자 커트", "매물 확인")
6. fallback_datetimes: 대안 시간 (희망 시간 불가 시)
7. fallback_action: 불가 시 대응 방법
   - ask_available: 가능한 시간 물어보기
   - next_day: 다음 날로 변경
   - cancel: 예약 포기
8. customer_name: 예약자 이름
9. party_size: 인원수 (해당 시)
10. special_request: 특별 요청

## 대화 규칙

1. 한 번에 1-2개 질문만
2. 자연스러운 해요체 사용
3. 모호한 답변은 명확히 재확인
4. 정보가 충분하면 요약 후 확인 요청

## 출력 형식

매 응답마다 다음 JSON을 포함하세요 (마지막 줄에):

\`\`\`json
{
  "collected": {
    "target_name": "OO미용실",
    "target_phone": null,
    "scenario_type": "RESERVATION",
    "primary_datetime": null,
    "service": "남자 커트",
    "fallback_datetimes": [],
    "fallback_action": null,
    "customer_name": null,
    "party_size": null,
    "special_request": null
  },
  "is_complete": false,
  "next_question": "target_phone"
}
\`\`\`

## 완료 시

모든 필수 정보 + 최소 1개 대안 정보 수집 완료 시:
1. 수집된 정보 요약
2. "맞으시면 전화 걸어볼게요!" 메시지
3. is_complete: true 로 설정
`
```

### 3.2 응답 파싱

```typescript
// lib/response-parser.ts

interface LLMResponse {
  message: string           // 사용자에게 보여줄 메시지
  collected: CollectedData  // 현재까지 수집된 데이터
  is_complete: boolean      // 수집 완료 여부
  next_question?: string    // 다음에 물어볼 필드
}

function parseAssistantResponse(content: string): LLMResponse {
  // JSON 블록 추출
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)

  if (!jsonMatch) {
    // JSON 없으면 메시지만 반환 (fallback)
    return {
      message: content,
      collected: createEmptyCollectedData(),
      is_complete: false
    }
  }

  const jsonData = JSON.parse(jsonMatch[1])

  // JSON 블록 제거한 메시지
  const message = content.replace(/```json\n[\s\S]*?\n```/, '').trim()

  return {
    message,
    collected: jsonData.collected,
    is_complete: jsonData.is_complete,
    next_question: jsonData.next_question
  }
}
```

---

## 4. API 설계

### 4.1 채팅 API

```typescript
// app/api/chat/route.ts

import { OpenAI } from 'openai'

const openai = new OpenAI()

export async function POST(request: Request) {
  const { conversationId, message } = await request.json()

  // 1. 기존 대화 기록 조회
  const conversation = await getConversation(conversationId)

  // 2. 메시지 추가
  const messages = [
    { role: 'system', content: COLLECTION_SYSTEM_PROMPT },
    ...conversation.messages.map(m => ({
      role: m.role,
      content: m.content
    })),
    { role: 'user', content: message }
  ]

  // 3. OpenAI 호출
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',  // 비용 효율
    messages,
    temperature: 0.7
  })

  const assistantContent = completion.choices[0].message.content

  // 4. 응답 파싱
  const parsed = parseAssistantResponse(assistantContent)

  // 5. 상태 업데이트
  await updateConversation(conversationId, {
    messages: [
      ...conversation.messages,
      { role: 'user', content: message },
      { role: 'assistant', content: parsed.message }
    ],
    collectedData: parsed.collected,
    status: parsed.is_complete ? 'READY' : 'COLLECTING'
  })

  // 6. 응답
  return Response.json({
    message: parsed.message,
    collected: parsed.collected,
    is_complete: parsed.is_complete,
    conversation_status: parsed.is_complete ? 'READY' : 'COLLECTING'
  })
}
```

### 4.2 대화 시작 API

```typescript
// app/api/conversations/route.ts

export async function POST(request: Request) {
  const { userId } = await request.json()

  const conversation = await createConversation({
    userId,
    status: 'INITIAL',
    messages: [],
    collectedData: createEmptyCollectedData()
  })

  // 초기 인사 메시지
  const greeting = "안녕하세요! 어떤 전화를 대신 걸어드릴까요? 😊"

  await addMessage(conversation.id, {
    role: 'assistant',
    content: greeting
  })

  return Response.json({
    conversationId: conversation.id,
    message: greeting
  })
}
```

---

## 5. 프론트엔드 연동

### 5.1 Chat Hook

```typescript
// hooks/useChat.ts

import { useState, useCallback } from 'react'

interface UseChatReturn {
  messages: Message[]
  collectedData: CollectedData | null
  isComplete: boolean
  isLoading: boolean
  sendMessage: (content: string) => Promise<void>
  startConversation: () => Promise<void>
}

export function useChat(): UseChatReturn {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [collectedData, setCollectedData] = useState<CollectedData | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const startConversation = useCallback(async () => {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const data = await res.json()

    setConversationId(data.conversationId)
    setMessages([{
      id: crypto.randomUUID(),
      role: 'assistant',
      content: data.message,
      timestamp: new Date()
    }])
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId) return

    // Optimistic update
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message: content })
      })
      const data = await res.json()

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
      setCollectedData(data.collected)
      setIsComplete(data.is_complete)
    } finally {
      setIsLoading(false)
    }
  }, [conversationId])

  return {
    messages,
    collectedData,
    isComplete,
    isLoading,
    sendMessage,
    startConversation
  }
}
```

### 5.2 Chat UI Component

```tsx
// components/chat/ChatContainer.tsx

'use client'

import { useEffect } from 'react'
import { useChat } from '@/hooks/useChat'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { CollectionSummary } from './CollectionSummary'

export function ChatContainer() {
  const {
    messages,
    collectedData,
    isComplete,
    isLoading,
    sendMessage,
    startConversation
  } = useChat()

  useEffect(() => {
    startConversation()
  }, [startConversation])

  const handleStartCall = async () => {
    // 전화 시작 API 호출
    const res = await fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectedData })
    })
    const { callId } = await res.json()

    // 통화 중 화면으로 이동
    window.location.href = `/calling/${callId}`
  }

  return (
    <div className="flex flex-col h-full">
      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="text-gray-400">입력 중...</div>
        )}
      </div>

      {/* 수집 완료 시 요약 + 버튼 */}
      {isComplete && collectedData && (
        <CollectionSummary
          data={collectedData}
          onConfirm={handleStartCall}
          onEdit={() => sendMessage('수정할게요')}
        />
      )}

      {/* 입력창 */}
      {!isComplete && (
        <ChatInput
          onSend={sendMessage}
          disabled={isLoading}
        />
      )}
    </div>
  )
}
```

---

## 6. 대안: LangChain 사용 시

만약 LangChain을 쓴다면 이렇게 구현:

```typescript
// lib/langchain-chat.ts (참고용)

import { ChatOpenAI } from '@langchain/openai'
import { ConversationChain } from 'langchain/chains'
import { BufferMemory } from 'langchain/memory'
import { StructuredOutputParser } from 'langchain/output_parsers'
import { z } from 'zod'

// Zod 스키마로 출력 구조 정의
const CollectedDataSchema = z.object({
  target_name: z.string().nullable(),
  target_phone: z.string().nullable(),
  scenario_type: z.enum(['RESERVATION', 'INQUIRY', 'AS_REQUEST']).nullable(),
  primary_datetime: z.string().nullable(),
  service: z.string().nullable(),
  fallback_datetimes: z.array(z.string()),
  fallback_action: z.enum(['ask_available', 'next_day', 'cancel']).nullable(),
  customer_name: z.string().nullable(),
  party_size: z.number().nullable(),
  special_request: z.string().nullable(),
  is_complete: z.boolean()
})

const parser = StructuredOutputParser.fromZodSchema(CollectedDataSchema)

const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.7
})

const memory = new BufferMemory({
  returnMessages: true,
  memoryKey: 'chat_history'
})

const chain = new ConversationChain({
  llm: model,
  memory,
  // ... prompt template with parser.getFormatInstructions()
})

async function chat(userInput: string) {
  const response = await chain.call({ input: userInput })
  const parsed = await parser.parse(response.response)
  return parsed
}
```

**LangChain 장점:**
- `BufferMemory`가 대화 기록 자동 관리
- `StructuredOutputParser`가 JSON 추출 보장
- 체인 구조로 확장 용이

**단점:**
- 의존성 추가 (`langchain`, `@langchain/openai`, `zod`)
- 추상화 레이어로 디버깅 어려움
- 해커톤 시간 내 러닝커브

---

## 7. 최종 권장 사항

### 해커톤용: 직접 구현

```
의존성: openai 만
복잡도: 낮음
파일 수: 3-4개
구현 시간: 1-2시간
```

### 프로덕션용: LangChain 고려

```
의존성: langchain, @langchain/openai, zod
복잡도: 중간
장점: 확장성, 메모리 관리, 타입 안전
구현 시간: 3-4시간 (러닝커브 포함)
```

---

## 8. 구현 체크리스트

### 직접 구현 시

- [ ] `types/chat.ts` - 타입 정의
- [ ] `lib/collection-checker.ts` - 수집 완료 판단
- [ ] `lib/response-parser.ts` - LLM 응답 파싱
- [ ] `app/api/conversations/route.ts` - 대화 시작
- [ ] `app/api/chat/route.ts` - 메시지 전송
- [ ] `hooks/useChat.ts` - 프론트엔드 훅
- [ ] `components/chat/*.tsx` - UI 컴포넌트

### 테스트 시나리오

1. 미용실 예약 (기본)
2. 대안 시간 수집
3. 정보 불명확 → 재질문
4. 수집 완료 → 요약 표시
