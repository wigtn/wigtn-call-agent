# Scripts

해커톤 당일 프로젝트 초기화 및 테스트를 위한 스크립트입니다.

## 스크립트 목록

| 스크립트 | 용도 | 실행 시점 |
|---------|------|----------|
| `init-project.sh` | Next.js + Supabase 프로젝트 초기화 | Phase 0 (BE1 리드) |
| `supabase-tables.sql` | Supabase 테이블 생성 | Phase 0 (Dashboard에서) |
| `test-elevenlabs.mjs` | ElevenLabs 단독 테스트 | 사전 테스트 |
| `test-call-pipeline.mjs` | E2E 파이프라인 테스트 | 통합 테스트 |

---

## 실행 순서

```
1. Supabase 테이블 생성 (Dashboard → SQL Editor)
   └── scripts/supabase-tables.sql 내용 복사 → Run

2. 프로젝트 초기화 (BE1 리드)
   └── ./scripts/init-project.sh

3. 환경변수 설정 (전원)
   └── .env.local 편집

4. 개발 서버 시작
   └── npm run dev
```

---

## 스크립트 상세

### `init-project.sh` — 프로젝트 초기화

```bash
chmod +x scripts/init-project.sh
./scripts/init-project.sh
```

수행 내용:
1. Next.js 16 프로젝트 생성 (TypeScript, Tailwind, App Router)
2. 의존성 설치 (`@supabase/supabase-js`, `@supabase/ssr`, `openai`, `zod`)
3. shadcn/ui 초기화 + 기본 컴포넌트 (button, input, card, avatar, scroll-area)
4. 디렉토리 구조 생성 (`app/api/*`, `components/chat`, `hooks`, `lib/supabase`)
5. Supabase 클라이언트 보일러플레이트 (`client.ts`, `server.ts`, `middleware.ts`)
6. 타입 정의 파일 (`types/database.ts`)

### `supabase-tables.sql` — 테이블 생성

Supabase Dashboard → SQL Editor에서 실행:

```sql
-- 생성되는 테이블:
-- 1. conversations (대화 세션)
-- 2. messages (대화 메시지)
-- 3. calls (전화 기록)
-- + 인덱스 + RLS 정책
```

### `test-elevenlabs.mjs` — ElevenLabs 단독 테스트

```bash
node scripts/test-elevenlabs.mjs
```

환경변수 필요:
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID`
- `ELEVENLABS_PHONE_NUMBER_ID`
- `TEST_PHONE_NUMBER` (E.164 형식: +821012345678)

### `test-call-pipeline.mjs` — E2E 파이프라인 테스트

```bash
node scripts/test-call-pipeline.mjs
```

테스트 플로우:
1. 하드코딩된 CollectedData 로드
2. Dynamic Prompt 생성 (시나리오별 템플릿)
3. ElevenLabs Outbound Call 시작
4. Polling으로 통화 결과 대기

---

## 환경변수 체크리스트

| 변수 | 필수 | 설명 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `OPENAI_API_KEY` | ✅ | OpenAI API 키 |
| `ELEVENLABS_API_KEY` | ✅ | ElevenLabs API 키 |
| `ELEVENLABS_AGENT_ID` | ✅ | ElevenLabs Agent ID |
| `ELEVENLABS_PHONE_NUMBER_ID` | 실제 전화 시 | Twilio 번호 ID |
| `ELEVENLABS_MOCK` | ✅ | Mock 모드 (기본 true) |
| `TEST_PHONE_NUMBER` | 테스트 시 | E.164 형식 (+821012345678) |

---

## 레거시 스크립트 (참고용)

| 스크립트 | 설명 |
|---------|------|
| `setup-lead.sh` | v1 BE1 셋업 (Prisma 기반) |
| `setup-member.sh` | v1 멤버 셋업 (Prisma 기반) |

> v2에서는 `init-project.sh`로 대체됨
