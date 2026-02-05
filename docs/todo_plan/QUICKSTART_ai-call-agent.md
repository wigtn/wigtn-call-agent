# AI Call Agent - 4시간 해커톤 퀵스타트

> **4명이 4시간 안에 AI 전화 대행 서비스 만들기**

## 시작하기 전 체크리스트

### 필수 API 키 확인

| 서비스 | 용도 | 발급 |
|--------|------|------|
| OpenAI | 자연어 파싱 | [platform.openai.com](https://platform.openai.com) |
| ElevenLabs | AI 통화 | [elevenlabs.io](https://elevenlabs.io) |

### 팀 역할 배정

| 역할 | 담당 | 지시서 |
|------|------|--------|
| **FE1** | 입력/확인 UI | `.cursor/commands/call_agent/fe1-call-agent.md` |
| **FE2** | 결과/상태 UI | `.cursor/commands/call_agent/fe2-call-agent.md` |
| **BE1** | API + DB + 셋업 리드 | `.cursor/commands/call_agent/be1-call-agent.md` |
| **BE2** | ElevenLabs 연동 | `.cursor/commands/call_agent/be2-call-agent.md` |

### 필독 문서

모든 팀원이 개발 전에 반드시 확인:
- `.cursorrules` — 프로젝트 전체 규칙
- `.cursor/rules/team-workflow.mdc` — 파일 오너십 & 충돌 방지
- `.cursor/rules/api-contract.mdc` — API 스키마 (SSOT)

---

## Phase 0: 프로젝트 셋업 (30분)

### BE1이 실행 (다른 팀원은 대기)

```bash
# 1. 프로젝트 생성
npx create-next-app@latest ai-call-agent --typescript --tailwind --eslint --app
cd ai-call-agent

# 2. 의존성 설치
npm install prisma @prisma/client openai
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card

# 3. Prisma 설정
npx prisma init --datasource-provider sqlite

# 4. Git 설정
git init
git add .
git commit -m "chore: Initial setup"
```

### 모든 팀원

```bash
# 저장소 클론
git clone <repo-url>
cd ai-call-agent
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 편집해서 API 키 입력
```

### .env.local 내용

```bash
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
ELEVENLABS_AGENT_ID=...
ELEVENLABS_MOCK=true
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

> **IMPORTANT**: `ELEVENLABS_MOCK=true`가 기본값입니다. 이 상태에서 전체 플로우가 동작합니다.
> 실제 ElevenLabs 통화는 `ELEVENLABS_MOCK=false`로 변경해야 합니다.

---

## Phase 1: 개발 시작 (90분)

### 각자 브랜치 생성 후 작업

```bash
# FE1
git checkout -b feat/fe1-input-ui

# FE2
git checkout -b feat/fe2-result-ui

# BE1
git checkout -b feat/be1-api

# BE2
git checkout -b feat/be2-elevenlabs
```

### 각자 지시서 열기

Cursor에서 해당 지시서 파일을 열고 Cursor에게 지시:

```
이 지시서를 따라 개발해줘. [ROLE]-1부터 시작해.
```

### BE2 주의사항

**BE2-1 (Mock mode)이 최우선입니다.**
Mock mode가 동작해야 Phase 2에서 팀 전체가 통합 테스트 가능합니다.
Mock 완성 후에 실제 ElevenLabs 연동을 진행하세요.

---

## Phase 2: 통합 (60분)

### 브랜치 머지

```bash
# 모든 팀원이 작업 커밋
git add .
git commit -m "feat: Complete my tasks"
git push origin <branch-name>

# BE1이 머지 리드
git checkout main
git merge feat/be1-api
git merge feat/fe1-input-ui
git merge feat/fe2-result-ui
git merge feat/be2-elevenlabs
git push origin main
```

### 통합 테스트

1. `npm run dev` 실행
2. http://localhost:3000 접속
3. 요청 입력 → 확인 → 전화 걸기 → 결과 확인 (Mock 모드)

---

## 트러블슈팅

### Prisma 에러

```bash
npx prisma generate
npx prisma migrate dev --name fix
```

### ElevenLabs 연동 실패

Mock 모드가 기본 ON이므로 추가 조치 불필요:
```bash
# .env.local에 이미 설정됨
ELEVENLABS_MOCK=true
```

실제 연동 시도 후 실패하면 다시 `true`로 변경하고 Mock 모드로 데모하세요.

### GPT-4 파싱 실패

BE1의 parser.ts에 regex fallback이 있습니다:
- GPT-4 API 에러 시 자동으로 regex 파서로 대체
- "내일", "오후 3시", "커트" 등 기본 패턴 인식

### 포트 충돌

```bash
npx kill-port 3000
npm run dev
```

### 타입 에러

```bash
# shared/types.ts 확인
# BE1이 소유한 파일 - BE1에게 수정 요청
```

---

## 데모 준비 (15분)

### 테스트 시나리오

```
입력: "내일 오후 3시에 OO미용실 커트 예약해줘"
전화번호: 010-1234-5678

예상 결과 (Mock): 5초 후 → 예약 완료 → 결과 화면
예상 결과 (Real): AI가 실제 전화 → 예약 완료 → 결과 화면
```

### 백업 계획

1. **Plan A**: 실제 ElevenLabs 통화 (`ELEVENLABS_MOCK=false`)
2. **Plan B**: Mock 모드로 데모 (`ELEVENLABS_MOCK=true`)
3. **Plan C**: 화면 녹화 재생
4. **Plan D**: 스크린샷으로 설명

---

## 파일 구조 최종

```
ai-call-agent/
├── app/
│   ├── layout.tsx                 # FE1 - 메인 레이아웃
│   ├── page.tsx                   # FE1 - 입력 화면
│   ├── confirm/[id]/page.tsx      # FE1 - 확인 화면
│   ├── calling/[id]/page.tsx      # FE2 - 통화 중
│   ├── result/[id]/page.tsx       # FE2 - 결과
│   ├── history/page.tsx           # FE2 - 기록
│   └── api/
│       └── calls/
│           ├── route.ts           # BE1 - POST, GET
│           └── [id]/
│               ├── route.ts       # BE1 - GET
│               └── start/route.ts # BE2 전용
├── components/
│   ├── layout/Header.tsx          # FE1
│   └── call/
│       ├── RequestForm.tsx        # FE1
│       ├── ConfirmCard.tsx        # FE1
│       ├── CallingStatus.tsx      # FE2
│       ├── ResultCard.tsx         # FE2
│       └── HistoryList.tsx        # FE2
├── lib/
│   ├── prisma.ts                  # BE1
│   ├── parser.ts                  # BE1
│   ├── elevenlabs.ts              # BE2
│   ├── api.ts                     # FE1
│   └── validation.ts              # FE1
├── hooks/
│   └── useCallPolling.ts          # FE2
├── shared/
│   └── types.ts                   # BE1 (공유)
└── prisma/
    └── schema.prisma              # BE1
```

---

## 성공 기준 체크

- [ ] 입력 화면에서 요청 입력 가능
- [ ] 확인 화면에서 파싱 결과 표시
- [ ] 전화 걸기 버튼 동작 (Mock 모드)
- [ ] 통화 중 화면 표시 (polling 3초)
- [ ] 결과 화면 표시
- [ ] (보너스) 실제 ElevenLabs 통화 성공

---

## 발표 스크립트

**docs/PITCH.md** 참고 (2분 발표용)

---

## 핵심 참고 문서

| 문서 | 용도 |
|------|------|
| `.cursorrules` | 전체 프로젝트 규칙 |
| `.cursor/rules/api-contract.mdc` | API 스키마 SSOT |
| `.cursor/rules/team-workflow.mdc` | 파일 오너십 규칙 |
| `docs/DEMO-SCRIPT.md` | 데모 시나리오 |
| `docs/PITCH.md` | 발표 스크립트 |
