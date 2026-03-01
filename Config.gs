/**
 * Global configuration and security settings.
 * All comments in English.
 */
const CONFIG = {
  // 1. DYNAMIC API SETTINGS
  GEMINI: {
    // Using the stable model name from your recent diagnostics
    MODEL: 'gemini-2.5-flash', 
    ENDPOINT: 'https://generativelanguage.googleapis.com/v1/models/'
  },

  /**
   * Universal API Key retrieval integrated into CONFIG.
   * Resolves: "CONFIG.getApiKey is not a function"
   */
  getApiKey() {
    const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!key) throw new Error('GEMINI_API_KEY not found in Script Properties');
    return key;
  },

  // 2. DYNAMIC WHITELIST
  get WHITELIST_EMAILS() {
    const rawEmails = PropertiesService.getScriptProperties().getProperty('WHITELIST_EMAILS');
    if (!rawEmails) return [];
    return rawEmails.split(',').map(email => email.trim().toLowerCase());
  },

  // 3. DYNAMIC AGENT SETTINGS
  get AGENT_NAME() {
    return PropertiesService.getScriptProperties().getProperty('AGENT_NAME') || 'AI Assistant';
  },

  // 4. LABELS & LIMITS
  LABELS: {
    FILTERED: 'Filtered/External',
    PROCESSED: 'AI_Processed',
    DONE_PREFIX: 'AI-Processed/' 
  },
  
  RAG_CONTEXT_LIMIT: 5,

  // 5. TRIGGER & INTERVALS
  get WAITING_INTERVAL() {
    const interval = PropertiesService.getScriptProperties().getProperty('WAITING_INTERVAL');
    return interval ? parseInt(interval) : 10;
  },

  // 6. HELPER METHODS
  getIdFromInput(input) {
    if (!input) return null;
    const match = input.match(/\/d\/(.*?)(\/|$|#)/);
    return match ? match[1] : input;
  },

  getKnowledgeBaseId() {
    return this.getIdFromInput(PropertiesService.getScriptProperties().getProperty('KNOWLEDGE_BASE_URL'));
  },

  getLogSheetId() {
    return this.getIdFromInput(PropertiesService.getScriptProperties().getProperty('LOG_SHEET_URL'));
  }
};

/**
 * Legacy wrapper for standalone access if needed.
 */
function getApiKey() {
  return CONFIG.getApiKey();
}