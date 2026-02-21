/**
 * Core Gmail operations: filtering, labeling, and context retrieval.
 */
const GmailManager = {

  /**
   * Validates if the sender's email is part of the authorized whitelist.
   * @param {string} senderEmail - The raw sender string from the email header.
   * @returns {boolean} - True if the sender is authorized.
   */
  isWhitelisted(senderEmail) {
    if (!senderEmail) return false;
    // Extract clean email address from formats like "Name <email@mail.com>"
    const cleanEmail = senderEmail.replace(/.*<(.+)>/, '$1').toLowerCase().trim();
    return CONFIG.WHITELIST_EMAILS.some(email => cleanEmail === email.toLowerCase().trim());
  },

  /**
   * Moves unauthorized or suspicious threads to an archive with a specific label.
   * @param {GoogleAppsScript.Gmail.GmailThread} thread - The thread to quarantine.
   */
  quarantineThread(thread) {
    let label = GmailApp.getUserLabelByName(CONFIG.LABELS.FILTERED);
    if (!label) label = GmailApp.createLabel(CONFIG.LABELS.FILTERED);
    thread.addLabel(label);
    thread.moveToArchive();
  },

  /**
   * Retrieves historical context from previous threads for RAG logic.
   * Filters out quarantined emails to maintain context sterility.
   * @param {string} query - The search query (usually the email subject).
   * @returns {string} - Combined string of historical email data.
   */
  getHistoricalContext(query) {
    const searchQuery = `${query} -label:${CONFIG.LABELS.FILTERED}`;
    const threads = GmailApp.search(searchQuery, 0, CONFIG.RAG_CONTEXT_LIMIT);
    
    return threads.map(thread => {
      const messages = thread.getMessages();
      const lastMsg = messages[messages.length - 1];
      return `Date: ${lastMsg.getDate()}\nFrom: ${lastMsg.getFrom()}\nBody: ${lastMsg.getPlainBody().substring(0, 500)}`;
    }).join('\n---\n');
  },

  /**
   * Reads business rules and instructions from the designated Google Doc.
   * Uses dynamic ID retrieval from Script Properties.
   * @returns {string} - The content of the Knowledge Base.
   */
  getKnowledgeBase() {
    const docId = CONFIG.getKnowledgeBaseId();
    
    if (!docId) {
      console.warn("KNOWLEDGE_BASE_URL property is missing or invalid in Script Properties.");
      return "No specific business rules provided.";
    }

    try {
      const doc = DocumentApp.openById(docId);
      return doc.getBody().getText();
    } catch (e) {
      console.error("Knowledge Base Access Error: " + e.message);
      return "Business rules currently unavailable due to access error.";
    }
  }
};