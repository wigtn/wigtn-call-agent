# FE2: 결과/상태 UI 개발 지시서

> **프로젝트**: WIGVO (4시간 해커톤)
> **역할**: FE2 - 결과/상태 UI 담당
> **담당 시간**: Phase 1 (0:30-2:00)

## Mode Selection (자동)

사용자의 요청 의도를 파악하여 적절한 모드로 동작하세요:

| 사용자 의도 | 모드 | 동작 |
|------------|------|------|
| 태스크 구현 요청 ("FE2-1 시작해", "통화 중 화면 만들어줘") | **Agent** | 아래 태스크 목록에서 해당 항목을 찾아 바로 구현 |
| 복잡한 기능 시작 ("폴링 로직 전체 설계해줘") | **Plan → Agent** | 계획 수립 → 사용자 승인 → 구현 |
| 버그/에러 수정 ("폴링이 안 돼", "결과 화면이 안 나와") | **Debug** | 로그 삽입 → 원인 추적 → 수정 |
| 코드 이해/질문 ("useCallPolling 구조 설명해줘") | **Ask** | 코드를 읽고 설명만, 수정하지 않음 |

> 명시적 모드 지정이 없으면 **Agent 모드**로 진행하세요.

---

## IMPORTANT: 필독 문서

작업 시작 전에 반드시 읽어야 할 파일들:
1. **`.cursorrules`** — 프로젝트 전체 규칙, 아키텍처, 코딩 컨벤션
2. **`.cursor/rules/team-workflow.mdc`** — 파일 오너십, 충돌 방지 규칙
3. **`.cursor/rules/api-contract.mdc`** — API 요청/응답 스키마 (SSOT)

---

## File Ownership

### FE2가 소유하는 파일 (ONLY these)
```
app/calling/[id]/page.tsx
app/result/[id]/page.tsx
app/history/page.tsx
components/call/CallingStatus.tsx
components/call/ResultCard.tsx
components/call/HistoryList.tsx
hooks/useCallPolling.ts
```

### 절대 수정하지 마세요
- `app/layout.tsx` — FE1 소유
- `app/page.tsx` — FE1 소유
- `app/login/page.tsx` — FE1 소유
- `app/confirm/` — FE1 소유
- `app/api/` — BE1, BE2 소유
- `app/auth/` — BE1 소유
- `lib/prisma.ts` — BE1 소유
- `lib/parser.ts` — BE1 소유
- `lib/supabase/` — BE1 소유 (import는 자유, 수정 금지)
- `lib/elevenlabs.ts` — BE2 소유
- `shared/types.ts` — BE1 소유 (읽기만 가능)
- `middleware.ts` — BE1 소유

---

## 역할 요약

AI가 전화 중일 때의 **통화 중 화면**과 **결과 화면**, **통화 기록 목록**을 개발합니다.

```
[당신이 만드는 부분]

┌─────────────────────────────────────────┐
│           📞 통화 중...                  │  ← 통화 중 화면
│                                         │
│           🤖  ↔️  📱                     │
│           AI    미용실                   │
│                                         │
│           ⏱️ 00:32 경과                  │
│                                         │
│  ✅ 전화 연결됨                          │
│  ⏳ 예약 요청 중...                      │
│                                         │
│           [🚫 취소]                      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  ✅ 예약이 완료되었습니다!               │  ← 결과 화면
│                                         │
│  📍 OO미용실                             │
│  📆 2026년 2월 6일 (목)                  │
│  ⏰ 오후 3시                             │
│  ✂️ 커트                                 │
│                                         │
│  📝 AI 요약                              │
│  "예약이 정상적으로 완료되었습니다..."   │
│                                         │
│           [🏠 홈으로]                    │
└─────────────────────────────────────────┘
```

---

## 태스크 목록

### FE2-1: 통화 중 화면 (20분)

**파일**: `app/calling/[id]/page.tsx`, `components/call/CallingStatus.tsx`

**요구사항**:
- 로딩 애니메이션
- 경과 시간 표시 (실시간)
- 진행 상황 스텝 표시
- 취소 버튼

**Polling**: `GET /api/calls/[id]` 매 **3초**마다 호출 (api-contract.mdc 참고)

```tsx
// app/calling/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CallingStatus } from '@/components/call/CallingStatus'

export default function CallingPage({ params }: { params: { id: string } }) {
  const [call, setCall] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const router = useRouter()

  // 상태 폴링 (3초 간격)
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/calls/${params.id}`)
      const data = await res.json()
      setCall(data)

      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        clearInterval(interval)
        router.push(`/result/${params.id}`)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [params.id])

  // 경과 시간
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return <CallingStatus call={call} elapsed={elapsed} />
}
```

```tsx
// components/call/CallingStatus.tsx
import { Call } from '@/shared/types'

interface Props {
  call: Call | null
  elapsed: number
}

export function CallingStatus({ call, elapsed }: Props) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="text-center py-12 space-y-8">
      <h2 className="text-2xl font-bold">📞 통화 중...</h2>

      {/* 애니메이션 */}
      <div className="flex justify-center items-center gap-4 text-4xl">
        <span className="animate-pulse">🤖</span>
        <span className="animate-bounce">↔️</span>
        <span>📱</span>
      </div>

      <p className="text-gray-600">{call?.targetName || '연결 중...'}</p>

      {/* 경과 시간 */}
      <div className="text-3xl font-mono">
        ⏱️ {formatTime(elapsed)}
      </div>

      {/* 진행 상황 */}
      <div className="space-y-2 text-left max-w-xs mx-auto">
        <Step done={true} text="전화 연결됨" />
        <Step done={call?.status === 'IN_PROGRESS'} text="예약 요청 중..." />
        <Step done={false} text="결과 확인 대기" />
      </div>
    </div>
  )
}

function Step({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span>{done ? '✅' : '⏳'}</span>
      <span className={done ? 'text-green-600' : 'text-gray-400'}>{text}</span>
    </div>
  )
}
```

---

### FE2-2: 결과 화면 - 성공 (25분)

**파일**: `app/result/[id]/page.tsx`, `components/call/ResultCard.tsx`

**요구사항**:
- 성공 메시지 (큰 체크마크)
- 예약 정보 카드
- AI 요약 표시
- 홈으로 버튼

**API 참고** (api-contract.mdc): `GET /api/calls/[id]`

```tsx
// app/result/[id]/page.tsx
import { ResultCard } from '@/components/call/ResultCard'

export default async function ResultPage({ params }: { params: { id: string } }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/calls/${params.id}`, {
    cache: 'no-store'
  })
  const call = await res.json()

  return <ResultCard call={call} />
}
```

```tsx
// components/call/ResultCard.tsx
'use client'

import { useRouter } from 'next/navigation'
import { Call } from '@/shared/types'

export function ResultCard({ call }: { call: Call }) {
  const router = useRouter()
  const isSuccess = call.result === 'SUCCESS'

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="text-center py-8">
        <div className="text-6xl mb-4">
          {isSuccess ? '✅' : '❌'}
        </div>
        <h2 className="text-2xl font-bold">
          {isSuccess ? '예약이 완료되었습니다!' : '통화에 실패했습니다'}
        </h2>
      </div>

      {/* 예약 정보 */}
      {isSuccess && (
        <div className="border rounded-lg p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span>📍</span>
            <span className="font-medium">{call.targetName}</span>
          </div>
          {call.parsedDate && (
            <div className="flex items-center gap-2">
              <span>📆</span>
              <span>{call.parsedDate}</span>
            </div>
          )}
          {call.parsedTime && (
            <div className="flex items-center gap-2">
              <span>⏰</span>
              <span>{call.parsedTime}</span>
            </div>
          )}
          {call.parsedService && (
            <div className="flex items-center gap-2">
              <span>✂️</span>
              <span>{call.parsedService}</span>
            </div>
          )}
        </div>
      )}

      {/* 실패 정보 */}
      {!isSuccess && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <p className="text-red-600">
            {call.result === 'NO_ANSWER' && '상대방이 전화를 받지 않았습니다.'}
            {call.result === 'REJECTED' && '예약이 거절되었습니다.'}
            {call.result === 'ERROR' && '시스템 오류가 발생했습니다.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 w-full py-2 bg-red-600 text-white rounded-lg"
          >
            다시 시도하기
          </button>
        </div>
      )}

      {/* AI 요약 */}
      {call.summary && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium mb-2">📝 AI 요약</h3>
          <p className="text-gray-600">{call.summary}</p>
        </div>
      )}

      {/* 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={() => router.push('/history')}
          className="flex-1 py-3 border rounded-lg"
        >
          📋 기록 보기
        </button>
        <button
          onClick={() => router.push('/')}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg"
        >
          🏠 홈으로
        </button>
      </div>
    </div>
  )
}
```

---

### FE2-3: 결과 화면 - 실패 (15분)

**ResultCard에 이미 포함** - 위의 `{!isSuccess && ...}` 블록 참고

---

### FE2-4: 통화 기록 목록 (20분)

**파일**: `app/history/page.tsx`, `components/call/HistoryList.tsx`

**API 참고** (api-contract.mdc): `GET /api/calls` → `{ calls: Call[] }`

```tsx
// app/history/page.tsx
import { HistoryList } from '@/components/call/HistoryList'

export default async function HistoryPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/calls`, {
    cache: 'no-store'
  })
  const { calls } = await res.json()

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">📋 통화 기록</h2>
      <HistoryList calls={calls} />
    </div>
  )
}
```

```tsx
// components/call/HistoryList.tsx
'use client'

import { useRouter } from 'next/navigation'
import { Call } from '@/shared/types'

export function HistoryList({ calls }: { calls: Call[] }) {
  const router = useRouter()

  if (calls.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        아직 통화 기록이 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {calls.map((call) => (
        <div
          key={call.id}
          onClick={() => router.push(`/result/${call.id}`)}
          className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">{call.targetName}</p>
              <p className="text-sm text-gray-500">
                {call.requestType === 'RESERVATION' ? '예약' : '문의'}
              </p>
            </div>
            <div className="text-right">
              <StatusBadge status={call.status} result={call.result} />
              <p className="text-xs text-gray-400 mt-1">
                {new Date(call.createdAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status, result }: { status: string; result?: string }) {
  if (status === 'COMPLETED' && result === 'SUCCESS') {
    return <span className="text-green-600 text-sm">✅ 성공</span>
  }
  if (status === 'COMPLETED') {
    return <span className="text-red-600 text-sm">❌ 실패</span>
  }
  if (status === 'CALLING') {
    return <span className="text-blue-600 text-sm">📞 통화중</span>
  }
  return <span className="text-gray-400 text-sm">⏳ 대기</span>
}
```

---

### FE2-5: 폴링으로 상태 업데이트 (10분)

**파일**: `hooks/useCallPolling.ts`

**Polling 간격**: **3초** (서버 부하 고려)

```tsx
// hooks/useCallPolling.ts
import { useState, useEffect } from 'react'
import { Call } from '@/shared/types'

export function useCallPolling(callId: string) {
  const [call, setCall] = useState<Call | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCall = async () => {
      const res = await fetch(`/api/calls/${callId}`)
      const data = await res.json()
      setCall(data)
      setLoading(false)
      return data
    }

    fetchCall()

    const interval = setInterval(async () => {
      const data = await fetchCall()
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        clearInterval(interval)
      }
    }, 3000) // 3초마다 폴링

    return () => clearInterval(interval)
  }, [callId])

  return { call, loading }
}
```

---

## 파일 구조

```
app/
├── calling/
│   └── [id]/
│       └── page.tsx     ← 통화 중 화면
├── result/
│   └── [id]/
│       └── page.tsx     ← 결과 화면
└── history/
    └── page.tsx         ← 통화 기록

components/
└── call/
    ├── CallingStatus.tsx  ← 통화 중 상태
    ├── ResultCard.tsx     ← 결과 카드
    └── HistoryList.tsx    ← 기록 목록

hooks/
└── useCallPolling.ts      ← 폴링 훅
```

---

## 의존성

- **받는 것**:
  - FE1에서 `/calling/[id]`로 이동
  - BE1이 만든 API (`/api/calls/[id]`)
  - BE2가 업데이트하는 통화 결과 (polling으로 감지)
- **주는 것**: 결과 화면에서 홈으로 이동

---

## 체크포인트

| 시간 | 체크 |
|------|------|
| 0:50 | 통화 중 화면 기본 레이아웃 |
| 1:15 | 결과 화면 성공 케이스 완성 |
| 1:30 | 결과 화면 실패 케이스 추가 |
| 1:50 | 통화 기록 목록 완성 |
| 2:00 | 폴링 로직 동작 확인 (3초 간격) |

---

## 주의사항

1. **폴링 주기**: **3초**마다 (2초가 아님 - 서버 부하 줄이기)
2. **애니메이션**: `animate-pulse`, `animate-bounce` 활용
3. **상태 전환**: COMPLETED/FAILED 시 자동으로 결과 페이지로
4. **타입 일치**: `shared/types.ts`의 Call 인터페이스 사용
5. **API 응답 형태**: `api-contract.mdc` 참고

---

## Phase 2 통합 시 할 일

- BE2와 함께 Mock 모드 결과 반영 테스트
- 실제 통화 데이터로 결과 화면 확인
- 폴링 타이밍 조정 (필요시)
