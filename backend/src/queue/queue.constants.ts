export const QUEUE_NAMES = {
  TRANSCRIPTION_BATCH: 'transcription-batch',
  SUMMARY_GENERATION: 'summary-generation',
  DOMAIN_EVENTS: 'domain-events',
} as const;

export const JOB_NAMES = {
  BATCH_TRANSCRIBE_MEETING: 'batch-transcribe-meeting',
  GENERATE_SUMMARY: 'generate-summary',
  PUBLISH_DOMAIN_EVENT: 'publish-domain-event',
} as const;
