# FE1: 채팅/로그인 UI 개발 지시서 (v2)

> **프로젝트**: WIGVO (4시간 해커톤)
> **역할**: FE1 - 채팅/로그인 UI 담당
> **담당 시간**: Phase 1 (0:30-2:00)
> **버전**: v2 (Dynamic Agent Platform - 채팅 기반 정보 수집)

## Mode Selection (자동)

사용자의 요청 의도를 파악하여 적절한 모드로 동작하세요:

| 사용자 의도 | 모드 | 동작 |
|------------|------|------|
| 태스크 구현 요청 ("FE1-1 시작해", "채팅 UI 만들어줘") | **Agent** | 아래 태스크 목록에서 해당 항목을 찾아 바로 구현 |
| 복잡한 기능 시작 ("채팅 훅 전체 설계해줘") | **Plan → Agent** | 계획 수립 → 사용자 승인 → 구현 |
| 버그/에러 수정 ("채팅이 안 돼", "메시지가 안 보여") | **Debug** | 로그 삽입 → 원인 추적 → 수정 |
| 코드 이해/질문 ("useChat 구조 설명해줘") | **Ask** | 코드를 읽고 설명만, 수정하지 않음 |

> 명시적 모드 지정이 없으면 **Agent 모드**로 진행하세요.

---

## IMPORTANT: 필독 문서

작업 시작 전에 반드시 읽어야 할 파일들:
1. **`.cursorrules`** — 프로젝트 전체 규칙, 아키텍처, 코딩 컨벤션
2. **`.cursor/rules/team-workflow.mdc`** — 파일 오너십, 충돌 방지 규칙
3. **`.cursor/rules/api-contract.mdc`** — API 요청/응답 스키마 (SSOT)

---

## File Ownership

### FE1이 소유하는 파일 (ONLY these)
```
app/layout.tsx
app/page.tsx                      # 채팅 화면 (메인)
app/login/page.tsx
components/layout/Header.tsx
components/auth/LoginButton.tsx
components/chat/ChatContainer.tsx # 신규: 채팅 컨테이너
components/chat/ChatMessage.tsx   # 신규: 메시지 버블
components/chat/ChatInput.tsx     # 신규: 입력창
components/chat/CollectionSummary.tsx  # 신규: 수집 완료 요약
hooks/useChat.ts                  # 신규: 채팅 훅
lib/api.ts
lib/validation.ts
```

### 절대 수정하지 마세요
- `app/calling/` — FE2 소유
- `app/result/` — FE2 소유
- `app/history/` — FE2 소유
- `app/api/` — BE1, BE2 소유
- `lib/prisma.ts` — BE1 소유
- `lib/supabase/` — BE1 소유 (import는 자유, 수정 금지)
- `lib/elevenlabs.ts` — BE2 소유
- `shared/types.ts` — BE1 소유 (읽기만 가능)

---

## 역할 요약 (v2)

사용자가 AI와 **채팅**하며 전화 요청 정보를 수집하는 **채팅 화면**과 **로그인 화면**을 개발합니다.

```
[당신이 만드는 부분 - v2]

┌─────────────────────────────────────────┐
│  📞 WIGVO에 오신 걸 환영합니다          │  ← 로그인 화면
│                                         │
│  [G Google로 계속하기]                  │
│  [🍎 Apple로 계속하기]                  │
│  [💬 카카오로 계속하기]                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  📞 WIGVO                    [로그아웃] │  ← 헤더
├─────────────────────────────────────────┤
│                                         │
│  🤖 안녕하세요! 어떤 전화를 대신        │  ← 채팅 화면 (메인)
│     걸어드릴까요? 😊                    │
│                                         │
│                    내일 오후 3시에       │
│                    OO미용실 커트        │
│                    예약해줘 👤          │
│                                         │
│  🤖 OO미용실에 전화할 전화번호를        │
│     알려주세요!                         │
│                                         │
│                    010-1234-5678 👤     │
│                                         │
│  🤖 좋아요! 정리해볼게요:               │
│                                         │
│     📍 OO미용실 (010-1234-5678)        │
│     📅 내일 오후 3시                    │
│     ✂️ 커트                             │
│                                         │
│     맞으시면 전화 걸어볼게요!           │
│                                         │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐ │  ← 수집 완료 시
│  │ [수정하기]      [📞 전화 걸기]    │ │
│  └───────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  [메시지를 입력하세요...      ] [전송] │  ← 입력창
└─────────────────────────────────────────┘
```

---

## 태스크 목록

### FE1-1: 메인 레이아웃 (10분)

**파일**: `app/layout.tsx`, `components/layout/Header.tsx`

```tsx
// app/layout.tsx
import { Header } from '@/components/layout/Header'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen">
        <Header />
        <main className="container mx-auto max-w-md">
          {children}
        </main>
      </body>
    </html>
  )
}
```

```tsx
// components/layout/Header.tsx
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function Header() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="container mx-auto max-w-md px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">WIGVO</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          로그아웃
        </button>
      </div>
    </header>
  )
}
```

---

### FE1-2: 로그인 화면 (15분)

**파일**: `app/login/page.tsx`, `components/auth/LoginButton.tsx`

```tsx
// components/auth/LoginButton.tsx
'use client'

import { createClient } from '@/lib/supabase/client'

interface Props {
  provider: 'google' | 'apple' | 'kakao'
  label: string
  icon: string
}

export function LoginButton({ provider, label, icon }: Props) {
  const handleLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  return (
    <button
      onClick={handleLogin}
      className="w-full py-3 px-4 border rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}
```

```tsx
// app/login/page.tsx
import { LoginButton } from '@/components/auth/LoginButton'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-blue-600">WIGVO</h1>
          <p className="text-gray-500">AI 음성 비서로 전화를 대신 걸어드립니다</p>
        </div>

        <div className="space-y-3">
          <LoginButton provider="google" label="Google로 계속하기" icon="🔵" />
          <LoginButton provider="apple" label="Apple로 계속하기" icon="🍎" />
          <LoginButton provider="kakao" label="카카오로 계속하기" icon="💬" />
        </div>

        <p className="text-center text-xs text-gray-400">
          로그인하면 이용약관과 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  )
}
```

---

### FE1-3: useChat 훅 (25분)

**파일**: `hooks/useChat.ts`

**참고**: `api-contract.mdc`의 Endpoint 0-1, 0-2, 0-3

```tsx
// hooks/useChat.ts
'use client'

import { useState, useCallback, useEffect } from 'react'
import { Message, CollectedData, ConversationStatus } from '@/shared/types'

interface UseChatReturn {
  messages: Message[]
  collectedData: CollectedData | null
  isComplete: boolean
  isLoading: boolean
  conversationId: string | null
  conversationStatus: ConversationStatus
  sendMessage: (content: string) => Promise<void>
  startConversation: () => Promise<void>
  resumeConversation: (id: string) => Promise<void>
}

export function useChat(): UseChatReturn {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [collectedData, setCollectedData] = useState<CollectedData | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus>('COLLECTING')

  // 대화 시작
  const startConversation = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()

      setConversationId(data.id)
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.greeting,
        createdAt: new Date().toISOString()
      }])

      // localStorage에 저장 (새로고침 시 복구용)
      localStorage.setItem('currentConversationId', data.id)
    } catch (error) {
      console.error('Failed to start conversation:', error)
    }
  }, [])

  // 대화 복구 (새로고침 시)
  const resumeConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`)
      if (!res.ok) {
        // 대화를 찾을 수 없으면 새로 시작
        localStorage.removeItem('currentConversationId')
        await startConversation()
        return
      }

      const data = await res.json()

      setConversationId(data.id)
      setMessages(data.messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt
      })))
      setCollectedData(data.collectedData)
      setIsComplete(data.status === 'READY')
      setConversationStatus(data.status)
    } catch (error) {
      console.error('Failed to resume conversation:', error)
      localStorage.removeItem('currentConversationId')
      await startConversation()
    }
  }, [startConversation])

  // 페이지 로드 시 대화 복구 또는 새로 시작
  useEffect(() => {
    const savedId = localStorage.getItem('currentConversationId')
    if (savedId) {
      resumeConversation(savedId)
    } else {
      startConversation()
    }
  }, [resumeConversation, startConversation])

  // 메시지 전송
  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || isLoading) return

    // Optimistic update - 사용자 메시지 즉시 표시
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString()
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

      // Assistant 응답 추가
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        createdAt: new Date().toISOString()
      }

      setMessages(prev => [...prev, assistantMessage])
      setCollectedData(data.collected)
      setIsComplete(data.is_complete)
      setConversationStatus(data.conversation_status)
    } catch (error) {
      console.error('Failed to send message:', error)
      // 에러 시 사용자 메시지 제거 (rollback)
      setMessages(prev => prev.filter(m => m.id !== userMessage.id))
    } finally {
      setIsLoading(false)
    }
  }, [conversationId, isLoading])

  return {
    messages,
    collectedData,
    isComplete,
    isLoading,
    conversationId,
    conversationStatus,
    sendMessage,
    startConversation,
    resumeConversation
  }
}
```

---

### FE1-4: 채팅 컴포넌트들 (30분)

**파일**: `components/chat/ChatContainer.tsx`, `ChatMessage.tsx`, `ChatInput.tsx`, `CollectionSummary.tsx`

```tsx
// components/chat/ChatContainer.tsx
'use client'

import { useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@/hooks/useChat'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { CollectionSummary } from './CollectionSummary'

export function ChatContainer() {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    collectedData,
    isComplete,
    isLoading,
    conversationId,
    sendMessage,
    startConversation
  } = useChat()

  // 새 메시지 시 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 전화 걸기
  const handleStartCall = async () => {
    if (!conversationId) return

    try {
      // 1. Call 생성
      const callRes = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId })
      })
      const call = await callRes.json()

      // 2. 전화 시작
      await fetch(`/api/calls/${call.id}/start`, { method: 'POST' })

      // 3. 통화 중 화면으로 이동
      router.push(`/calling/${call.id}`)
    } catch (error) {
      console.error('Failed to start call:', error)
      alert('전화 걸기에 실패했습니다. 다시 시도해주세요.')
    }
  }

  // 새 대화 시작
  const handleNewConversation = () => {
    localStorage.removeItem('currentConversationId')
    startConversation()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">
      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="animate-bounce">🤖</div>
            <span>입력 중...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 수집 완료 시 요약 + 버튼 */}
      {isComplete && collectedData && (
        <CollectionSummary
          data={collectedData}
          onConfirm={handleStartCall}
          onEdit={() => sendMessage('수정할게요')}
          onNewConversation={handleNewConversation}
        />
      )}

      {/* 입력창 */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading || isComplete}
        placeholder={isComplete ? '수집 완료! 전화 걸기를 눌러주세요' : '메시지를 입력하세요...'}
      />
    </div>
  )
}
```

```tsx
// components/chat/ChatMessage.tsx
import { Message } from '@/shared/types'

interface Props {
  message: Message
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white border rounded-bl-sm'
        }`}
      >
        {!isUser && (
          <div className="text-xs text-gray-400 mb-1">🤖 AI 비서</div>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
```

```tsx
// components/chat/ChatInput.tsx
'use client'

import { useState, KeyboardEvent } from 'react'

interface Props {
  onSend: (message: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder }: Props) {
  const [input, setInput] = useState('')

  const handleSubmit = async () => {
    if (!input.trim() || disabled) return

    const message = input.trim()
    setInput('')
    await onSend(message)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t bg-white p-4">
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          전송
        </button>
      </div>
    </div>
  )
}
```

```tsx
// components/chat/CollectionSummary.tsx
'use client'

import { CollectedData } from '@/shared/types'

interface Props {
  data: CollectedData
  onConfirm: () => void
  onEdit: () => void
  onNewConversation: () => void
}

export function CollectionSummary({ data, onConfirm, onEdit, onNewConversation }: Props) {
  return (
    <div className="border-t bg-green-50 p-4 space-y-4">
      <div className="text-sm font-medium text-green-700">
        ✅ 정보 수집 완료!
      </div>

      {/* 수집된 정보 요약 */}
      <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
        {data.target_name && (
          <div className="flex items-center gap-2">
            <span>📍</span>
            <span className="font-medium">{data.target_name}</span>
            {data.target_phone && (
              <span className="text-gray-500">({data.target_phone})</span>
            )}
          </div>
        )}
        {data.primary_datetime && (
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>{data.primary_datetime}</span>
          </div>
        )}
        {data.service && (
          <div className="flex items-center gap-2">
            <span>✂️</span>
            <span>{data.service}</span>
          </div>
        )}
        {data.customer_name && (
          <div className="flex items-center gap-2">
            <span>👤</span>
            <span>{data.customer_name}</span>
          </div>
        )}
        {data.special_request && (
          <div className="flex items-center gap-2">
            <span>📝</span>
            <span className="text-gray-600">{data.special_request}</span>
          </div>
        )}
      </div>

      {/* 버튼들 */}
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
        >
          수정하기
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          📞 전화 걸기
        </button>
      </div>

      <button
        onClick={onNewConversation}
        className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
      >
        새로운 요청하기
      </button>
    </div>
  )
}
```

---

### FE1-5: 메인 페이지 (채팅 화면) (10분)

**파일**: `app/page.tsx`

```tsx
// app/page.tsx
import { ChatContainer } from '@/components/chat/ChatContainer'

export default function HomePage() {
  return <ChatContainer />
}
```

---

### FE1-6: API 헬퍼 함수 (10분)

**파일**: `lib/api.ts`

```tsx
// lib/api.ts

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || ''

// Conversation API
export async function createConversation() {
  const res = await fetch(`${BASE_URL}/api/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  return res.json()
}

export async function getConversation(id: string) {
  const res = await fetch(`${BASE_URL}/api/conversations/${id}`)
  return res.json()
}

export async function sendChatMessage(conversationId: string, message: string) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, message })
  })
  return res.json()
}

// Call API
export async function createCall(conversationId: string) {
  const res = await fetch(`${BASE_URL}/api/calls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId })
  })
  return res.json()
}

export async function startCall(callId: string) {
  const res = await fetch(`${BASE_URL}/api/calls/${callId}/start`, {
    method: 'POST'
  })
  return res.json()
}

export async function getCall(id: string) {
  const res = await fetch(`${BASE_URL}/api/calls/${id}`)
  return res.json()
}
```

---

## 파일 구조

```
app/
├── layout.tsx           ← 메인 레이아웃
├── page.tsx             ← 채팅 화면 (메인)
└── login/
    └── page.tsx         ← 로그인 화면

components/
├── layout/
│   └── Header.tsx       ← 헤더 + 로그아웃
├── auth/
│   └── LoginButton.tsx  ← OAuth 로그인 버튼
└── chat/
    ├── ChatContainer.tsx   ← 채팅 메인 컨테이너
    ├── ChatMessage.tsx     ← 메시지 버블
    ├── ChatInput.tsx       ← 입력창
    └── CollectionSummary.tsx  ← 수집 완료 요약

hooks/
└── useChat.ts           ← 채팅 훅

lib/
├── api.ts               ← API 함수
└── validation.ts        ← 유효성 검사
```

---

## 의존성

- **받는 것**:
  - BE1이 만든 API (`/api/conversations`, `/api/chat`, `/api/calls`)
  - BE1이 만든 Supabase 클라이언트 (`lib/supabase/client.ts`)
  - BE1이 만든 middleware + callback (인증 흐름)
- **주는 것**: FE2에게 `/calling/[id]`로 이동 (ChatContainer에서 router.push)
- **BE2 호출**: `POST /api/calls/[id]/start` (전화 걸기 버튼)

---

## 체크포인트

| 시간 | 체크 |
|------|------|
| 0:40 | 로그인 화면 완성, OAuth 버튼 동작 |
| 0:50 | 레이아웃 완성, 헤더 표시됨 |
| 1:15 | useChat 훅 완성 |
| 1:40 | 채팅 컴포넌트 완성, 메시지 표시됨 |
| 1:50 | 수집 완료 요약 + 버튼 표시 |
| 2:00 | 전화 걸기 버튼 동작 (calling 페이지로 이동) |

---

## 주의사항

1. **shadcn/ui 사용**: Button, Input, Card 컴포넌트 활용
2. **한국어 UI**: 모든 텍스트 한국어로
3. **모바일 우선**: `max-w-md` 컨테이너 사용
4. **API 응답 형태**: `api-contract.mdc` 참고
5. **타입**: `shared/types.ts`의 Message, CollectedData 인터페이스 사용
6. **대화 복구**: localStorage에 conversationId 저장하여 새로고침 시 복구

---

## Phase 2 통합 시 할 일

- BE1과 함께 채팅 API 연동 테스트
- 실제 LLM 응답으로 채팅 확인
- 수집 완료 → 전화 걸기 플로우 확인
- 대화 복구 (새로고침) 테스트
