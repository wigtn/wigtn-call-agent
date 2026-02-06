#!/usr/bin/env node
/**
 * WIGVO Call Pipeline E2E 테스트 스크립트
 *
 * 테스트 시나리오:
 *   1. 하드코딩된 CollectedData로 Dynamic Prompt 생성
 *   2. ElevenLabs Outbound Call 시작
 *   3. Polling으로 결과 대기
 *
 * 사용법:
 *   node scripts/test-call-pipeline.mjs
 *
 * 환경변수 (.env 또는 .env.local):
 *   ELEVENLABS_API_KEY
 *   ELEVENLABS_AGENT_ID
 *   ELEVENLABS_PHONE_NUMBER_ID
 *   TEST_PHONE_NUMBER (E.164 형식: +821012345678)
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// ============================================================================
// .env 로드
// ============================================================================

function loadEnvFile() {
  const envFiles = ['.env.local', '.env']

  for (const file of envFiles) {
    try {
      const envPath = resolve(process.cwd(), file)
      const envContent = readFileSync(envPath, 'utf-8')
      console.log(`✅ ${file} 로드 완료`)

      envContent.split('\n').forEach(line => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) return

        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=').trim()
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          process.env[key.trim()] = value
        }
      })
      break
    } catch (e) {
      continue
    }
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
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1'

// ============================================================================
// 테스트용 CollectedData (채팅에서 수집된 데이터 시뮬레이션)
// ============================================================================

const testCollectedData = {
  target_name: '테스트 미용실',
  target_phone: TEST_PHONE_NUMBER,
  scenario_type: 'RESERVATION',
  primary_datetime: '내일 오후 3시',
  service: '남자 커트',
  fallback_datetimes: ['내일 오후 4시', '모레 오후 3시'],
  fallback_action: 'ASK_AVAILABLE',
  customer_name: '홍길동',
  party_size: 1,
  special_request: null
}

// ============================================================================
// Dynamic Prompt Generator (lib/prompt-generator.ts 로직)
// ============================================================================

function generateDynamicPrompt(data) {
  const scenarioType = data.scenario_type || 'RESERVATION'

  if (scenarioType === 'RESERVATION') {
    return generateReservationPrompt(data)
  } else if (scenarioType === 'INQUIRY') {
    return generateInquiryPrompt(data)
  } else {
    return generateASRequestPrompt(data)
  }
}

function generateReservationPrompt(data) {
  const targetName = data.target_name || '업체'
  const datetime = data.primary_datetime || '희망 시간'
  const service = data.service || '예약'
  const customerName = data.customer_name || '고객'
  const partySize = data.party_size || 1

  // Fallback 전략 생성
  let fallbackInstruction = ''
  if (data.fallback_action === 'ASK_AVAILABLE') {
    fallbackInstruction = '희망 시간이 불가능하면 "그럼 언제 가능한지 알려주시겠어요?"라고 물어보세요.'
  } else if (data.fallback_action === 'NEXT_DAY') {
    const fallbacks = data.fallback_datetimes?.join(', ') || '다음 날'
    fallbackInstruction = `희망 시간이 불가능하면 "${fallbacks}"은 어떤지 물어보세요.`
  } else if (data.fallback_action === 'CANCEL') {
    fallbackInstruction = '희망 시간이 불가능하면 정중히 끊으세요.'
  }

  const specialRequest = data.special_request
    ? `\n\n## 특별 요청\n"${data.special_request}"도 전달해주세요.`
    : ''

  const systemPrompt = `
당신은 고객을 대신해 ${targetName}에 전화를 거는 AI 비서입니다.

## 목표
${datetime}에 ${service} 예약을 요청하세요.

## 예약 정보
- 장소: ${targetName}
- 희망 일시: ${datetime}
- 서비스: ${service}
- 예약자: ${customerName}
- 인원: ${partySize}명

## 대화 흐름
1. 인사: "안녕하세요, 예약 문의 드립니다."
2. 요청: "${datetime}에 ${service} 예약 가능할까요?"
3. 가능 → 예약 확정: "네, 그럼 ${customerName} 이름으로 예약 부탁드립니다."
4. 불가 → ${fallbackInstruction || '다른 시간을 물어보세요.'}
5. 마무리: "감사합니다. 좋은 하루 되세요."
${specialRequest}

## 규칙
- 자연스러운 한국어 해요체 사용
- 예약이 확정되면 일시와 이름을 다시 확인
- 상대방이 못 알아들으면 천천히 다시 말하기
`.trim()

  return {
    systemPrompt,
    dynamicVariables: {
      target_name: targetName,
      datetime,
      service,
      customer_name: customerName,
      party_size: String(partySize)
    }
  }
}

function generateInquiryPrompt(data) {
  const targetName = data.target_name || '업체'
  const service = data.service || '서비스'
  const specialRequest = data.special_request || '문의 사항'

  const systemPrompt = `
당신은 고객을 대신해 ${targetName}에 전화를 거는 AI 비서입니다.

## 목표
${service}에 대해 문의하세요.

## 문의 내용
${specialRequest}

## 대화 흐름
1. 인사: "안녕하세요, 문의 드릴 게 있어서 전화드렸습니다."
2. 질문: "${specialRequest}"
3. 답변 경청 후 필요시 추가 질문
4. 마무리: "알려주셔서 감사합니다. 좋은 하루 되세요."

## 규칙
- 자연스러운 한국어 해요체 사용
- 중요한 정보는 다시 확인
- 상대방이 못 알아들으면 천천히 다시 말하기
`.trim()

  return {
    systemPrompt,
    dynamicVariables: {
      target_name: targetName,
      service,
      question: specialRequest
    }
  }
}

function generateASRequestPrompt(data) {
  const targetName = data.target_name || '업체'
  const datetime = data.primary_datetime || '가능한 빠른 시간'
  const service = data.service || 'AS'
  const customerName = data.customer_name || '고객'
  const specialRequest = data.special_request || '수리 요청'

  const systemPrompt = `
당신은 고객을 대신해 ${targetName}에 전화를 거는 AI 비서입니다.

## 목표
${service} AS/수리 접수를 요청하세요.

## 접수 정보
- 업체: ${targetName}
- 희망 방문일: ${datetime}
- 서비스: ${service}
- 고객명: ${customerName}
- 증상: ${specialRequest}

## 대화 흐름
1. 인사: "안녕하세요, AS 접수 문의 드립니다."
2. 설명: "${service}가 ${specialRequest} 상태인데 수리 가능할까요?"
3. 가능 → 일정 조율: "${datetime}에 방문 가능하실까요?"
4. 마무리: "감사합니다. ${customerName} 이름으로 접수 부탁드립니다."

## 규칙
- 자연스러운 한국어 해요체 사용
- 방문 일정과 예상 비용 확인
- 상대방이 못 알아들으면 천천히 다시 말하기
`.trim()

  return {
    systemPrompt,
    dynamicVariables: {
      target_name: targetName,
      datetime,
      service,
      customer_name: customerName,
      issue: specialRequest
    }
  }
}

// ============================================================================
// ElevenLabs API Functions
// ============================================================================

async function startOutboundCall(phoneNumber, dynamicVariables) {
  console.log('\n📞 ElevenLabs Outbound Call 시작...')
  console.log(`   대상 번호: ${phoneNumber}`)
  console.log(`   Agent ID: ${ELEVENLABS_AGENT_ID}`)
  console.log(`   Phone Number ID: ${ELEVENLABS_PHONE_NUMBER_ID}`)

  const requestBody = {
    agent_id: ELEVENLABS_AGENT_ID,
    agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
    to_number: phoneNumber,
    conversation_initiation_client_data: {
      dynamic_variables: dynamicVariables
    }
  }

  console.log('\n   Dynamic Variables:', JSON.stringify(dynamicVariables, null, 2))

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/convai/twilio/outbound-call`,
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
  console.log('   Conversation ID:', data.conversation_id)

  return data
}

async function getConversation(conversationId) {
  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/convai/conversations/${conversationId}`,
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
// 전화번호 포맷팅
// ============================================================================

function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/[^0-9+]/g, '')
  if (cleaned.startsWith('+')) {
    return cleaned
  }
  if (cleaned.startsWith('010')) {
    return `+82${cleaned.slice(1)}`
  }
  if (cleaned.startsWith('02')) {
    return `+82${cleaned.slice(1)}`
  }
  return `+82${cleaned}`
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('='.repeat(70))
  console.log('  WIGVO Call Pipeline E2E 테스트')
  console.log('='.repeat(70))

  // 환경변수 확인
  const missingVars = []
  if (!ELEVENLABS_API_KEY) missingVars.push('ELEVENLABS_API_KEY')
  if (!ELEVENLABS_AGENT_ID) missingVars.push('ELEVENLABS_AGENT_ID')
  if (!ELEVENLABS_PHONE_NUMBER_ID) missingVars.push('ELEVENLABS_PHONE_NUMBER_ID')
  if (!TEST_PHONE_NUMBER) missingVars.push('TEST_PHONE_NUMBER')

  if (missingVars.length > 0) {
    console.error('\n❌ 필수 환경변수가 없습니다:')
    missingVars.forEach(v => console.error(`   - ${v}`))
    console.error('\n.env.local 파일을 확인하세요.')
    process.exit(1)
  }

  console.log('\n✅ 환경변수 확인 완료')
  console.log(`   API Key: ${ELEVENLABS_API_KEY.slice(0, 8)}...`)
  console.log(`   Agent ID: ${ELEVENLABS_AGENT_ID}`)
  console.log(`   Phone Number ID: ${ELEVENLABS_PHONE_NUMBER_ID}`)
  console.log(`   Test Number: ${TEST_PHONE_NUMBER}`)

  // Step 1: CollectedData 표시
  console.log('\n' + '─'.repeat(70))
  console.log('Step 1: 테스트용 CollectedData')
  console.log('─'.repeat(70))
  console.log(JSON.stringify(testCollectedData, null, 2))

  // Step 2: Dynamic Prompt 생성
  console.log('\n' + '─'.repeat(70))
  console.log('Step 2: Dynamic Prompt 생성')
  console.log('─'.repeat(70))

  const { systemPrompt, dynamicVariables } = generateDynamicPrompt(testCollectedData)

  console.log('\n📋 System Prompt (처음 500자):')
  console.log('   ' + systemPrompt.substring(0, 500).replace(/\n/g, '\n   ') + '...')

  console.log('\n📊 Dynamic Variables:')
  console.log(JSON.stringify(dynamicVariables, null, 2))

  // Step 3: ElevenLabs Outbound Call
  console.log('\n' + '─'.repeat(70))
  console.log('Step 3: ElevenLabs Outbound Call 시작')
  console.log('─'.repeat(70))

  const phoneNumber = formatPhoneNumber(testCollectedData.target_phone)

  try {
    const result = await startOutboundCall(phoneNumber, dynamicVariables)

    if (result.error) {
      console.error('\n❌ 전화 발신 실패:', result.error)
      process.exit(1)
    }

    // Step 4: 결과 대기
    console.log('\n' + '─'.repeat(70))
    console.log('Step 4: 통화 결과 대기 (Polling)')
    console.log('─'.repeat(70))

    if (result.conversation_id) {
      const conversation = await waitForCompletion(result.conversation_id)

      if (conversation) {
        console.log('\n' + '─'.repeat(70))
        console.log('최종 결과')
        console.log('─'.repeat(70))
        console.log(`   상태: ${conversation.status}`)
        console.log(`   요약: ${conversation.analysis?.transcript_summary || '없음'}`)
      }
    }

    console.log('\n' + '='.repeat(70))
    console.log('  ✅ 파이프라인 테스트 완료!')
    console.log('='.repeat(70))

  } catch (error) {
    console.error('\n❌ 오류 발생:', error)
    process.exit(1)
  }
}

// 실행
main()
