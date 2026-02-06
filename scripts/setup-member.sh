#!/bin/bash
# =============================================================================
# WIGVO — Phase 0 Setup (Member / FE1, FE2, BE2)
# =============================================================================
# BE1이 초기 셋업을 push한 뒤, 나머지 3명이 실행합니다.
#
# 사용법:
#   git clone <repo-url> && cd wigtn-call-agent
#   chmod +x scripts/setup-member.sh
#   ./scripts/setup-member.sh
# =============================================================================

set -e

echo "========================================="
echo "  WIGVO — Phase 0 Setup (Member)"
echo "========================================="
echo ""

# ----- 1. 환경 검증 -----
echo "[1/5] 환경 검증..."

if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js가 설치되어 있지 않습니다."
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "ERROR: Node.js 18 이상이 필요합니다. (현재: $(node -v))"
  exit 1
fi

echo "  Node.js $(node -v)"
echo "  npm $(npm -v)"
echo ""

# ----- 2. 의존성 설치 -----
echo "[2/5] 의존성 설치..."
npm install
echo ""

# ----- 3. 환경 변수 설정 -----
echo "[3/5] 환경 변수 설정..."
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "  .env.local 생성 완료 (.env.example 복사)"
  echo ""
  echo "  ⚠️  .env.local에 API Key를 입력하세요:"
  echo "     NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co"
  echo "     NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ..."
  echo "     OPENAI_API_KEY=sk-..."
  echo "     ELEVENLABS_API_KEY=..."
  echo "     ELEVENLABS_AGENT_ID=..."
  echo ""
else
  echo "  .env.local 이미 존재합니다."
fi
echo ""

# ----- 4. Prisma 클라이언트 생성 -----
echo "[4/5] Prisma 클라이언트 생성..."
if [ -f prisma/schema.prisma ]; then
  npx prisma generate
  npx prisma migrate dev --name init 2>/dev/null || echo "  (DB 이미 초기화됨)"
  echo "  Prisma 클라이언트 생성 완료"
else
  echo "  (prisma/schema.prisma 아직 없음 — BE1이 push하면 다시 실행)"
fi
echo ""

# ----- 5. 검증 -----
echo "[5/5] 설치 검증..."

PASS=true

if [ -d node_modules ]; then
  echo "  [OK] node_modules 존재"
else
  echo "  [FAIL] node_modules 없음"
  PASS=false
fi

if [ -f .env.local ]; then
  echo "  [OK] .env.local 존재"
else
  echo "  [FAIL] .env.local 없음"
  PASS=false
fi

if [ -f package.json ]; then
  echo "  [OK] package.json 존재"
else
  echo "  [FAIL] package.json 없음"
  PASS=false
fi

echo ""

if [ "$PASS" = true ]; then
  echo "========================================="
  echo "  Setup 완료!"
  echo "========================================="
  echo ""
  echo "  다음 단계:"
  echo "    1. .env.local에 API Key 입력"
  echo "    2. npm run dev → http://localhost:3000 확인"
  echo "    3. 자기 역할 브랜치 생성:"
  echo "       git checkout -b feat/fe1-input-ui"
  echo "       git checkout -b feat/fe2-result-ui"
  echo "       git checkout -b feat/be2-elevenlabs"
  echo "    4. Cursor에서 자기 역할 command 실행:"
  echo "       /fe1-call-agent  /fe2-call-agent  /be2-call-agent"
  echo ""
else
  echo "========================================="
  echo "  Setup 실패 — 위 에러를 확인하세요"
  echo "========================================="
  exit 1
fi
