import 'server-only'

import Twilio from 'twilio'

import { createAdminClient } from './supabase/admin'
import { env } from './env'

const twilioClient = Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)

export async function sendSms(to: string, body: string, triggerEvent = 'manual'): Promise<void> {
  const admin = createAdminClient()

  try {
    const message = await twilioClient.messages.create({
      to,
      body,
      from: env.TWILIO_PHONE_NUMBER,
    })

    await admin.from('sms_logs').insert({
      recipient_phone: to,
      message_text: body,
      trigger_event: triggerEvent,
      status: 'sent',
      twilio_sid: message.sid,
    })
  } catch (error) {
    await admin.from('sms_logs').insert({
      recipient_phone: to,
      message_text: body,
      trigger_event: triggerEvent,
      status: 'failed',
      error_code: error instanceof Error ? error.message : 'unknown_error',
    })
    throw error
  }
}
