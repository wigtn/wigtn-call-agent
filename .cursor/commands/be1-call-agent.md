# BE1: API + DB 개발 지시서

> **프로젝트**: WIGVO (4시간 해커톤)
> **역할**: BE1 - API + DB 담당
> **담당 시간**: Phase 0 리드 + Phase 1 (0:00-2:00)

## Mode Selection (자동)

사용자의 요청 의도를 파악하여 적절한 모드로 동작하세요:

| 사용자 의도 | 모드 | 동작 |
|------------|------|------|
| 태스크 구현 요청 ("BE1-1 시작해", "API 만들어줘") | **Agent** | 아래 태스크 목록에서 해당 항목을 찾아 바로 구현 |
| 복잡한 기능 시작 ("파서 전체 설계해줘", "어떻게 구현할지 계획 세워줘") | **Plan → Agent** | 계획 수립 → 사용자 승인 → 구현 |
| 버그/에러 수정 ("API가 500 에러 나", "파싱이 안 돼") | **Debug** | 로그 삽입 → 원인 추적 → 수정 |
| 코드 이해/질문 ("이 구조 어떻게 돼있어?", "types.ts 설명해줘") | **Ask** | 코드를 읽고 설명만, 수정하지 않음 |

> 명시적 모드 지정이 없으면 **Agent 모드**로 진행하세요.

---

## IMPORTANT: 필독 문서

작업 시작 전에 반드시 읽어야 할 파일들:
1. **`.cursorrules`** — 프로젝트 전체 규칙, 아키텍처, 코딩 컨벤션
2. **`.cursor/rules/team-workflow.mdc`** — 파일 오너십, 충돌 방지 규칙
3. **`.cursor/rules/api-contract.mdc`** — API 요청/응답 스키마 (SSOT)

---

## File Ownership

### BE1이 소유하는 파일 (ONLY these)
```
prisma/schema.prisma
lib/prisma.ts
lib/parser.ts
shared/types.ts
app/api/calls/route.ts
app/api/calls/[id]/route.ts
```

### 절대 수정하지 마세요
- `app/api/calls/[id]/start/route.ts` — **BE2 전용**
- `lib/elevenlabs.ts` — BE2 소유
- `app/page.tsx`, `app/confirm/` — FE1 소유
- `app/calling/`, `app/result/`, `app/history/` — FE2 소유
- `components/` — FE1, FE2 소유

> **NOTE**: `start/route.ts`는 이전 버전에서 BE1이 만들었지만,
> ownership 충돌을 방지하기 위해 **BE2 전용**으로 변경되었습니다.

---

## 역할 요약

프로젝트 초기 설정을 리드하고, **DB 스키마**와 **핵심 API**를 개발합니다.

```
[당신이 만드는 부분]

┌─────────────────────────────────────────────────────────────────────┐
│                           API Layer                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  POST /api/calls                                                    │
│  ├── 요청 텍스트 받기                                                │
│  ├── GPT-4로 파싱 (장소, 날짜, 시간, 서비스)                          │
│  ├── (GPT-4 실패 시) Regex fallback 파서                              │
│  └── DB에 저장 후 Call 객체 반환                                      │
│                                                                     │
│  GET /api/calls/[id]                                                │
│  └── 통화 상태 및 결과 조회                                          │
│                                                                     │
│  GET /api/calls                                                     │
│  └── 통화 기록 목록 조회                                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Database (SQLite)                            │
├─────────────────────────────────────────────────────────────────────┤
│  Call                                                               │
│  ├── id, requestText, requestType                                   │
│  ├── targetName, targetPhone                                        │
│  ├── parsedDate, parsedTime, parsedService                          │
│  ├── status, result, summary                                        │
│  └── conversationId, createdAt, completedAt                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: 프로젝트 셋업 (0:00-0:30)

> **당신이 리드** - 다른 팀원들은 환경 설정

### 0.1 Next.js 프로젝트 생성

```bash
npx create-next-app@latest ai-call-agent --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
cd ai-call-agent
```

### 0.2 shadcn/ui 설치

```bash
npx shadcn-ui@latest init
# Style: Default
# Base color: Slate
# CSS variables: Yes

npx shadcn-ui@latest add button input card
```

### 0.3 Prisma 설정

```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider sqlite
```

### 0.4 필수 패키지 설치

```bash
npm install openai
```

### 0.5 디렉토리 구조 생성

```bash
mkdir -p app/api/calls/[id]/start
mkdir -p components/call
mkdir -p components/layout
mkdir -p lib
mkdir -p shared
mkdir -p hooks
```

### 0.6 환경 변수 템플릿

```bash
# .env.example
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
ELEVENLABS_AGENT_ID=...
ELEVENLABS_MOCK=true
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 0.7 공유 타입 파일

**파일**: `shared/types.ts`

**IMPORTANT**: 이 파일의 정확한 타입은 `api-contract.mdc`에 정의되어 있습니다.

```typescript
// shared/types.ts
export interface Call {
  id: string
  requestText: string
  requestType: 'RESERVATION' | 'INQUIRY'
  targetName: string
  targetPhone: string
  parsedDate?: string
  parsedTime?: string
  parsedService?: string
  status: 'PENDING' | 'CALLING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  result?: 'SUCCESS' | 'NO_ANSWER' | 'REJECTED' | 'ERROR'
  summary?: string
  conversationId?: string
  createdAt: string
  completedAt?: string
}

export interface CreateCallRequest {
  requestText: string
  targetPhone: string
  targetName?: string
}

export interface ParsedRequest {
  type: 'RESERVATION' | 'INQUIRY'
  targetName: string
  date?: string
  time?: string
  service?: string
  question?: string
}
```

### 0.8 Git 초기 커밋

```bash
git init
git add .
git commit -m "chore: Initial project setup"
git push origin main
```

---

## Phase 1: 핵심 기능 개발 (0:30-2:00)

### BE1-1: Prisma 스키마 작성 (15분)

**파일**: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Call {
  id            String    @id @default(cuid())

  // 요청
  requestText   String
  requestType   String    @default("RESERVATION")
  targetName    String
  targetPhone   String

  // 파싱 결과
  parsedDate    String?
  parsedTime    String?
  parsedService String?

  // 통화 결과
  status        String    @default("PENDING")
  result        String?
  summary       String?

  // ElevenLabs
  conversationId String?

  // 시간
  createdAt     DateTime  @default(now())
  completedAt   DateTime?
}
```

### BE1-2: DB 마이그레이션 (5분)

```bash
npx prisma migrate dev --name init
npx prisma generate
```

**파일**: `lib/prisma.ts`

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

### BE1-3: POST /api/calls - 통화 요청 생성 (25분)

**파일**: `app/api/calls/route.ts`

**IMPORTANT**: 응답 형태는 `api-contract.mdc`의 Endpoint 1, 2 참고

```typescript
// app/api/calls/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseRequest } from '@/lib/parser'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestText, targetPhone, targetName } = body

    // 유효성 검사
    if (!requestText || !targetPhone) {
      return NextResponse.json(
        { error: 'requestText and targetPhone are required' },
        { status: 400 }
      )
    }

    // GPT-4로 요청 파싱 (실패 시 regex fallback)
    const parsed = await parseRequest(requestText)

    // DB에 저장
    const call = await prisma.call.create({
      data: {
        requestText,
        requestType: parsed.type,
        targetName: targetName || parsed.targetName,
        targetPhone,
        parsedDate: parsed.date,
        parsedTime: parsed.time,
        parsedService: parsed.service,
        status: 'PENDING'
      }
    })

    return NextResponse.json(call, { status: 201 })
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
    const calls = await prisma.call.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    })
    return NextResponse.json({ calls })
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

### BE1-4: GET /api/calls/[id] - 상태 조회 (15분)

**파일**: `app/api/calls/[id]/route.ts`

```typescript
// app/api/calls/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const call = await prisma.call.findUnique({
      where: { id: params.id }
    })

    if (!call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(call)
  } catch (error) {
    console.error('Error fetching call:', error)
    return NextResponse.json(
      { error: 'Failed to fetch call' },
      { status: 500 }
    )
  }
}
```

> **NOTE**: `start/route.ts`는 BE2가 소유합니다. BE1은 만들지 마세요.

---

### BE1-5: GET /api/calls - 목록 조회 (15분)

**BE1-3의 GET 함수에 포함됨**

---

### BE1-6: 자연어 파싱 로직 (15분) - GPT-4 + Regex Fallback

**파일**: `lib/parser.ts`

```typescript
// lib/parser.ts
import OpenAI from 'openai'
import { ParsedRequest } from '@/shared/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function parseRequest(requestText: string): Promise<ParsedRequest> {
  try {
    return await parseWithGPT(requestText)
  } catch (error) {
    console.error('GPT-4 parsing failed, using regex fallback:', error)
    return parseWithRegex(requestText)
  }
}

// Primary: GPT-4 parser
async function parseWithGPT(requestText: string): Promise<ParsedRequest> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a parser that extracts structured information from Korean natural language requests.
Extract the following information and return as JSON:
- type: "RESERVATION" or "INQUIRY"
- targetName: name of the place/business
- date: date in YYYY-MM-DD format (interpret "내일" as tomorrow, "모레" as day after tomorrow)
- time: time in HH:MM format (interpret "오후 3시" as 15:00)
- service: type of service requested (for reservations)
- question: the question being asked (for inquiries)

Today's date is ${new Date().toISOString().split('T')[0]}.
Return only valid JSON, no explanation.`
      },
      {
        role: 'user',
        content: requestText
      }
    ],
    response_format: { type: 'json_object' }
  })

  const result = JSON.parse(completion.choices[0].message.content || '{}')

  return {
    type: result.type || 'RESERVATION',
    targetName: result.targetName || '알 수 없음',
    date: result.date,
    time: result.time,
    service: result.service,
    question: result.question
  }
}

// Fallback: Regex-based Korean date/time parser
function parseWithRegex(requestText: string): ParsedRequest {
  const today = new Date()

  // Type detection
  const isInquiry = /문의|확인|알려|영업시간|가격/.test(requestText)
  const type = isInquiry ? 'INQUIRY' : 'RESERVATION'

  // Target name extraction (XX미용실, XX식당, XX병원, XX카페 등)
  const nameMatch = requestText.match(/([가-힣A-Za-z0-9]+(?:미용실|식당|병원|카페|호텔|약국|치과|한의원|피부과|네일|헬스|필라테스|요가))/)
  const targetName = nameMatch ? nameMatch[1] : '알 수 없음'

  // Date parsing
  let date: string | undefined
  if (/내일/.test(requestText)) {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    date = tomorrow.toISOString().split('T')[0]
  } else if (/모레/.test(requestText)) {
    const dayAfter = new Date(today)
    dayAfter.setDate(dayAfter.getDate() + 2)
    date = dayAfter.toISOString().split('T')[0]
  } else if (/오늘/.test(requestText)) {
    date = today.toISOString().split('T')[0]
  }

  // Time parsing
  let time: string | undefined
  const timeMatch = requestText.match(/(오전|오후)\s*(\d{1,2})시/)
  if (timeMatch) {
    let hour = parseInt(timeMatch[2])
    if (timeMatch[1] === '오후' && hour !== 12) hour += 12
    if (timeMatch[1] === '오전' && hour === 12) hour = 0
    time = `${hour.toString().padStart(2, '0')}:00`
  }

  // Service extraction (커트, 파마, 염색, 네일 등)
  const serviceMatch = requestText.match(/(커트|컷|파마|염색|네일|마사지|필라테스|요가|진료|검진|상담)/)
  const service = serviceMatch ? serviceMatch[1] : undefined

  // Question extraction (for INQUIRY type)
  const question = isInquiry ? requestText : undefined

  return {
    type,
    targetName,
    date,
    time,
    service,
    question
  }
}
```

---

## 파일 구조

```
prisma/
└── schema.prisma        ← DB 스키마

app/
└── api/
    └── calls/
        ├── route.ts     ← POST (생성), GET (목록)
        └── [id]/
            └── route.ts ← GET (상세)

lib/
├── prisma.ts            ← Prisma 클라이언트
└── parser.ts            ← GPT-4 파싱 + regex fallback

shared/
└── types.ts             ← 공유 타입
```

---

## API 명세 요약

| Method | Endpoint | 설명 | Owner |
|--------|----------|------|-------|
| POST | `/api/calls` | 통화 요청 생성 | BE1 |
| GET | `/api/calls` | 통화 목록 조회 | BE1 |
| GET | `/api/calls/[id]` | 통화 상세 조회 | BE1 |
| POST | `/api/calls/[id]/start` | 통화 시작 | **BE2** |

> 자세한 API 형태는 `api-contract.mdc` 참고

---

## 의존성

- **주는 것**:
  - FE1, FE2에게 API 제공
  - BE2에게 Call 모델과 Prisma 클라이언트 제공
- **받는 것**:
  - BE2가 `start/route.ts`에서 status/result 업데이트

---

## 체크포인트

| 시간 | 체크 |
|------|------|
| 0:30 | 프로젝트 셋업 완료, npm run dev 동작 |
| 0:45 | Prisma 스키마 + 마이그레이션 완료 |
| 1:10 | POST /api/calls 동작 (curl 테스트) |
| 1:25 | GET /api/calls/[id] 동작 |
| 1:40 | GET /api/calls 동작 |
| 1:55 | GPT-4 파싱 동작 + regex fallback 확인 |

---

## 테스트 명령어

```bash
# POST - 통화 생성
curl -X POST http://localhost:3000/api/calls \
  -H "Content-Type: application/json" \
  -d '{"requestText": "내일 오후 3시에 OO미용실 커트 예약해줘", "targetPhone": "010-1234-5678"}'

# GET - 상세 조회
curl http://localhost:3000/api/calls/{id}

# GET - 목록 조회
curl http://localhost:3000/api/calls
```

---

## 주의사항

1. **SQLite 사용**: 해커톤용 간소화, PostgreSQL 전환은 나중에
2. **에러 핸들링**: 기본적인 try-catch + GPT-4 fallback
3. **타입 공유**: `shared/types.ts`를 FE와 공유
4. **환경 변수**: `.env.local`에 API 키 필수
5. **start/route.ts 만들지 마세요**: BE2 전용 파일

---

## Phase 2 통합 시 할 일

- FE1과 API 연결 테스트
- BE2와 status 업데이트 흐름 확인
- 실제 데이터로 파싱 결과 확인
- Regex fallback이 제대로 동작하는지 확인
