/**
 * ElevenLabs + Twilio Outbound Call 테스트 스크립트
 *
 * 사용법:
 *   1. .env.local 파일 생성 (.env.example 복사)
 *   2. 필요한 환경변수 입력
 *   3. npx ts-node scripts/test-elevenlabs.ts
 *
 * 또는 Node.js로 직접 실행:
 *   node scripts/test-elevenlabs.js
 */

// ============================================================================
// 환경변수 (실제 사용 시 .env.local에서 로드)
// ============================================================================

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ''
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID || ''
const ELEVENLABS_PHONE_NUMBER_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID || ''

// 테스트할 전화번호 (E.164 형식: +821012345678)
const TEST_PHONE_NUMBER = process.env.TEST_PHONE_NUMBER || ''

// ============================================================================
// ElevenLabs Outbound Call API
// ============================================================================

interface OutboundCallResponse {
  call_id?: string
  conversation_id?: string
  status?: string
  error?: string
}

async function makeOutboundCall(
  phoneNumber: string,
  dynamicVariables: Record<string, string>
): Promise<OutboundCallResponse> {

  console.log('\n📞 ElevenLabs Outbound Call 시작...')
  console.log(`   대상 번호: ${phoneNumber}`)
  console.log(`   Agent ID: ${ELEVENLABS_AGENT_ID}`)
  console.log(`   Phone Number ID: ${ELEVENLABS_PHONE_NUMBER_ID}`)
  console.log(`   Dynamic Variables:`, dynamicVariables)

  const response = await fetch(
    'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_id: ELEVENLABS_AGENT_ID,
        agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
        to_number: phoneNumber,
        conversation_initiation_client_data: {
          dynamic_variables: dynamicVariables
        }
      })
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('\n❌ API 에러:', response.status)
    console.error('   응답:', JSON.stringify(data, null, 2))
    return { error: data.detail || 'Unknown error' }
  }

  console.log('\n✅ 전화 발신 성공!')
  console.log('   응답:', JSON.stringify(data, null, 2))

  return data
}

// ============================================================================
// 대화 상태 조회
// ============================================================================

async function getConversation(conversationId: string) {
  console.log(`\n🔍 대화 상태 조회: ${conversationId}`)

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
    {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    }
  )

  if (!response.ok) {
    console.error('   조회 실패:', response.status)
    return null
  }

  const data = await response.json()
  console.log('   상태:', data.status)
  console.log('   데이터:', JSON.stringify(data, null, 2))

  return data
}

// ============================================================================
// 폴링으로 결과 대기
// ============================================================================

async function waitForCompletion(conversationId: string, maxWaitSec = 180) {
  console.log(`\n⏳ 통화 완료 대기 중... (최대 ${maxWaitSec}초)`)

  const startTime = Date.now()
  const pollIntervalMs = 3000

  while ((Date.now() - startTime) < maxWaitSec * 1000) {
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))

    const conversation = await getConversation(conversationId)

    if (!conversation) continue

    if (conversation.status === 'done' || conversation.status === 'failed') {
      console.log('\n🏁 통화 종료!')
      console.log(`   상태: ${conversation.status}`)
      if (conversation.transcript) {
        console.log(`   대화 내용: ${conversation.transcript}`)
      }
      return conversation
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    console.log(`   ${elapsed}초 경과... (상태: ${conversation.status})`)
  }

  console.log('\n⚠️ 타임아웃 - 통화가 완료되지 않았습니다.')
  return null
}

// ============================================================================
// 메인 실행
// ============================================================================

async function main() {
  console.log('=' .repeat(60))
  console.log('  ElevenLabs + Twilio Outbound Call 테스트')
  console.log('=' .repeat(60))

  // 환경변수 확인
  const missingVars: string[] = []
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
    const conversationId = result.conversation_id || result.call_id
    if (conversationId) {
      await waitForCompletion(conversationId)
    }

    console.log('\n' + '=' .repeat(60))
    console.log('  테스트 완료!')
    console.log('=' .repeat(60))

  } catch (error) {
    console.error('\n❌ 오류 발생:', error)
    process.exit(1)
  }
}

// 실행
main()
