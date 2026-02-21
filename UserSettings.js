/**
 * User-specific settings management.
 * Handles personalized prompts and email commands.
 */
const UserSettings = {

  /**
   * Retrieves user-specific prompt from Script Properties.
   * @param {string} userEmail - The email address of the user.
   * @returns {string} - The personal prompt or empty string if not set.
   */
  getUserPrompt(userEmail) {
    if (!userEmail) return "";

    const propertyKey = `PROMPT_${userEmail}`;
    const prompt = PropertiesService.getScriptProperties().getProperty(propertyKey);

    return prompt || "";
  },

  /**
   * Sets user-specific prompt in Script Properties.
   * @param {string} userEmail - The email address of the user.
   * @param {string} promptText - The prompt text to save.
   */
  setUserPrompt(userEmail, promptText) {
    if (!userEmail) {
      throw new Error("User email is required to set prompt");
    }

    const propertyKey = `PROMPT_${userEmail}`;

    if (!promptText || promptText.trim() === "") {
      // Clear the prompt if empty
      PropertiesService.getScriptProperties().deleteProperty(propertyKey);
      console.log(`Cleared prompt for ${userEmail}`);
    } else {
      PropertiesService.getScriptProperties().setProperty(propertyKey, promptText.trim());
      console.log(`Set prompt for ${userEmail}: ${promptText.substring(0, 50)}...`);
    }
  },

  /**
   * Handles email commands like #SET_USER_PROMPT and #GET_PROMPT
   * @param {GoogleAppsScript.Gmail.GmailMessage} message - The Gmail message object.
   * @param {string} userEmail - The sender's email address.
   * @returns {boolean} - True if a command was processed, false otherwise.
   */
  handleCommand(message, userEmail) {
    const body = message.getPlainBody().trim();
    const subject = message.getSubject();

    // Command 1: #SET_USER_PROMPT
    if (body.includes('#SET_USER_PROMPT')) {
      return this._handleSetPrompt(message, userEmail, body);
    }

    // Command 2: #GET_PROMPT
    if (body.includes('#GET_PROMPT')) {
      return this._handleGetPrompt(message, userEmail);
    }

    return false;
  },

  /**
   * Internal: Handles the #SET_USER_PROMPT command
   * @private
   */
  _handleSetPrompt(message, userEmail, body) {
    try {
      // Extract text after #SET_USER_PROMPT
      const marker = '#SET_USER_PROMPT';
      const markerIndex = body.indexOf(marker);

      if (markerIndex === -1) {
        throw new Error("Command marker not found");
      }

      const promptText = body.substring(markerIndex + marker.length).trim();

      // Save or clear the prompt
      this.setUserPrompt(userEmail, promptText);

      // Send full configuration report with updated prompt
      this._sendConfigurationReport(userEmail, promptText ? '✅ Personal Rules Updated' : '✅ Personal Rules Cleared');

      Logger.log(userEmail, `Command: SET_USER_PROMPT ${promptText ? 'updated' : 'cleared'}`, 0);
      return true;

    } catch (error) {
      console.error(`Error processing SET_USER_PROMPT: ${error.message}`);
      GmailApp.sendEmail(
        userEmail,
        '❌ Error Setting Personal Rules',
        `An error occurred while processing your command:\n\n${error.message}\n\nPlease try again or contact support.`
      );
      return true;
    }
  },

  /**
   * Internal: Handles the #GET_PROMPT command
   * @private
   */
  _handleGetPrompt(message, userEmail) {
    try {
      this._sendConfigurationReport(userEmail, '📋 Configuration Report');
      Logger.log(userEmail, 'Command: GET_PROMPT', 0);
      return true;

    } catch (error) {
      console.error(`Error processing GET_PROMPT: ${error.message}`);
      GmailApp.sendEmail(
        userEmail,
        '❌ Error Retrieving Configuration',
        `An error occurred while generating your configuration report:\n\n${error.message}\n\nPlease try again or contact support.`
      );
      return true;
    }
  },

  /**
   * Internal: Sends a full configuration report to the user
   * @private
   */
  _sendConfigurationReport(userEmail, subjectPrefix) {
    // Retrieve all configuration
    const personalPrompt = this.getUserPrompt(userEmail);
    const globalKnowledge = GmailManager.getKnowledgeBase();
    const agentName = CONFIG.AGENT_NAME;
    const waitingInterval = CONFIG.WAITING_INTERVAL;

    // Build configuration report
    const reportSubject = `${subjectPrefix} for ${userEmail}`;
    const reportBody = `
===========================================
${agentName.toUpperCase()} - CONFIGURATION REPORT
===========================================

📧 YOUR EMAIL: ${userEmail}

-------------------------------------------
🔹 PERSONAL RULES (Level 1 - Highest Priority):
-------------------------------------------
${personalPrompt || "❌ No personal rules set. Using Global Rules only."}

${personalPrompt ? "\n✅ These rules override Global Rules when there's a conflict." : ""}

-------------------------------------------
🌐 GLOBAL RULES (Level 2 - Standard Priority):
-------------------------------------------
${globalKnowledge.substring(0, 1000)}${globalKnowledge.length > 1000 ? '\n\n... [truncated, see Knowledge Base document for full content]' : ''}

-------------------------------------------
⚙️ SYSTEM SETTINGS:
-------------------------------------------
• Agent Name: ${agentName}
• Processing Interval: Every ${waitingInterval} minute(s)
• RAG Context Limit: ${CONFIG.RAG_CONTEXT_LIMIT} threads

-------------------------------------------
📖 FRAMEWORK LOGIC (Level 3 - Base):
-------------------------------------------
• Automatic language detection and mirroring
• Confidence scoring for draft quality
• Historical context from previous email threads
• Professional formatting and tone adaptation

===========================================

💡 TO UPDATE YOUR PERSONAL RULES:
Send an email with:
#SET_USER_PROMPT
[Your instructions here]

💡 TO CLEAR YOUR PERSONAL RULES:
Send an email with:
#SET_USER_PROMPT
(with no text after the command)

===========================================
    `.trim();

    GmailApp.sendEmail(
      userEmail,
      reportSubject,
      reportBody
    );
  }
};