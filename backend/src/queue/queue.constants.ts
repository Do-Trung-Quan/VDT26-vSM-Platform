export const QUEUE_NAMES = {
  TRANSCRIPTION_BATCH:   'transcription-batch',
  SUMMARY_GENERATION:    'summary-generation',
  DOMAIN_EVENTS:         'domain-events',
  MAIL_OTP:              'mail-otp',
  LIVE_SESSION_TIMEOUT:  'live-session-timeout',
} as const;

export const JOB_NAMES = {
  BATCH_TRANSCRIBE_MEETING: 'batch-transcribe-meeting',
  GENERATE_SUMMARY:         'generate-summary',
  PUBLISH_DOMAIN_EVENT:     'publish-domain-event',
  SEND_OTP_EMAIL:           'send-otp-email',
  SEND_PASSWORD_EMAIL:      'send-password-email',
  SESSION_TIMEOUT:          'session_timeout',
} as const;
