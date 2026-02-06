#!/usr/bin/env node
/**
 * ElevenLabs + Twilio Outbound Call 테스트 스크립트
 *
 * 사용법:
 *   1. .env.local 파일 생성 (.env.example 복사 후 값 입력)
 *   2. node scripts/test-elevenlabs.mjs
 *
 * 환경변수:
 *   ELEVENLABS_API_KEY        - ElevenLabs API 키
 *   ELEVENLABS_AGENT_ID       - 에이전트 ID
 *   ELEVENLABS_PHONE_NUMBER_ID - Twilio 전화번호 ID
 *   TEST_PHONE_NUMBER         - 테스트할 전화번호 (E.164: +821012345678)
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// ============================================================================
// .env.local 로드
// ============================================================================

function loadEnvFile() {
  // .env.local 먼저 시도, 없으면 .env 시도
  const envFiles = ['.env.local', '.env']
  let envPath = null
  let envContent = null

  for (const file of envFiles) {
    try {
      envPath = resolve(process.cwd(), file)
      envContent = readFileSync(envPath, 'utf-8')
      console.log(`✅ ${file} 로드 완료`)
      break
    } catch (e) {
      continue
    }
  }

  if (!envContent) {
    console.log('⚠️  .env.local 또는 .env 파일이 없습니다.')
    return
  }

  try {

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return

      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        let value = valueParts.join('=').trim()
        // 따옴표 제거
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        process.env[key.trim()] = value
      }
    })
  } catch (e) {
    console.log('⚠️  env 파일 파싱 중 오류:', e.message)
  }
}

loadEnvFile()

// ============================================================================
// 환경변수
// ============================================================================

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ''
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID || ''
const ELEVENLABS_PHONE_NUMBER_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID || ''
const TEST_PHONE_NUMBER = process.env.TEST_PHONE_NUMBER || ''

// ============================================================================
// ElevenLabs Outbound Call API
// ============================================================================

async function makeOutboundCall(phoneNumber, dynamicVariables) {

  console.log('\n📞 ElevenLabs Outbound Call 시작...')
  console.log(`   대상 번호: ${phoneNumber}`)
  console.log(`   Agent ID: ${ELEVENLABS_AGENT_ID}`)
  console.log(`   Phone Number ID: ${ELEVENLABS_PHONE_NUMBER_ID}`)
  console.log(`   Dynamic Variables:`, dynamicVariables)

  const requestBody = {
    agent_id: ELEVENLABS_AGENT_ID,
    agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
    to_number: phoneNumber,
    conversation_initiation_client_data: {
      dynamic_variables: dynamicVariables
    }
  }

  console.log('\n   Request Body:', JSON.stringify(requestBody, null, 2))

  const response = await fetch(
    'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('\n❌ API 에러:', response.status)
    console.error('   응답:', JSON.stringify(data, null, 2))
    return { error: data.detail || JSON.stringify(data) }
  }

  console.log('\n✅ 전화 발신 성공!')
  console.log('   응답:', JSON.stringify(data, null, 2))

  return data
}

// ============================================================================
// 대화 상태 조회
// ============================================================================

async function getConversation(conversationId) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
    {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    }
  )

  if (!response.ok) {
    return null
  }

  return response.json()
}

// ============================================================================
// 폴링으로 결과 대기
// ============================================================================

async function waitForCompletion(conversationId, maxWaitSec = 180) {
  console.log(`\n⏳ 통화 완료 대기 중... (최대 ${maxWaitSec}초)`)
  console.log('   Ctrl+C로 중단 가능 (통화는 계속됩니다)')

  const startTime = Date.now()
  const pollIntervalMs = 5000

  while ((Date.now() - startTime) < maxWaitSec * 1000) {
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))

    const conversation = await getConversation(conversationId)

    if (!conversation) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      console.log(`   ${elapsed}초 경과... (조회 실패, 재시도)`)
      continue
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    console.log(`   ${elapsed}초 경과... (상태: ${conversation.status})`)

    if (conversation.status === 'done' || conversation.status === 'failed') {
      console.log('\n🏁 통화 종료!')
      console.log(`   상태: ${conversation.status}`)

      if (conversation.analysis?.transcript_summary) {
        console.log(`\n📝 대화 요약:`)
        console.log(`   ${conversation.analysis.transcript_summary}`)
      }

      return conversation
    }
  }

  console.log('\n⚠️ 타임아웃 - 폴링 종료 (통화가 아직 진행 중일 수 있음)')
  return null
}

// ============================================================================
// 메인 실행
// ============================================================================

async function main() {
  console.log('='.repeat(60))
  console.log('  ElevenLabs + Twilio Outbound Call 테스트')
  console.log('='.repeat(60))

  // 환경변수 확인
  const missingVars = []
  if (!ELEVENLABS_API_KEY) missingVars.push('ELEVENLABS_API_KEY')
  if (!ELEVENLABS_AGENT_ID) missingVars.push('ELEVENLABS_AGENT_ID')
  if (!ELEVENLABS_PHONE_NUMBER_ID) missingVars.push('ELEVENLABS_PHONE_NUMBER_ID')
  if (!TEST_PHONE_NUMBER) missingVars.push('TEST_PHONE_NUMBER')

  if (missingVars.length > 0) {
    console.error('\n❌ 필수 환경변수가 없습니다:')
    missingVars.forEach(v => console.error(`   - ${v}`))
    console.error('\n.env.local 파일을 생성하고 값을 입력하세요:')
    console.error('   cp .env.example .env.local')
    console.error('   # 그 다음 .env.local 편집하여 값 입력')
    console.error('   # TEST_PHONE_NUMBER=+821012345678 추가')
    process.exit(1)
  }

  console.log('\n✅ 환경변수 확인 완료')
  console.log(`   API Key: ${ELEVENLABS_API_KEY.slice(0, 8)}...`)
  console.log(`   Agent ID: ${ELEVENLABS_AGENT_ID}`)
  console.log(`   Phone Number ID: ${ELEVENLABS_PHONE_NUMBER_ID}`)
  console.log(`   Test Number: ${TEST_PHONE_NUMBER}`)

  // 테스트용 Dynamic Variables
  const dynamicVariables = {
    target_name: '테스트 미용실',
    date: '내일',
    time: '오후 3시',
    service: '커트',
    customer_name: '홍길동'
  }

  try {
    // 1. 전화 발신
    const result = await makeOutboundCall(TEST_PHONE_NUMBER, dynamicVariables)

    if (result.error) {
      console.error('\n❌ 테스트 실패:', result.error)
      process.exit(1)
    }

    // 2. 대화 ID가 있으면 완료까지 대기
    const conversationId = result.conversation_id
    if (conversationId) {
      await waitForCompletion(conversationId)
    } else {
      console.log('\n⚠️ conversation_id가 응답에 없습니다.')
      console.log('   ElevenLabs 대시보드에서 통화 기록을 확인하세요.')
    }

    console.log('\n' + '='.repeat(60))
    console.log('  테스트 완료!')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n❌ 오류 발생:', error)
    process.exit(1)
  }
}

// 실행
main()
