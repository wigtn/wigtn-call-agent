# BE1: API + DB 개발 지시서 (v2)

> **프로젝트**: WIGVO (4시간 해커톤)
> **역할**: BE1 - API + DB 담당
> **담당 시간**: Phase 0 리드 + Phase 1 (0:00-2:00)
> **버전**: v2 (Dynamic Agent Platform - 채팅 기반 정보 수집)

## Mode Selection (자동)

사용자의 요청 의도를 파악하여 적절한 모드로 동작하세요:

| 사용자 의도 | 모드 | 동작 |
|------------|------|------|
| 태스크 구현 요청 ("BE1-1 시작해", "API 만들어줘") | **Agent** | 아래 태스크 목록에서 해당 항목을 찾아 바로 구현 |
| 복잡한 기능 시작 ("채팅 API 전체 설계해줘", "어떻게 구현할지 계획 세워줘") | **Plan → Agent** | 계획 수립 → 사용자 승인 → 구현 |
| 버그/에러 수정 ("API가 500 에러 나", "대화가 저장 안 돼") | **Debug** | 로그 삽입 → 원인 추적 → 수정 |
| 코드 이해/질문 ("이 구조 어떻게 돼있어?", "types.ts 설명해줘") | **Ask** | 코드를 읽고 설명만, 수정하지 않음 |

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

### BE1이 소유하는 파일 (ONLY these)
```
lib/supabase/client.ts
lib/supabase/server.ts
lib/supabase/chat.ts              # 신규: 대화 DB 함수
lib/prompts.ts                    # 신규: System Prompt 템플릿
lib/response-parser.ts            # 신규: LLM 응답 파싱
shared/types.ts
app/api/conversations/route.ts    # 신규: POST (대화 시작)
app/api/conversations/[id]/route.ts  # 신규: GET (대화 복구)
app/api/chat/route.ts             # 신규: POST (메시지 전송)
app/api/calls/route.ts
app/api/calls/[id]/route.ts
app/auth/callback/route.ts
middleware.ts
```

### 절대 수정하지 마세요
- `app/api/calls/[id]/start/route.ts` — **BE2 전용**
- `lib/elevenlabs.ts` — BE2 소유
- `lib/prompt-generator.ts` — BE2 소유
- `app/page.tsx`, `app/login/page.tsx` — FE1 소유
- `app/calling/`, `app/result/`, `app/history/` — FE2 소유
- `components/` — FE1, FE2 소유

---

## 역할 요약 (v2)

프로젝트 초기 설정을 리드하고, **Supabase Auth**, **Supabase PostgreSQL**, **채팅 API**, **정보 수집 LLM**을 개발합니다.

```
[당신이 만드는 부분 - v2]

┌─────────────────────────────────────────────────────────────────────┐
│                      Auth Layer (Supabase)                           │
├─────────────────────────────────────────────────────────────────────┤
│  middleware.ts         → 세션 갱신 + 미인증 /login redirect           │
│  lib/supabase/         → client.ts (브라우저) + server.ts (서버)      │
│  app/auth/callback/    → OAuth 콜백 핸들러                            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Chat API Layer (신규 v2)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  POST /api/conversations                                            │
│  ├── 새 대화 세션 생성 (Supabase conversations 테이블)               │
│  └── 초기 인사 메시지 반환                                           │
│                                                                     │
│  POST /api/chat                                                     │
│  ├── 사용자 메시지 DB 저장                                           │
│  ├── DB에서 대화 기록 조회                                           │
│  ├── GPT-4o-mini로 정보 수집 대화                                    │
│  ├── 응답 파싱 (메시지 + collected_data)                             │
│  ├── Assistant 메시지 DB 저장                                        │
│  └── collected_data 업데이트                                         │
│                                                                     │
│  GET /api/conversations/[id]                                        │
│  └── 대화 복구 (새로고침 시)                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Call API Layer                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  POST /api/calls (v2 수정)                                          │
│  ├── conversationId로 collected_data 조회                           │
│  └── Call 레코드 생성                                                │
│                                                                     │
│  GET /api/calls/[id]                                                │
│  └── 통화 상태 및 결과 조회                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Database (Supabase PostgreSQL)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  conversations (신규)                                                │
│  ├── id, user_id, status                                            │
│  └── collected_data (JSONB), created_at, updated_at                 │
│                                                                     │
│  messages (신규)                                                     │
│  ├── id, conversation_id, role, content                             │
│  └── metadata (JSONB), created_at                                   │
│                                                                     │
│  calls (수정: conversation_id 추가)                                  │
│  ├── id, user_id, conversation_id                                   │
│  ├── request_type, target_name, target_phone                        │
│  └── status, result, summary, created_at, completed_at              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: 프로젝트 셋업 (0:00-0:30)

> **당신이 리드** - 다른 팀원들은 환경 설정

### 0.1 필수 패키지 설치

```bash
npm install openai @supabase/supabase-js @supabase/ssr
```

### 0.2 디렉토리 구조 생성

```bash
mkdir -p app/api/conversations/[id]
mkdir -p app/api/chat
mkdir -p components/chat
```

### 0.3 환경 변수 설정

```bash
# .env.local (Supabase Client 직접 사용, Prisma 미사용)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

OPENAI_API_KEY=sk-...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## Phase 1: 핵심 기능 개발 (0:30-2:00)

### BE1-1: Supabase 테이블 생성 (15분)

**Supabase Dashboard → SQL Editor에서 실행:**

```sql
-- conversations (대화 세션)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'COLLECTING',  -- COLLECTING, READY, CALLING, COMPLETED, CANCELLED
  collected_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- messages (대화 메시지)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,  -- 'user' | 'assistant'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- calls (전화 기록) - conversation_id 추가
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  conversation_id UUID REFERENCES conversations(id),
  request_type TEXT DEFAULT 'RESERVATION',
  target_name TEXT NOT NULL,
  target_phone TEXT NOT NULL,
  parsed_date TEXT,
  parsed_time TEXT,
  parsed_service TEXT,
  status TEXT DEFAULT 'PENDING',
  result TEXT,
  summary TEXT,
  elevenlabs_conversation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_calls_user ON calls(user_id);

-- RLS (Row Level Security)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- 본인 데이터만 접근 가능
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

CREATE POLICY "Users can access own calls"
  ON calls FOR ALL
  USING (auth.uid() = user_id);
```

---

### BE1-2: 공유 타입 정의 (10분)

**파일**: `shared/types.ts`

```typescript
// shared/types.ts

// ============================================
// Conversation 관련 타입
// ============================================

export type ConversationStatus =
  | 'COLLECTING'
  | 'READY'
  | 'CALLING'
  | 'COMPLETED'
  | 'CANCELLED'

export interface CollectedData {
  target_name: string | null
  target_phone: string | null
  scenario_type: 'RESERVATION' | 'INQUIRY' | 'AS_REQUEST' | null
  primary_datetime: string | null
  service: string | null
  fallback_datetimes: string[]
  fallback_action: 'ASK_AVAILABLE' | 'NEXT_DAY' | 'CANCEL' | null
  customer_name: string | null
  party_size: number | null
  special_request: string | null
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface Conversation {
  id: string
  userId: string
  status: ConversationStatus
  collectedData: CollectedData
  messages: Message[]
  createdAt: string
  updatedAt: string
}

// ============================================
// Call 관련 타입
// ============================================

export interface Call {
  id: string
  userId: string
  conversationId: string
  requestType: 'RESERVATION' | 'INQUIRY' | 'AS_REQUEST'
  targetName: string
  targetPhone: string
  parsedDate?: string
  parsedTime?: string
  parsedService?: string
  status: 'PENDING' | 'CALLING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  result?: 'SUCCESS' | 'NO_ANSWER' | 'REJECTED' | 'ERROR'
  summary?: string
  elevenLabsConversationId?: string
  createdAt: string
  completedAt?: string
}

// ============================================
// API Request/Response 타입
// ============================================

export interface CreateConversationResponse {
  id: string
  greeting: string
}

export interface ChatRequest {
  conversationId: string
  message: string
}

export interface ChatResponse {
  message: string
  collected: CollectedData
  is_complete: boolean
  conversation_status: ConversationStatus
}

export interface CreateCallRequest {
  conversationId: string
}

// Helper
export function createEmptyCollectedData(): CollectedData {
  return {
    target_name: null,
    target_phone: null,
    scenario_type: null,
    primary_datetime: null,
    service: null,
    fallback_datetimes: [],
    fallback_action: null,
    customer_name: null,
    party_size: null,
    special_request: null
  }
}
```

---

### BE1-3: System Prompt 템플릿 (10분)

**파일**: `lib/prompts.ts`

```typescript
// lib/prompts.ts

export const COLLECTION_SYSTEM_PROMPT = `
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
   - ASK_AVAILABLE: 가능한 시간 물어보기
   - NEXT_DAY: 다음 날로 변경
   - CANCEL: 예약 포기
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

모든 필수 정보 수집 완료 시:
1. 수집된 정보 요약
2. "맞으시면 전화 걸어볼게요!" 메시지
3. is_complete: true 로 설정
`
```

---

### BE1-4: LLM 응답 파싱 (10분)

**파일**: `lib/response-parser.ts`

```typescript
// lib/response-parser.ts

import { CollectedData, createEmptyCollectedData } from '@/shared/types'

export interface ParsedLLMResponse {
  message: string
  collected: CollectedData
  is_complete: boolean
  next_question?: string
}

export function parseAssistantResponse(content: string): ParsedLLMResponse {
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

  try {
    const jsonData = JSON.parse(jsonMatch[1])

    // JSON 블록 제거한 메시지
    const message = content.replace(/```json\n[\s\S]*?\n```/, '').trim()

    return {
      message,
      collected: jsonData.collected || createEmptyCollectedData(),
      is_complete: jsonData.is_complete || false,
      next_question: jsonData.next_question
    }
  } catch (error) {
    console.error('JSON 파싱 실패:', error)
    return {
      message: content,
      collected: createEmptyCollectedData(),
      is_complete: false
    }
  }
}
```

---

### BE1-5: 대화 DB 함수 (15분)

**파일**: `lib/supabase/chat.ts`

```typescript
// lib/supabase/chat.ts

import { createClient } from '@/lib/supabase/server'
import { CollectedData, ConversationStatus } from '@/shared/types'

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
    .limit(20)

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
    .order('created_at', { foreignTable: 'messages', ascending: true })
    .single()

  return conversation
}
```

---

### BE1-6: POST /api/conversations (15분)

**파일**: `app/api/conversations/route.ts`

```typescript
// app/api/conversations/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createConversation } from '@/lib/supabase/chat'

export async function POST() {
  try {
    // 인증 확인
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 대화 생성
    const { conversation, greeting } = await createConversation(user.id)

    return NextResponse.json({
      id: conversation.id,
      greeting
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
```

---

### BE1-7: GET /api/conversations/[id] (10분)

**파일**: `app/api/conversations/[id]/route.ts`

```typescript
// app/api/conversations/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getConversation } from '@/lib/supabase/chat'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params  // Next.js 15+: params는 Promise

    // 인증 확인
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conversation = await getConversation(id)

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // 본인 대화만 조회
    if (conversation.user_id !== user.id) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // 응답 형식 변환 (snake_case → camelCase)
    return NextResponse.json({
      id: conversation.id,
      userId: conversation.user_id,
      status: conversation.status,
      collectedData: conversation.collected_data,
      messages: conversation.messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.created_at
      })),
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at
    })
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}
```

---

### BE1-8: POST /api/chat (25분)

**파일**: `app/api/chat/route.ts`

```typescript
// app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import {
  getConversationHistory,
  saveMessage,
  updateCollectedData
} from '@/lib/supabase/chat'
import { parseAssistantResponse } from '@/lib/response-parser'
import { COLLECTION_SYSTEM_PROMPT } from '@/lib/prompts'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId, message } = await request.json()

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: 'conversationId and message are required' },
        { status: 400 }
      )
    }

    // 1. 사용자 메시지 DB 저장
    await saveMessage(conversationId, 'user', message)

    // 2. DB에서 대화 기록 조회
    const history = await getConversationHistory(conversationId)

    // 3. LLM용 메시지 구성
    const llmMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: COLLECTION_SYSTEM_PROMPT },
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
    return NextResponse.json({
      message: parsed.message,
      collected: parsed.collected,
      is_complete: parsed.is_complete,
      conversation_status: parsed.is_complete ? 'READY' : 'COLLECTING'
    })
  } catch (error) {
    console.error('Error in chat:', error)
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    )
  }
}
```

---

### BE1-9: POST /api/calls (v2 수정) (15분)

**파일**: `app/api/calls/route.ts`

```typescript
// app/api/calls/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getConversation } from '@/lib/supabase/chat'

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId } = await request.json()

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      )
    }

    // 대화 세션 조회
    const conversation = await getConversation(conversationId)

    if (!conversation || conversation.user_id !== user.id) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.status !== 'READY') {
      return NextResponse.json(
        { error: 'Conversation is not ready for call' },
        { status: 400 }
      )
    }

    const collected = conversation.collected_data

    // Call 생성
    const { data: call, error } = await supabase
      .from('calls')
      .insert({
        user_id: user.id,
        conversation_id: conversationId,
        request_type: collected.scenario_type || 'RESERVATION',
        target_name: collected.target_name,
        target_phone: collected.target_phone,
        parsed_date: collected.primary_datetime,
        parsed_service: collected.service,
        status: 'PENDING'
      })
      .select()
      .single()

    if (error) throw error

    // conversation status 업데이트
    await supabase
      .from('conversations')
      .update({ status: 'CALLING' })
      .eq('id', conversationId)

    return NextResponse.json({
      id: call.id,
      userId: call.user_id,
      conversationId: call.conversation_id,
      requestType: call.request_type,
      targetName: call.target_name,
      targetPhone: call.target_phone,
      parsedDate: call.parsed_date,
      parsedService: call.parsed_service,
      status: call.status,
      createdAt: call.created_at
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating call:', error)
    return NextResponse.json(
      { error: 'Failed to create call' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: calls } = await supabase
      .from('calls')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      calls: (calls || []).map(call => ({
        id: call.id,
        userId: call.user_id,
        conversationId: call.conversation_id,
        requestType: call.request_type,
        targetName: call.target_name,
        targetPhone: call.target_phone,
        parsedDate: call.parsed_date,
        parsedService: call.parsed_service,
        status: call.status,
        result: call.result,
        summary: call.summary,
        createdAt: call.created_at,
        completedAt: call.completed_at
      }))
    })
  } catch (error) {
    console.error('Error fetching calls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calls' },
      { status: 500 }
    )
  }
}
```

---

## 체크포인트

| 시간 | 체크 |
|------|------|
| 0:30 | 프로젝트 셋업 완료, npm run dev 동작 |
| 0:40 | Supabase 테이블 생성 완료 |
| 0:50 | 공유 타입 + 프롬프트 + 파서 완료 |
| 1:10 | POST /api/conversations 동작 |
| 1:25 | POST /api/chat 동작 (LLM 응답) |
| 1:40 | GET /api/conversations/[id] 동작 |
| 1:55 | POST /api/calls (v2) 동작 |

---

## 테스트 명령어

```bash
# 1. 대화 시작
curl -X POST http://localhost:3000/api/conversations

# 2. 메시지 전송
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "{id}", "message": "내일 오후 3시에 OO미용실 커트 예약해줘"}'

# 3. 대화 복구
curl http://localhost:3000/api/conversations/{id}

# 4. Call 생성 (수집 완료 후)
curl -X POST http://localhost:3000/api/calls \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "{id}"}'
```

---

## Phase 2 통합 시 할 일

- FE1과 채팅 UI 연동 테스트
- BE2에게 collected_data 형식 전달 확인
- 대화 복구 (새로고침) 테스트
- E2E 플로우 확인: 채팅 → 수집 완료 → Call 생성 → Start
