#!/bin/bash
# =============================================================================
# WIGVO 프로젝트 초기화 스크립트
# =============================================================================
# 실행: chmod +x scripts/init-project.sh && ./scripts/init-project.sh
# =============================================================================

set -e  # 에러 시 중단

echo "🚀 WIGVO 프로젝트 초기화 시작..."
echo ""

# -----------------------------------------------------------------------------
# 1. Next.js 프로젝트 생성 (현재 디렉토리에)
# -----------------------------------------------------------------------------
echo "📦 1/6 Next.js 16 프로젝트 생성..."

# 임시 디렉토리에 생성 후 현재로 이동 (기존 파일 보존)
npx create-next-app@latest temp-next --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack --yes

# 필요한 파일들만 현재 디렉토리로 이동
mv temp-next/app ./
mv temp-next/public ./
mv temp-next/next.config.ts ./
mv temp-next/tailwind.config.ts ./
mv temp-next/postcss.config.mjs ./
mv temp-next/tsconfig.json ./
mv temp-next/package.json ./
mv temp-next/package-lock.json ./ 2>/dev/null || true
mv temp-next/next-env.d.ts ./
mv temp-next/.eslintrc.json ./ 2>/dev/null || true
mv temp-next/eslint.config.mjs ./ 2>/dev/null || true

# 임시 디렉토리 삭제
rm -rf temp-next

echo "✅ Next.js 프로젝트 생성 완료"
echo ""

# -----------------------------------------------------------------------------
# 2. 추가 의존성 설치
# -----------------------------------------------------------------------------
echo "📦 2/6 추가 의존성 설치..."

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# OpenAI
npm install openai

# UI 라이브러리
npm install class-variance-authority clsx tailwind-merge lucide-react

# 폼/유효성
npm install zod

echo "✅ 의존성 설치 완료"
echo ""

# -----------------------------------------------------------------------------
# 3. shadcn/ui 초기화 + 기본 컴포넌트
# -----------------------------------------------------------------------------
echo "🎨 3/6 shadcn/ui 설정..."

# shadcn 초기화 (기본값 사용)
npx shadcn@latest init -y -d

# 필수 컴포넌트 설치
npx shadcn@latest add button input card avatar scroll-area -y

echo "✅ shadcn/ui 설정 완료"
echo ""

# -----------------------------------------------------------------------------
# 4. 디렉토리 구조 생성
# -----------------------------------------------------------------------------
echo "📁 4/6 디렉토리 구조 생성..."

mkdir -p app/api/conversations
mkdir -p app/api/chat
mkdir -p app/api/calls
mkdir -p components/chat
mkdir -p hooks
mkdir -p lib/supabase
mkdir -p types

echo "✅ 디렉토리 구조 생성 완료"
echo ""

# -----------------------------------------------------------------------------
# 5. Supabase 클라이언트 보일러플레이트
# -----------------------------------------------------------------------------
echo "🔧 5/6 Supabase 클라이언트 설정..."

# lib/supabase/client.ts
cat > lib/supabase/client.ts << 'EOF'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
EOF

# lib/supabase/server.ts
cat > lib/supabase/server.ts << 'EOF'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서 호출 시 무시
          }
        },
      },
    }
  )
}
EOF

# lib/supabase/middleware.ts
cat > lib/supabase/middleware.ts << 'EOF'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  return supabaseResponse
}
EOF

# middleware.ts (루트)
cat > middleware.ts << 'EOF'
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
EOF

echo "✅ Supabase 클라이언트 설정 완료"
echo ""

# -----------------------------------------------------------------------------
# 6. 타입 정의 파일
# -----------------------------------------------------------------------------
echo "📝 6/6 타입 정의 파일 생성..."

cat > types/database.ts << 'EOF'
// Supabase 테이블 타입 정의

export type ConversationStatus =
  | 'COLLECTING'
  | 'READY'
  | 'CALLING'
  | 'COMPLETED'
  | 'CANCELLED'

export type CallStatus =
  | 'PENDING'
  | 'CALLING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'

export interface CollectedData {
  target_name?: string
  target_phone?: string
  scenario_type?: 'RESERVATION' | 'INQUIRY' | 'AS_REQUEST'
  service?: string
  primary_datetime?: string
  fallback_datetimes?: string[]
  fallback_action?: 'ASK_AVAILABLE' | 'NEXT_DAY' | 'CANCEL'
  customer_name?: string
  party_size?: number
  special_request?: string
}

export interface Conversation {
  id: string
  user_id: string
  status: ConversationStatus
  collected_data: CollectedData
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface Call {
  id: string
  conversation_id: string
  user_id: string
  elevenlabs_conversation_id?: string
  target_phone: string
  target_name?: string
  status: CallStatus
  result: Record<string, unknown>
  created_at: string
  updated_at: string
}
EOF

echo "✅ 타입 정의 파일 생성 완료"
echo ""

# -----------------------------------------------------------------------------
# 완료
# -----------------------------------------------------------------------------
echo "============================================="
echo "🎉 WIGVO 프로젝트 초기화 완료!"
echo "============================================="
echo ""
echo "다음 단계:"
echo "  1. Supabase 테이블 생성: scripts/supabase-tables.sql 실행"
echo "  2. 개발 서버 시작: npm run dev"
echo "  3. Cursor에서 기능 구현 시작"
echo ""
echo "파일 구조:"
echo "  app/           - Next.js App Router"
echo "  components/    - React 컴포넌트"
echo "  hooks/         - Custom Hooks"
echo "  lib/supabase/  - Supabase 클라이언트"
echo "  types/         - TypeScript 타입"
echo ""
