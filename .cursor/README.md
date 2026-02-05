# Cursor AI 설정 가이드 — WIGVO 해커톤

> 이 문서는 해커톤 당일 4명이 각자 Cursor를 열고 개발을 시작하기 전에 읽는 문서입니다.
> 폴더 구조, 각 파일의 역할, 그리고 사용 시나리오를 상세하게 안내합니다.

---

## 1. .cursor 폴더 구조

```
.cursor/
├── README.md                          ← 지금 읽고 있는 이 문서
├── rules/
│   ├── team-workflow.mdc              ← 파일 오너십 + 충돌 방지 규칙
│   └── api-contract.mdc               ← API 요청/응답 스키마 (SSOT)
└── commands/
    ├── fe1-call-agent.md              ← FE1 역할 지시서
    ├── fe2-call-agent.md              ← FE2 역할 지시서
    ├── be1-call-agent.md              ← BE1 역할 지시서
    └── be2-call-agent.md              ← BE2 역할 지시서
```

그리고 프로젝트 루트에:

```
.cursorrules                           ← Cursor AI 마스터 규칙 (자동 로드)
```

---

## 2. 각 파일의 역할

### `.cursorrules` (프로젝트 루트)

Cursor가 프로젝트를 열면 **자동으로 읽는** 파일입니다. 아래 내용이 담겨 있습니다:

- 프로젝트 개요 (WIGVO가 뭔지)
- 아키텍처 (Next.js 16 + ElevenLabs + Prisma)
- 전체 파일 구조 (어떤 파일이 어디에 있는지)
- 역할별 담당 파일 요약
- 코딩 컨벤션 (TypeScript, React, Tailwind 규칙)
- **절대 규칙** (남의 파일 건드리지 마라, api-contract 먼저 읽어라 등)
- Git 브랜치 전략
- 환경 변수 목록

Cursor AI가 코드를 생성할 때 이 규칙을 자동으로 따릅니다. 별도로 프롬프트에 넣을 필요 없습니다.

### `.cursor/rules/team-workflow.mdc`

`alwaysApply: true`로 설정되어 있어서, Cursor가 **어떤 파일을 편집하든** 항상 이 규칙을 인식합니다.

담고 있는 내용:
- **파일 오너십 테이블**: 23개 파일이 4개 역할에 1:1 매핑
- **충돌 방지 규칙**: "남의 파일 수정 금지", "필요하면 TODO 코멘트로 요청"
- **Phase별 타임라인**: 언제 뭘 해야 하는지
- **통합 체크포인트**: Phase 2, 3 시작 시 확인할 항목 목록
- **커뮤니케이션 프로토콜**: 블로킹, 버그 발견 시 대응 방법

이 파일 덕분에 Cursor AI가 "이 파일은 BE2 소유니까 내가 수정하면 안 돼"를 자동으로 인식합니다.

### `.cursor/rules/api-contract.mdc`

마찬가지로 `alwaysApply: true`입니다.

담고 있는 내용:
- **4개 API 엔드포인트**의 완전한 요청/응답 JSON 예시
  - `POST /api/calls` — 통화 요청 생성
  - `GET /api/calls` — 통화 목록 조회
  - `GET /api/calls/[id]` — 통화 상세 조회
  - `POST /api/calls/[id]/start` — 통화 시작
- 각 엔드포인트별 에러 응답 (400, 404, 500)
- TypeScript 인터페이스 (Call, CreateCallRequest, ParsedRequest)
- Status 흐름도 (PENDING → CALLING → IN_PROGRESS → COMPLETED)
- Mock 모드 동작 설명
- 필드 매핑 테이블

FE가 `fetch('/api/calls')` 할 때, BE가 `NextResponse.json()` 반환할 때, 양쪽이 같은 모양을 보게 됩니다. 이 파일이 없으면 "FE는 `call.date`로 접근하는데 BE는 `parsedDate`로 내려줌" 같은 사고가 납니다.

### `.cursor/commands/*.md` (역할별 지시서)

Cursor에서 직접 열어서 AI에게 "이 지시서 따라 개발해줘"라고 던지는 파일입니다.

각 지시서에 공통으로 들어있는 것:
- **필독 문서 안내** (`.cursorrules`, `team-workflow.mdc`, `api-contract.mdc`)
- **파일 오너십** (내가 소유하는 파일 / 절대 건드리면 안 되는 파일)
- **태스크 목록** (번호 순서대로 구현하면 됨)
- **각 태스크별 코드 스니펫** (복사-붙여넣기 수준의 상세한 가이드)
- **체크포인트** (몇 분까지 뭐가 되어있어야 하는지)
- **Phase 2 통합 시 할 일**

역할별 차이점:

| 지시서 | 핵심 태스크 | 주의사항 |
|--------|------------|---------|
| **fe1** | 입력 폼, 확인 화면, 유효성 검사, API 함수 | `app/api/` 절대 금지 |
| **fe2** | 통화 중 화면, 결과 화면, 기록 목록, 폴링 훅 | 폴링 간격 반드시 **3초** |
| **be1** | Prisma 스키마, 3개 API, GPT-4 파서 + regex fallback | `start/route.ts` 만들지 마세요 |
| **be2** | **Mock mode (BE2-1 최우선)**, start route, ElevenLabs SDK | Mock 먼저. 나머지는 나중 |

---

## 3. 사전 준비 항목

### API Key 3개 확보 (전원 공유)

| # | Key | 발급처 | 용도 |
|---|-----|--------|------|
| 1 | `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) | 자연어 파싱 (GPT-4) |
| 2 | `ELEVENLABS_API_KEY` | [elevenlabs.io](https://elevenlabs.io) | AI 통화 |
| 3 | `ELEVENLABS_AGENT_ID` | ElevenLabs 대시보드 → Agents | 예약 Agent |

> 당일에 발급받으면 30분 이상 소요됩니다. **반드시 전날까지 준비하세요.**

### ElevenLabs Agent 사전 생성 (BE2 담당)

1. ElevenLabs 대시보드 → Conversational AI → Create Agent
2. `be2-call-agent.md`의 BE2-2 섹션에 있는 프롬프트 복사하여 입력
3. Voice: Korean voice 선택
4. Twilio 연동 설정 (전화번호 발급)
5. Agent ID 메모 → 팀에 공유

### 환경 확인 (전원)

```bash
node -v    # 18 이상
git -v     # 설치 확인
```

### GitHub 저장소 (아무나 1명)

1. 이 레포를 GitHub private 저장소에 push
2. 4명 전원을 collaborator로 추가
3. main 브랜치 protection 끄기 (해커톤이라 빠르게 머지)

### 당일 아침 (현장 도착 후)

1. `.env.example`을 복사하여 `.env.local` 생성
2. API Key 3개 입력
3. `ELEVENLABS_MOCK=true` 확인 (기본값)
4. 팀원 중 1명 전화번호 준비 (실제 통화 테스트용)
5. 화면 녹화 소프트웨어 켜두기 (데모 백업)

---

## 4. 당일 사용 시나리오 (Phase별 상세)

### Phase 0: 프로젝트 셋업 (0:00 - 0:30)

#### BE1이 하는 일

```bash
npx create-next-app@latest ai-call-agent --typescript --tailwind --eslint --app
cd ai-call-agent
npm install prisma @prisma/client openai
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card
npx prisma init --datasource-provider sqlite
```

그 다음 Cursor를 열고 `be1-call-agent.md`의 Phase 0 섹션을 따라:
- 디렉토리 구조 생성
- `.env.example` 복사
- `shared/types.ts` 생성
- git init → commit → push

#### 나머지 3명이 하는 일

```bash
git clone <repo-url>
cd ai-call-agent
npm install
cp .env.example .env.local
# .env.local에 API Key 입력
```

그리고 **자기 역할 지시서를 미리 읽어둡니다**:
- FE1 → `.cursor/commands/fe1-call-agent.md`
- FE2 → `.cursor/commands/fe2-call-agent.md`
- BE2 → `.cursor/commands/be2-call-agent.md`

#### 체크포인트 (0:30)

전원이 `npm run dev` → localhost:3000 → Next.js 기본 화면 확인

---

### Phase 1: 병렬 개발 (0:30 - 2:00)

#### 1단계: 브랜치 생성

각자 터미널에서:
```bash
git checkout -b feat/fe1-input-ui     # FE1
git checkout -b feat/fe2-result-ui    # FE2
git checkout -b feat/be1-api          # BE1
git checkout -b feat/be2-elevenlabs   # BE2
```

#### 2단계: Cursor에게 지시

Cursor 채팅창에 자기 지시서 파일을 열고:

```
이 지시서를 따라 개발해줘. [본인역할]-1부터 시작해.
예: "BE1-1부터 시작해" or "FE2-1부터 시작해"
```

Cursor가 `.cursorrules` + `team-workflow.mdc` + `api-contract.mdc`를 자동으로 인식하고 있기 때문에:
- 남의 파일을 건드리지 않음
- API 응답 형태를 정확히 맞춤
- 코딩 컨벤션을 따름

#### 3단계: 태스크 순서대로 진행

각 지시서에 태스크 번호가 있습니다 (FE1-1, FE1-2, ... / BE2-1, BE2-2, ...).
순서대로 하나씩 완성하면 됩니다.

**하나의 태스크가 끝날 때마다 커밋하세요:**
```bash
git add .
git commit -m "feat(fe1): FE1-2 요청 입력 폼 완성"
```

#### 4단계: 중간 체크 (1:15 경)

각자 진행 상황 공유:
- "나 FE1-3 확인 화면까지 했어"
- "BE2-1 Mock mode 완성! start 호출하면 5초 후 COMPLETED 됨"
- 블로킹 있으면 "BLOCKED: BE1이 types.ts에 뭐 추가해줘야 해"

#### BE2 특별 주의사항

BE2는 반드시 이 순서를 지켜야 합니다:

```
BE2-1: Mock mode (필수 최우선) ← 이게 안 되면 Phase 2 전체 블로킹
  ↓
BE2-2: Agent 프롬프트 (ElevenLabs 대시보드)
  ↓
BE2-3: start/route.ts 완성
  ↓
BE2-4: 실제 ElevenLabs 연동 (시간 되면)
  ↓
BE2-5: Polling 결과 수집 (시간 되면)
```

BE2-1이 완성되면 팀에 즉시 알려야 합니다. Phase 2에서 전원이 Mock 모드로 통합 테스트를 하기 때문입니다.

---

### Phase 2: 통합 (2:00 - 3:00)

#### 1단계: 브랜치 머지 (BE1 리드, ~10분)

```bash
# BE1이 실행
git checkout main
git pull origin main
git merge feat/be1-api
git merge feat/fe1-input-ui
git merge feat/fe2-result-ui
git merge feat/be2-elevenlabs
git push origin main

# 충돌 발생 시: team-workflow.mdc의 오너십 기준으로 해당 역할자가 해결
```

나머지 3명:
```bash
git checkout main
git pull origin main
npm install  # 혹시 의존성 변경 있을 수 있음
```

#### 2단계: 페어 연결 (40분)

**페어 A: FE1 + BE1**

테스트 순서:
1. 메인 페이지에서 요청 입력 → [전화 부탁하기] 클릭
2. POST /api/calls 호출 → DB에 저장 → Call 객체 반환 확인
3. /confirm/[id] 이동 → 파싱된 데이터 표시 확인
4. 파싱이 이상하면 BE1의 parser.ts 디버깅

확인할 것:
- `requestText`가 제대로 전달되는지
- `parsedDate`, `parsedTime`, `parsedService`가 올바른지
- 에러 시 에러 메시지 표시되는지

**페어 B: FE2 + BE2**

테스트 순서:
1. /confirm/[id]에서 [전화 걸기] 클릭
2. POST /api/calls/[id]/start 호출 → status가 CALLING → IN_PROGRESS 변경 확인
3. /calling/[id] 페이지에서 폴링 동작 확인 (3초마다 GET /api/calls/[id])
4. Mock: 5초 후 status가 COMPLETED + result가 SUCCESS로 변경
5. 자동으로 /result/[id]로 이동 → 결과 데이터 표시 확인

확인할 것:
- 폴링이 3초마다 동작하는지 (Network 탭)
- status 변화를 감지하면 자동 redirect 되는지
- summary가 제대로 표시되는지

#### 3단계: E2E 풀 플로우 테스트 (10분)

전원이 함께 한 번 돌려봅니다:

```
입력: "내일 오후 3시에 OO미용실 커트 예약해줘" + 010-1234-5678
  → [전화 부탁하기]
  → 확인 화면 (장소: OO미용실, 날짜: 내일, 시간: 15:00, 서비스: 커트)
  → [전화 걸기]
  → 통화 중 화면 (5초 대기)
  → 결과 화면 (예약이 완료되었습니다!)
  → [기록 보기] → 통화 기록 목록에 표시
```

이 플로우가 끊기지 않고 돌아가면 Phase 2 성공입니다.

---

### Phase 3: 테스트 & 버그 수정 (3:00 - 3:45)

버그 수정 우선순위:

| 등급 | 기준 | 대응 |
|------|------|------|
| **Critical** | 플로우가 끊김 (화면 전환 실패, API 500 등) | 즉시 수정 |
| **High** | UI 깨짐 (레이아웃 무너짐, 데이터 안 보임) | 가능하면 수정 |
| **Low** | 스타일 이슈 (간격, 색상, 폰트) | 스킵 |

시간이 남으면:
- `ELEVENLABS_MOCK=false`로 변경하여 실제 통화 1회 시도
- 팀원 전화번호로 테스트
- 성공하면 데모에서 실제 통화 시연 가능 (Plan A)

---

### Phase 4: 데모 준비 (3:45 - 4:00)

1. **데모 데이터 정리**: DB 초기화 후 깨끗한 상태에서 시작
   ```bash
   rm prisma/dev.db
   npx prisma migrate dev --name init
   ```

2. **데모 리허설**: `docs/DEMO-SCRIPT.md` 보면서 1회 실행

3. **백업 계획 확인**:
   - Plan A: 실제 ElevenLabs 통화 (`ELEVENLABS_MOCK=false`)
   - Plan B: Mock 모드 데모 (`ELEVENLABS_MOCK=true`)
   - Plan C: 사전 녹화 영상 재생
   - Plan D: 스크린샷으로 설명

4. **발표 준비**: `docs/PITCH.md` 읽고 2분 발표 연습

---

## 5. Cursor Rules 로딩 구조

### `.cursorrules` vs `.cursor/rules/*.mdc`

```
프로젝트 열기
  │
  ├─① .cursorrules              자동 로드 (항상, 무조건)
  │     프로젝트 루트에 있으면 모든 대화에서 시스템 프롬프트처럼 주입
  │     = "이 프로젝트의 헌법"
  │
  └─② .cursor/rules/*.mdc       조건부 로드 (frontmatter 설정에 따라)
        각 파일 상단의 YAML 메타데이터로 적용 범위 결정
        = "상황별 시행령"
```

### 적용 등급 3가지

`.mdc` 파일 상단에 YAML frontmatter로 적용 조건을 지정합니다:

```yaml
---
description: 이 규칙이 뭔지 설명
globs: "**/*.tsx"
alwaysApply: true
---
```

| 등급 | 설정 | 동작 | 예시 |
|------|------|------|------|
| **Always Apply** | `alwaysApply: true` | 모든 대화에서 항상 로드 | `team-workflow.mdc`, `api-contract.mdc` |
| **Auto Attached** | `alwaysApply: false` + `globs` | 해당 패턴 파일 편집 시에만 자동 로드 | (이 프로젝트에서는 미사용 — Command 파일로 대체) |
| **Agent Requested** | `alwaysApply: false` + globs 없음 | AI가 description을 보고 필요하다고 판단하면 로드 | (이 프로젝트에서는 미사용) |

### 왜 .cursorrules에 전부 넣지 않는가?

`.cursorrules`에 모든 규칙을 넣으면 **매 대화마다** 전부 로드되어 Cursor의 컨텍스트 윈도우를 낭비합니다.

```
나쁜 예: .cursorrules 3000줄
──────────────────────────
모든 규칙이 항상 로드 → 컨텍스트 낭비
FE 작업할 때 Prisma 규칙이 로드됨 (불필요)
BE 작업할 때 React 규칙이 로드됨 (불필요)

좋은 예: 등급별 분리
──────────────────────────
.cursorrules (200줄)                              ← 항상 로드 (핵심만)
.cursor/rules/team-workflow.mdc (alwaysApply)     ← 항상 로드 (전원 필수)
.cursor/rules/api-contract.mdc  (alwaysApply)     ← 항상 로드 (전원 필수)
→ 핵심 규약만 항상 로드, 세부 구현 지침은 Command 파일에서 제공
```

### 실제 로딩 순서

```
Cursor AI가 코드 생성할 때 참조하는 컨텍스트:

1. .cursorrules                    ← 항상
2. alwaysApply: true 규칙들         ← 항상
3. glob 매칭된 규칙들               ← 현재 편집 중인 파일에 따라
4. 현재 열린 파일들                 ← 에디터에 열려있는 탭
5. 사용자가 @로 첨부한 파일          ← 수동
```

### 이 프로젝트의 rules 구성

| 파일 | 등급 | 로드 조건 | 대상 역할 |
|------|------|----------|----------|
| `team-workflow.mdc` | Always Apply | 항상 | 전원 |
| `api-contract.mdc` | Always Apply | 항상 | 전원 |

> **참고**: 세부 구현 규칙(React 컴포넌트 패턴, API 라우트 패턴, Prisma 규칙, ElevenLabs 연동 등)은
> 각 역할별 Command 파일(`fe1/fe2/be1/be2-call-agent.md`)에 이미 상세히 포함되어 있으므로,
> 별도의 Auto Attached 규칙 파일을 두지 않습니다.
> 해커톤 진행 중 필요하다고 판단되면 그때 추가하면 됩니다.

---

## 6. Cursor AI가 자동으로 인식하는 것들

이 설정의 핵심은 "Cursor에게 매번 설명하지 않아도 된다"는 것입니다.

| 상황 | Cursor가 알고 있는 것 | 근거 파일 |
|------|---------------------|-----------|
| FE1이 `RequestForm.tsx` 작성 중 | "POST /api/calls의 응답은 Call 객체이고, id로 /confirm/[id]로 이동해야 함" | `api-contract.mdc` |
| BE1이 `route.ts` 작성 중 | "start/route.ts는 내가 만들면 안 됨, BE2 전용" | `team-workflow.mdc` |
| BE2가 `elevenlabs.ts` 작성 중 | "Mock mode를 제일 먼저 구현해야 하고, ELEVENLABS_MOCK 환경변수를 체크해야 함" | `.cursorrules` + 지시서 |
| FE2가 폴링 로직 작성 중 | "3초 간격, COMPLETED 또는 FAILED이면 /result/[id]로 이동" | `api-contract.mdc` |
| 누가 새 파일을 만들려 할 때 | "이 파일은 [역할]이 소유하는 파일임" | `team-workflow.mdc` |

---

## 7. 트러블슈팅

### "Cursor가 남의 파일을 수정하려고 해요"

Cursor 채팅에 이렇게 입력:
```
team-workflow.mdc의 File-Level Ownership 규칙을 확인하고,
내 역할(FE1/FE2/BE1/BE2)이 소유한 파일만 수정해줘.
```

### "API 응답 형태가 FE와 BE가 다릅니다"

양쪽 모두에게:
```
api-contract.mdc를 확인하고, 해당 엔드포인트의 정확한 JSON 형태로 맞춰줘.
```

### "Mock mode가 동작 안 해요"

1. `.env.local`에 `ELEVENLABS_MOCK=true` 있는지 확인
2. BE2의 `lib/elevenlabs.ts`에서 `isMockMode()` 함수 확인
3. `start/route.ts`에서 `setTimeout` 5초 후 DB 업데이트 로직 확인

### "GPT-4 파싱이 실패해요"

BE1의 `lib/parser.ts`에 regex fallback이 내장되어 있음:
- "내일" → 내일 날짜
- "오후 3시" → 15:00
- "커트" → 서비스명
- GPT-4 없이도 기본 파싱은 동작

### "Prisma 에러"

```bash
npx prisma generate
npx prisma migrate dev --name fix
```

---

## 8. 파일 수정 시 주의사항

이 `.cursor/` 폴더 안의 파일들은 **해커톤 전에 준비가 끝난 상태**입니다.
당일에는 수정할 필요가 없습니다.

만약 수정이 필요한 경우:
- `api-contract.mdc`: API 스키마 변경 시 → **반드시 전원에게 공유**
- `team-workflow.mdc`: 파일 오너십 변경 시 → **해당 역할자 동의 필요**
- 역할별 지시서: 태스크 추가/변경 시 → 해당 역할자만 수정
- `.cursorrules`: 건드리지 마세요
