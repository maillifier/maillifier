/**
 * AdminCommands.gs - Administrative commands handler
 * Only users in ADMIN_EMAIL can execute these commands
 *
 * Commands:
 *   #ADD_USER email     - Add user to whitelist
 *   #REMOVE_USER email  - Remove user from whitelist
 *   #LIST_USERS         - Show all authorized users
 *   #SET_ADMIN email    - Transfer admin rights (irreversible)
 */
const AdminCommands = {

  /**
   * Check if user has admin privileges
   */
  isAdmin(userEmail) {
    if (!userEmail) return false;
    const adminEmails = this.getAdminEmails();
    const cleanEmail = userEmail.toLowerCase().trim();
    return adminEmails.some(email => email.toLowerCase().trim() === cleanEmail);
  },

  /**
   * Get list of admin emails from Script Properties
   */
  getAdminEmails() {
    const email = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
    if (!email || !email.trim()) return [];
    return [email.trim().toLowerCase()];
  },

  /**
   * Main command handler — called from Main.gs
   * @returns {boolean} true if a command was handled
   */
  handleCommand(message, userEmail) {
    const body = message.getPlainBody().trim();

    const adminCommands = ['#ADD_USER', '#REMOVE_USER', '#LIST_USERS', '#SET_ADMIN'];
    const containsAdminCommand = adminCommands.some(cmd => body.includes(cmd));

    if (!containsAdminCommand) return false;

    // Check admin privileges
    if (!this.isAdmin(userEmail)) {
      this._sendAccessDenied(userEmail);
      Logger.log(userEmail, 'Admin Command Denied', 0);
      return true;
    }

    if (body.includes('#LIST_USERS'))   return this._handleListUsers(userEmail);
    if (body.includes('#ADD_USER'))     return this._handleAddUser(userEmail, body);
    if (body.includes('#REMOVE_USER'))  return this._handleRemoveUser(userEmail, body);
    if (body.includes('#SET_ADMIN'))    return this._handleSetAdmin(userEmail, body);

    return false;
  },

  // ─────────────────────────────────────────────────────────────
  // Command handlers
  // ─────────────────────────────────────────────────────────────

  _handleListUsers(userEmail) {
    const whitelist = CONFIG.WHITELIST_EMAILS || [];
    const adminList = this.getAdminEmails();

    const body = [
      'MAILLIFIER - AUTHORIZED USERS',
      '===========================================',
      '',
      `ADMIN (${adminList.length}):`,
      adminList.length > 0
        ? adminList.map((e, i) => `  ${i + 1}. ${e}`).join('\n')
        : '  (none)',
      '',
      `USERS (${whitelist.length}):`,
      whitelist.length > 0
        ? whitelist.map((e, i) => `  ${i + 1}. ${e}`).join('\n')
        : '  (none)',
      '',
      '===========================================',
      '',
      'Commands:',
      '  #ADD_USER user@example.com',
      '  #REMOVE_USER user@example.com',
      '  #SET_ADMIN new_admin@example.com  (irreversible)',
    ].join('\n');

    GmailApp.sendEmail(userEmail, 'Maillifier - Authorized Users', body);
    Logger.log(userEmail, 'Admin Command: LIST_USERS', 0);
    return true;
  },

  _handleAddUser(userEmail, body) {
    try {
      const emailToAdd = this._extractEmail(body, '#ADD_USER');

      if (!emailToAdd) {
        GmailApp.sendEmail(userEmail, 'Invalid Command',
          'Please specify an email address.\n\nUsage: #ADD_USER user@example.com');
        return true;
      }

      if (!this._isValidEmail(emailToAdd)) {
        GmailApp.sendEmail(userEmail, 'Invalid Email',
          `"${emailToAdd}" is not a valid email address.`);
        return true;
      }

      const whitelist = CONFIG.WHITELIST_EMAILS || [];

      if (whitelist.some(e => e.toLowerCase() === emailToAdd)) {
        GmailApp.sendEmail(userEmail, 'Already Exists',
          `"${emailToAdd}" is already in the whitelist.`);
        return true;
      }

      const newWhitelist = [...whitelist, emailToAdd];
      PropertiesService.getScriptProperties().setProperty(
        'WHITELIST_EMAILS', newWhitelist.join(', '));

      GmailApp.sendEmail(userEmail, 'User Added',
        `Successfully added "${emailToAdd}" to the whitelist.\n\n` +
        `Total users: ${newWhitelist.length}\n` +
        newWhitelist.map((e, i) => `${i + 1}. ${e}`).join('\n'));

      // Notify the new user
      const agentName = CONFIG.AGENT_NAME || 'Maillifier';
      const agentEmail = PropertiesService.getScriptProperties().getProperty('AGENT_EMAIL') 
                      || Session.getActiveUser().getEmail();
      console.log(`Sending welcome email to new user: ${emailToAdd}`);
      GmailApp.sendEmail(
        emailToAdd,
        `You've been invited to use ${agentName}`,
        `Hello!

${userEmail} has invited you to use ${agentName} — an AI email assistant.

${agentName} is running on: ${agentEmail}

⚠️ SECURITY NOTICE:
This service was set up by ${userEmail}. Before forwarding any emails,
make sure you trust this person and understand that forwarded emails
will be processed by an AI system. Use only for non-confidential
information until you've verified the setup.

===========================================
HOW IT WORKS
===========================================

1. You receive an email that needs a reply
2. Forward it to: ${agentEmail}
3. Receive an AI-drafted response within 1-5 minutes
4. Review, edit if needed, and send to your client

You can also add personal instructions at the top before forwarding:
  "Client is VIP, use formal tone."
  "Suggest Thursday or Friday for a meeting."

===========================================
YOUR COMMANDS (send to ${agentEmail})
===========================================

#SET_USER_PROMPT   — Set your personal rules for the AI
  Example:
  #SET_USER_PROMPT
  I am on vacation until Friday.
  Always suggest meetings via: https://calendly.com/yourlink

#GET_PROMPT        — View your current configuration

#SET_USER_PROMPT   — Clear rules (send with no text after command)
(empty)

===========================================
UNDERSTANDING THE RESPONSE
===========================================

Every draft includes:
• Confidence Level — how sure the AI is (80%+ is reliable)
• The draft response in the client's language
• The original forwarded message for reference

===========================================

Questions? Contact your administrator: ${userEmail}
`
      );
      console.log(`Welcome email sent to: ${emailToAdd}`);

      Logger.log(userEmail, `Admin Command: ADD_USER ${emailToAdd}`, 0);
      return true;

    } catch (error) {
      GmailApp.sendEmail(userEmail, 'Error Adding User', error.message);
      return true;
    }
  },

  _handleRemoveUser(userEmail, body) {
    try {
      const emailToRemove = this._extractEmail(body, '#REMOVE_USER');

      if (!emailToRemove) {
        GmailApp.sendEmail(userEmail, 'Invalid Command',
          'Please specify an email address.\n\nUsage: #REMOVE_USER user@example.com');
        return true;
      }

      const whitelist = CONFIG.WHITELIST_EMAILS || [];
      const exists = whitelist.some(e => e.toLowerCase() === emailToRemove);

      if (!exists) {
        GmailApp.sendEmail(userEmail, 'Not Found',
          `"${emailToRemove}" is not in the whitelist.`);
        return true;
      }

      // Prevent removing the last admin
      if (this.isAdmin(emailToRemove) && this.getAdminEmails().length <= 1) {
        GmailApp.sendEmail(userEmail, 'Cannot Remove',
          `Cannot remove "${emailToRemove}" — they are the only administrator.\n` +
          `Use #SET_ADMIN to transfer admin rights first.`);
        return true;
      }

      const newWhitelist = whitelist.filter(e => e.toLowerCase() !== emailToRemove);
      PropertiesService.getScriptProperties().setProperty(
        'WHITELIST_EMAILS', newWhitelist.join(', '));

      // Clear personal prompt
      PropertiesService.getScriptProperties().deleteProperty(`PROMPT_${emailToRemove}`);

      GmailApp.sendEmail(userEmail, 'User Removed',
        `Successfully removed "${emailToRemove}" from the whitelist.\n` +
        `Their personal rules have also been cleared.\n\n` +
        `Remaining users: ${newWhitelist.length}\n` +
        (newWhitelist.length > 0
          ? newWhitelist.map((e, i) => `${i + 1}. ${e}`).join('\n')
          : '(empty)'));

      // Notify the removed user
      const agentName = CONFIG.AGENT_NAME || 'Maillifier';
      console.log(`Sending removal notification to: ${emailToRemove}`);
      GmailApp.sendEmail(
        emailToRemove,
        `Your access to ${agentName} has been revoked`,
        `Hello,

Your access to ${agentName} has been revoked by ${userEmail}.

You will no longer receive AI-generated email drafts from this service.
Emails forwarded to the agent address will not be processed.

If you believe this was done in error, please contact:
${userEmail}
`
      );
      console.log(`Removal notification sent to: ${emailToRemove}`);

      Logger.log(userEmail, `Admin Command: REMOVE_USER ${emailToRemove}`, 0);
      return true;

    } catch (error) {
      GmailApp.sendEmail(userEmail, 'Error Removing User', error.message);
      return true;
    }
  },

  /**
   * #SET_ADMIN — transfer admin rights to another user (irreversible without manual edit)
   */
  _handleSetAdmin(userEmail, body) {
    try {
      const newAdmin = this._extractEmail(body, '#SET_ADMIN');

      if (!newAdmin) {
        GmailApp.sendEmail(userEmail, 'Invalid Command',
          'Please specify an email address.\n\nUsage: #SET_ADMIN new_admin@example.com\n\n' +
          '⚠️ Warning: This transfers admin rights. Cannot be undone via email commands.');
        return true;
      }

      if (!this._isValidEmail(newAdmin)) {
        GmailApp.sendEmail(userEmail, 'Invalid Email',
          `"${newAdmin}" is not a valid email address.`);
        return true;
      }

      if (newAdmin === userEmail) {
        GmailApp.sendEmail(userEmail, 'No Change',
          'You are already the administrator.');
        return true;
      }

      // Set new admin (replaces current — single-admin model)
      PropertiesService.getScriptProperties().setProperty('ADMIN_EMAIL', newAdmin);

      // Ensure new admin is in whitelist
      const whitelist = CONFIG.WHITELIST_EMAILS || [];
      if (!whitelist.some(e => e.toLowerCase() === newAdmin)) {
        const newWhitelist = [...whitelist, newAdmin];
        PropertiesService.getScriptProperties().setProperty(
          'WHITELIST_EMAILS', newWhitelist.join(', '));
      }

      // Notify previous admin
      GmailApp.sendEmail(userEmail, 'Admin Rights Transferred',
        `Admin rights have been transferred to "${newAdmin}".\n\n` +
        `You remain an authorized user but can no longer execute admin commands.\n\n` +
        `To restore your rights: ask "${newAdmin}" to send #SET_ADMIN ${userEmail}`);

      // Notify new admin
      GmailApp.sendEmail(newAdmin, 'You Are Now the Maillifier Admin',
        `Hello!\n\n` +
        `${userEmail} has transferred administrator rights to you.\n\n` +
        `Available admin commands:\n` +
        `  #LIST_USERS                    - View all authorized users\n` +
        `  #ADD_USER user@example.com     - Add a user\n` +
        `  #REMOVE_USER user@example.com  - Remove a user\n` +
        `  #SET_ADMIN email               - Transfer admin rights\n\n` +
        `User commands:\n` +
        `  #SET_USER_PROMPT  - Set personal rules\n` +
        `  #GET_PROMPT       - View configuration`);

      Logger.log(userEmail, `Admin Command: SET_ADMIN -> ${newAdmin}`, 0);
      return true;

    } catch (error) {
      GmailApp.sendEmail(userEmail, 'Error Setting Admin', error.message);
      return true;
    }
  },

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  _sendAccessDenied(userEmail) {
    const admins = this.getAdminEmails();
    const contact = admins.length > 0 ? admins[0] : 'the system administrator';
    GmailApp.sendEmail(userEmail, 'Access Denied',
      `You do not have permission to execute admin commands.\n\n` +
      `Contact: ${contact}\n\n` +
      `Your available commands:\n` +
      `  #SET_USER_PROMPT - Set personal rules\n` +
      `  #GET_PROMPT      - View configuration`);
  },

  _extractEmail(body, command) {
    const lines = body.split('\n');
    for (const line of lines) {
      if (!line.includes(command)) continue;
      const match = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (match) return match[0].toLowerCase().trim();
    }
    return null;
  },

  _isValidEmail(email) {
    if (!email) return false;
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  }
};
