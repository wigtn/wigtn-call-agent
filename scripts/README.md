# Scripts

해커톤 당일 Phase 0에서 전원이 동일한 환경을 세팅하기 위한 스크립트입니다.

## 실행 순서

```
BE1 (리드)                          나머지 3명 (FE1, FE2, BE2)
─────────────                       ──────────────────────────
1. setup-lead.sh 실행               (대기)
2. git push origin main             (대기)
3. "push 완료" 알림                 4. git pull origin main
                                    5. setup-member.sh 실행
                                    6. npm run dev 확인
```

## 스크립트 설명

### `setup-lead.sh` — BE1 전용, 최초 1회

```bash
chmod +x scripts/setup-lead.sh
./scripts/setup-lead.sh
```

수행 내용:
1. 환경 검증 (Node.js 18+, Git)
2. `npm install`
3. shadcn/ui 컴포넌트 설치 (button, input, card)
4. `.env.example` → `.env.local` 복사
5. Prisma 클라이언트 생성
6. 소스코드 디렉토리 구조 생성 (app/, components/, lib/, hooks/, shared/)
7. 설치 검증

### `setup-member.sh` — FE1, FE2, BE2

```bash
chmod +x scripts/setup-member.sh
./scripts/setup-member.sh
```

수행 내용:
1. 환경 검증 (Node.js 18+)
2. `npm install`
3. `.env.example` → `.env.local` 복사
4. Prisma 클라이언트 생성 + DB 마이그레이션
5. 설치 검증

## 실행 후

스크립트 완료 후 각자 해야 할 일:

1. `.env.local`에 API Key 입력
2. `npm run dev` → http://localhost:3000 확인
3. 자기 역할 브랜치 생성 (`git checkout -b feat/...`)
4. Cursor에서 자기 역할 command 실행 (`/fe1-call-agent` 등)
