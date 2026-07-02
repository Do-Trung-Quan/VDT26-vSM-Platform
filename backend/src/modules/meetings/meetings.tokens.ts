export const MEETING_REPOSITORY           = Symbol('MEETING_REPOSITORY');
export const TRANSCRIPT_BLOCK_REPOSITORY  = Symbol('TRANSCRIPT_BLOCK_REPOSITORY');
export const MEETING_SUMMARY_REPOSITORY   = Symbol('MEETING_SUMMARY_REPOSITORY');

// Phase 6 — Live STT
export const SPEECH_TO_TEXT_PORT          = Symbol('SPEECH_TO_TEXT_PORT');
export const SPEAKER_EMBEDDING_PORT       = Symbol('SPEAKER_EMBEDDING_PORT');
export const VAD_PORT                     = Symbol('VAD_PORT');
export const LOCAL_AUDIO_STORAGE_PORT     = Symbol('LOCAL_AUDIO_STORAGE_PORT');
export const TRANSCRIPT_BUFFER_PORT       = Symbol('TRANSCRIPT_BUFFER_PORT');
export const LIVE_SESSION_REGISTRY_PORT   = Symbol('LIVE_SESSION_REGISTRY_PORT');

// Phase 7
export const PDF_EXPORTER_PORT            = Symbol('PDF_EXPORTER_PORT');
export const LLM_PORT                     = Symbol('LLM_PORT');
