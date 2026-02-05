#!/bin/bash
# =============================================================================
# WIGVO — Phase 0 Setup (Lead / BE1 전용)
# =============================================================================
# BE1이 해커톤 시작 직후 1회 실행합니다.
# Next.js 프로젝트 생성, 의존성 설치, Prisma 초기화, 디렉토리 구조 생성까지 수행합니다.
#
# 사용법:
#   chmod +x scripts/setup-lead.sh
#   ./scripts/setup-lead.sh
# =============================================================================

set -e

echo "========================================="
echo "  WIGVO — Phase 0 Setup (Lead)"
echo "========================================="
echo ""

# ----- 1. 환경 검증 -----
echo "[1/7] 환경 검증..."

if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js가 설치되어 있지 않습니다."
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "ERROR: Node.js 18 이상이 필요합니다. (현재: $(node -v))"
  exit 1
fi

if ! command -v git &> /dev/null; then
  echo "ERROR: Git이 설치되어 있지 않습니다."
  exit 1
fi

echo "  Node.js $(node -v)"
echo "  npm $(npm -v)"
echo "  Git $(git --version | cut -d' ' -f3)"
echo ""

# ----- 2. 의존성 설치 -----
echo "[2/7] 의존성 설치..."
npm install
echo ""

# ----- 3. shadcn/ui 설치 -----
echo "[3/7] shadcn/ui 컴포넌트 설치..."
# shadcn/ui init은 이미 되어있다고 가정 (create-next-app 이후)
# 필요한 컴포넌트만 추가
npx shadcn@latest add button input card -y 2>/dev/null || echo "  (shadcn 컴포넌트 이미 존재하거나, 프로젝트 생성 후 설치 필요)"
echo ""

# ----- 4. 환경 변수 설정 -----
echo "[4/7] 환경 변수 설정..."
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "  .env.local 생성 완료 (.env.example 복사)"
  echo ""
  echo "  ⚠️  .env.local에 API Key를 입력하세요:"
  echo "     OPENAI_API_KEY=sk-..."
  echo "     ELEVENLABS_API_KEY=..."
  echo "     ELEVENLABS_AGENT_ID=..."
  echo ""
else
  echo "  .env.local 이미 존재합니다."
fi
echo ""

# ----- 5. Prisma 초기화 -----
echo "[5/7] Prisma 초기화..."
npx prisma generate 2>/dev/null || echo "  (prisma schema가 아직 없음 — BE1이 생성 예정)"
echo ""

# ----- 6. 디렉토리 구조 생성 -----
echo "[6/7] 소스코드 디렉토리 구조 생성..."

# app/ 라우트 디렉토리
mkdir -p app/confirm/\[id\]
mkdir -p app/calling/\[id\]
mkdir -p app/result/\[id\]
mkdir -p app/history
mkdir -p app/api/calls/\[id\]/start

# components/
mkdir -p components/layout
mkdir -p components/call

# lib, hooks, shared
mkdir -p lib
mkdir -p hooks
mkdir -p shared

# prisma (이미 있을 수 있음)
mkdir -p prisma

echo "  디렉토리 구조:"
echo "    app/confirm/[id]/"
echo "    app/calling/[id]/"
echo "    app/result/[id]/"
echo "    app/history/"
echo "    app/api/calls/[id]/start/"
echo "    components/layout/"
echo "    components/call/"
echo "    lib/"
echo "    hooks/"
echo "    shared/"
echo "    prisma/"
echo ""

# ----- 7. 검증 -----
echo "[7/7] 설치 검증..."

PASS=true

if [ -f node_modules/.package-lock.json ] || [ -d node_modules ]; then
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

if [ -d app/api/calls ]; then
  echo "  [OK] 디렉토리 구조 생성됨"
else
  echo "  [FAIL] 디렉토리 구조 누락"
  PASS=false
fi

echo ""

if [ "$PASS" = true ]; then
  echo "========================================="
  echo "  Setup 완료!"
  echo "========================================="
  echo ""
  echo "  다음 단계:"
  echo "  1. .env.local에 API Key 입력"
  echo "  2. Cursor 열고 /be1-call-agent 실행"
  echo "  3. BE1-1부터 시작"
  echo ""
  echo "  팀원들에게 안내:"
  echo "  git pull origin main && ./scripts/setup-member.sh"
  echo ""
else
  echo "========================================="
  echo "  Setup 실패 — 위 에러를 확인하세요"
  echo "========================================="
  exit 1
fi
