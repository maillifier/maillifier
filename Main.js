/**
 * Main.gs - ENHANCED VERSION with Attachment Support
 * Processes emails, handles user commands, attachments, and sends AI-generated suggestions.
 */
function processEmails() {
  const threads = GmailApp.getInboxThreads();

  // Fetch Global Knowledge Base (from Google Doc)
  const globalKnowledge = GmailManager.getKnowledgeBase();

  threads.forEach(thread => {
    const messages = thread.getMessages();
    const lastMessage = messages[messages.length - 1];

    // Process only unread messages
    if (!lastMessage.isUnread()) return;

    const sender = lastMessage.getFrom();
    const cleanSender = sender.replace(/.*<(.+)>/, '$1').toLowerCase().trim();

    // 1. Security Check (Whitelist)
    if (!GmailManager.isWhitelisted(cleanSender)) {
      GmailManager.quarantineThread(thread);
      Logger.log(sender, 'Filtered/External', 0);
      lastMessage.markRead();
      return;
    }

    try {
      // 2. Command Processing
      // 2a. Admin commands (#CHECK_UPDATE, #ADD_EMAIL, #GET_ADMINS, etc.)
      const isAdminCommand = AdminCommands.handleCommand(lastMessage, cleanSender);
      if (isAdminCommand) {
        lastMessage.markRead();
        return;
      }

      // 2b. User commands (#SET_USER_PROMPT, #GET_PROMPT)
      const isCommand = UserSettings.handleCommand(lastMessage, cleanSender);
      if (isCommand) {
        lastMessage.markRead();
        return;
      }

      // 3. Data Preparation
      const subject = thread.getFirstMessageSubject() || "No Subject";
      const context = GmailManager.getHistoricalContext(subject);
      const emailBody = lastMessage.getPlainBody();

      // 3.1 NEW: Process attachments
      const attachments = AttachmentHandler.processIncomingAttachments(lastMessage);
      const hasAttachments = attachments && attachments.length > 0;
      
      if (hasAttachments) {
        console.log(`Found ${attachments.length} supported attachment(s)`);
      }

      // Retrieve display name and personal rules
      const ownerName = getUserDisplayName(cleanSender) || "User";
      const personalKnowledge = UserSettings.getUserPrompt(cleanSender) || "";
      const agentName = (CONFIG.AGENT_NAME || "AI Agent");

      // INHERITANCE LOGIC: Combine Personal + Global rules
      const combinedKnowledge = personalKnowledge
        ? `PERSONAL RULES (Priority):\n${personalKnowledge}\n\nGLOBAL RULES:\n${globalKnowledge}`
        : globalKnowledge;

      // 4. AI Generation WITH attachments
      const aiResponse = GeminiAPI.generateResponse(
        emailBody, 
        context, 
        combinedKnowledge, 
        ownerName,
        attachments  // NEW: Pass attachments to Gemini
      );

      // 5. Structure the Reply Email
      const headerTitle = agentName.toUpperCase();
      const userTitle = ownerName.toUpperCase();

      const emailTitle = `RE: ${subject} (${agentName} Advice)`;
      
      // Add attachment info to response
      const attachmentInfo = hasAttachments 
        ? `\n\n📎 Analyzed ${attachments.length} attachment(s):\n${attachments.map(a => `- ${a.name}`).join('\n')}\n`
        : '';
      
      const emailContent = `### ${headerTitle} ANALYSIS FOR ${userTitle} ###\n\n` +
                           `Confidence Level: ${aiResponse.confidence || "N/A"}\n` +
                           attachmentInfo +
                           `\n${aiResponse.text}\n\n` +
                           `=========================================\n` +
                           `ORIGINAL MESSAGE PROCESSED:\n` +
                           `${emailBody}`;

      // 5.1 NEW: Handle response attachments (if any)
      if (aiResponse.attachments && aiResponse.attachments.length > 0) {
        // Send email with attachments
        GmailApp.sendEmail(cleanSender, emailTitle, emailContent, {
          attachments: aiResponse.attachments
        });
        console.log(`Sent response with ${aiResponse.attachments.length} attachment(s)`);
      } else {
        // Regular email without attachments
        GmailApp.sendEmail(cleanSender, emailTitle, emailContent);
      }

      // 6. Finalization
      lastMessage.markRead();
      const labelName = CONFIG.LABELS.DONE_PREFIX + cleanSender;
      let doneLabel = GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
      thread.addLabel(doneLabel);
      thread.moveToArchive();

      const statusMsg = hasAttachments 
        ? `Processed with ${attachments.length} attachment(s) (${aiResponse.confidence})`
        : `Processed (${aiResponse.confidence})`;
      
      Logger.log(sender, statusMsg, aiResponse.usage ? aiResponse.usage.totalTokenCount : 0);

    } catch (error) {
      console.error("Processing Error: " + error.stack);
      Logger.log(sender, `Error: ${error.message}`, 0);
    }
  });
}

/**
 * Helper to convert email to a display name.
 */
function getUserDisplayName(email) {
  if (!email || typeof email !== 'string') return "User";
  try {
    const namePart = email.split('@')[0];
    return namePart.split(/[._-]/).map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  } catch (e) {
    return "User";
  }
}
