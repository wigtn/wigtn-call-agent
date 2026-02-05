# FE1: 입력/확인 UI 개발 지시서

> **프로젝트**: AI Call Agent (4시간 해커톤)
> **역할**: FE1 - 입력/확인 UI 담당
> **담당 시간**: Phase 1 (0:30-2:00)

## Mode Selection (자동)

사용자의 요청 의도를 파악하여 적절한 모드로 동작하세요:

| 사용자 의도 | 모드 | 동작 |
|------------|------|------|
| 태스크 구현 요청 ("FE1-1 시작해", "입력 폼 만들어줘") | **Agent** | 아래 태스크 목록에서 해당 항목을 찾아 바로 구현 |
| 복잡한 기능 시작 ("폼 검증 로직 전체 설계해줘") | **Plan → Agent** | 계획 수립 → 사용자 승인 → 구현 |
| 버그/에러 수정 ("화면 전환이 안 돼", "폼 제출 에러") | **Debug** | 로그 삽입 → 원인 추적 → 수정 |
| 코드 이해/질문 ("RequestForm 구조 설명해줘") | **Ask** | 코드를 읽고 설명만, 수정하지 않음 |

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
app/page.tsx
app/confirm/[id]/page.tsx
components/layout/Header.tsx
components/call/RequestForm.tsx
components/call/ConfirmCard.tsx
lib/api.ts
lib/validation.ts
```

### 절대 수정하지 마세요
- `app/calling/` — FE2 소유
- `app/result/` — FE2 소유
- `app/history/` — FE2 소유
- `app/api/` — BE1, BE2 소유
- `lib/prisma.ts` — BE1 소유
- `lib/parser.ts` — BE1 소유
- `lib/elevenlabs.ts` — BE2 소유
- `shared/types.ts` — BE1 소유 (읽기만 가능)

---

## 역할 요약

사용자가 AI에게 전화를 부탁하는 **입력 화면**과 **확인 화면**을 개발합니다.

```
[당신이 만드는 부분]

┌─────────────────────────────────────────┐
│  📞 AI에게 전화 부탁하기                │  ← 입력 화면
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 내일 오후 3시에 OO미용실 커트     │ │
│  │ 예약해줘                          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  전화번호: [010-1234-5678]              │
│                                         │
│  [📞 전화 부탁하기]                     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  📋 요청 내용 확인                      │  ← 확인 화면
│                                         │
│  장소: OO미용실                         │
│  날짜: 내일 (2/6)                       │
│  시간: 오후 3시                         │
│  서비스: 커트                           │
│                                         │
│  [← 수정]        [✅ 전화 걸기]         │
└─────────────────────────────────────────┘
```

---

## 태스크 목록

### FE1-1: 메인 레이아웃 (10분)

**파일**: `app/layout.tsx`, `components/layout/Header.tsx`

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-md">
          {children}
        </main>
      </body>
    </html>
  )
}
```

```tsx
// components/layout/Header.tsx
export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-xl font-bold">📞 AI Call Agent</h1>
      </div>
    </header>
  )
}
```

---

### FE1-2: 요청 입력 폼 (25분)

**파일**: `app/page.tsx`, `components/call/RequestForm.tsx`

**요구사항**:
- textarea: 자연어 요청 입력
- input: 전화번호 입력
- 예시 문구 표시
- 제출 버튼

**API 호출 참고** (api-contract.mdc):
```typescript
// POST /api/calls
const res = await fetch('/api/calls', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    requestText: request,     // Required
    targetPhone: phone,       // Required
    targetName: name          // Optional
  })
})
const call: Call = await res.json()
// Navigate to: /confirm/${call.id}
```

```tsx
// components/call/RequestForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function RequestForm() {
  const [request, setRequest] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // API 호출
    const res = await fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestText: request, targetPhone: phone })
    })

    const data = await res.json()
    router.push(`/confirm/${data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">
          무엇을 도와드릴까요?
        </label>
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="내일 오후 3시에 OO미용실 커트 예약해줘"
          className="w-full h-32 p-3 border rounded-lg"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          전화번호
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-1234-5678"
          className="w-full p-3 border rounded-lg"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium"
      >
        {loading ? '처리 중...' : '📞 전화 부탁하기'}
      </button>
    </form>
  )
}
```

---

### FE1-3: 확인 화면 (25분)

**파일**: `app/confirm/[id]/page.tsx`, `components/call/ConfirmCard.tsx`

**요구사항**:
- 파싱된 정보 카드 형태로 표시
- 수정 버튼 → 입력 화면으로
- 전화 걸기 버튼 → 통화 시작

**API 참고** (api-contract.mdc):
- `GET /api/calls/[id]` — 상세 조회 (BE1)
- `POST /api/calls/[id]/start` — 통화 시작 (BE2)

```tsx
// app/confirm/[id]/page.tsx
import { ConfirmCard } from '@/components/call/ConfirmCard'

export default async function ConfirmPage({ params }: { params: { id: string } }) {
  // API에서 데이터 조회
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/calls/${params.id}`)
  const call = await res.json()

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">📋 요청 내용 확인</h2>
      <ConfirmCard call={call} />
    </div>
  )
}
```

```tsx
// components/call/ConfirmCard.tsx
'use client'

import { useRouter } from 'next/navigation'
import { Call } from '@/shared/types'

export function ConfirmCard({ call }: { call: Call }) {
  const router = useRouter()

  const handleStartCall = async () => {
    await fetch(`/api/calls/${call.id}/start`, { method: 'POST' })
    router.push(`/calling/${call.id}`)
  }

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-500">장소</span>
          <span className="font-medium">{call.targetName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">전화번호</span>
          <span className="font-medium">{call.targetPhone}</span>
        </div>
        {call.parsedDate && (
          <div className="flex justify-between">
            <span className="text-gray-500">날짜</span>
            <span className="font-medium">{call.parsedDate}</span>
          </div>
        )}
        {call.parsedTime && (
          <div className="flex justify-between">
            <span className="text-gray-500">시간</span>
            <span className="font-medium">{call.parsedTime}</span>
          </div>
        )}
        {call.parsedService && (
          <div className="flex justify-between">
            <span className="text-gray-500">서비스</span>
            <span className="font-medium">{call.parsedService}</span>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={() => router.back()}
          className="flex-1 py-3 border rounded-lg"
        >
          ← 수정
        </button>
        <button
          onClick={handleStartCall}
          className="flex-1 py-3 bg-green-600 text-white rounded-lg"
        >
          ✅ 전화 걸기
        </button>
      </div>
    </div>
  )
}
```

---

### FE1-4: 폼 유효성 검사 (15분)

**요구사항**:
- 요청 텍스트 최소 5자
- 전화번호 형식 체크 (010-XXXX-XXXX)
- 에러 메시지 표시

```tsx
// lib/validation.ts
export function validatePhone(phone: string): boolean {
  const pattern = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/
  return pattern.test(phone.replace(/-/g, ''))
}

export function validateRequest(text: string): boolean {
  return text.trim().length >= 5
}
```

---

### FE1-5: API 연결 준비 (15분)

**파일**: `lib/api.ts`

**참고**: api-contract.mdc의 FE1 Usage Example 섹션

```tsx
// lib/api.ts
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || ''

export async function createCall(requestText: string, targetPhone: string) {
  const res = await fetch(`${BASE_URL}/api/calls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestText, targetPhone })
  })
  return res.json()
}

export async function getCall(id: string) {
  const res = await fetch(`${BASE_URL}/api/calls/${id}`)
  return res.json()
}

export async function startCall(id: string) {
  const res = await fetch(`${BASE_URL}/api/calls/${id}/start`, {
    method: 'POST'
  })
  return res.json()
}
```

---

## 파일 구조

```
app/
├── layout.tsx           ← 메인 레이아웃
├── page.tsx             ← 입력 화면
└── confirm/
    └── [id]/
        └── page.tsx     ← 확인 화면

components/
├── layout/
│   └── Header.tsx
└── call/
    ├── RequestForm.tsx  ← 입력 폼
    └── ConfirmCard.tsx  ← 확인 카드

lib/
├── api.ts               ← API 함수
└── validation.ts        ← 유효성 검사
```

---

## 의존성

- **받는 것**: BE1이 만든 API (`/api/calls`, `/api/calls/[id]`)
- **주는 것**: FE2에게 `calling/[id]`로 이동 (ConfirmCard에서 router.push)
- **BE2 호출**: `POST /api/calls/[id]/start` (전화 걸기 버튼)

---

## 체크포인트

| 시간 | 체크 |
|------|------|
| 0:40 | 레이아웃 완성, 헤더 표시됨 |
| 1:05 | 입력 폼 완성, 텍스트 입력 가능 |
| 1:30 | 확인 화면 완성, 데이터 표시됨 |
| 1:45 | 유효성 검사 동작 |
| 2:00 | API 연결 준비 완료 |

---

## 주의사항

1. **shadcn/ui 사용**: Button, Input, Card 컴포넌트 활용
2. **한국어 UI**: 모든 텍스트 한국어로
3. **모바일 우선**: `max-w-md` 컨테이너 사용
4. **API 응답 형태**: `api-contract.mdc` 참고 (Call 인터페이스)
5. **타입**: `shared/types.ts`의 Call 인터페이스 사용

---

## Phase 2 통합 시 할 일

- BE1과 함께 API 연결 테스트
- 실제 데이터로 확인 화면 렌더링 확인
- 에러 핸들링 추가
