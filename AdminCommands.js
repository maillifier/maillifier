/**
 * AdminCommands.gs - Administrative commands handler
 * Only users in ADMIN_EMAILS can execute these commands
 */
const AdminCommands = {

  /**
   * Check if user has admin privileges
   * @param {string} userEmail - Email to check
   * @returns {boolean} - True if user is admin
   */
  isAdmin(userEmail) {
    if (!userEmail) return false;
    
    const adminEmails = this.getAdminEmails();
    const cleanEmail = userEmail.toLowerCase().trim();
    
    return adminEmails.some(email => email.toLowerCase().trim() === cleanEmail);
  },

  /**
   * Get list of admin emails from Script Properties
   * @returns {Array<string>} - List of admin emails
   */
  getAdminEmails() {
    const rawEmails = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS');
    if (!rawEmails) return [];
    return rawEmails.split(',').map(email => email.trim().toLowerCase());
  },

  /**
   * Handle admin commands
   * @param {GoogleAppsScript.Gmail.GmailMessage} message - The Gmail message
   * @param {string} userEmail - Sender's email
   * @returns {boolean} - True if command was handled
   */
  handleCommand(message, userEmail) {
    const body = message.getPlainBody().trim();
    
    // List of admin-only commands
    const adminCommands = [
      '#CHECK_UPDATE',
      '#UPDATE_SERVICE',
      '#GET_WHITELIST',
      '#ADD_EMAIL',
      '#REMOVE_EMAIL',
      '#GET_ADMINS',
      '#ADD_ADMIN',
      '#REMOVE_ADMIN'
    ];
    
    // Check if message contains any admin command
    const containsAdminCommand = adminCommands.some(cmd => body.includes(cmd));
    
    if (!containsAdminCommand) {
      return false;
    }
    
    // Check admin privileges
    if (!this.isAdmin(userEmail)) {
      this._sendAccessDenied(userEmail);
      Logger.log(userEmail, 'Admin Command Denied', 0);
      return true; // Command handled (denied)
    }
    
    // Process admin commands
    if (body.includes('#CHECK_UPDATE')) {
      return this._handleCheckUpdate(userEmail);
    }
    
    if (body.includes('#UPDATE_SERVICE')) {
      return this._handleUpdateService(userEmail);
    }
    
    if (body.includes('#GET_WHITELIST')) {
      return this._handleGetWhitelist(userEmail);
    }
    
    if (body.includes('#ADD_EMAIL')) {
      return this._handleAddEmail(userEmail, body);
    }
    
    if (body.includes('#REMOVE_EMAIL')) {
      return this._handleRemoveEmail(userEmail, body);
    }
    
    if (body.includes('#GET_ADMINS')) {
      return this._handleGetAdmins(userEmail);
    }
    
    if (body.includes('#ADD_ADMIN')) {
      return this._handleAddAdmin(userEmail, body);
    }
    
    if (body.includes('#REMOVE_ADMIN')) {
      return this._handleRemoveAdmin(userEmail, body);
    }
    
    return false;
  },

  /**
   * Send access denied message
   * @private
   */
  _sendAccessDenied(userEmail) {
    const adminEmails = this.getAdminEmails();
    const adminContact = adminEmails.length > 0 ? adminEmails[0] : 'system administrator';
    
    GmailApp.sendEmail(
      userEmail,
      '🚫 Access Denied - Admin Command',
      `You do not have permission to execute administrative commands.

This action requires administrator privileges.

To request admin access, please contact:
${adminContact}

Available commands for regular users:
• #SET_USER_PROMPT - Set your personal rules
• #GET_PROMPT - View your current configuration
`
    );
  },

  /**
   * Handle #CHECK_UPDATE command
   * @private
   */
  _handleCheckUpdate(userEmail) {
    try {
      const versionInfo = typeof VERSION !== 'undefined' ? VERSION.checkForUpdate() : null;
      
      // Build version info from local VERSION object
      const localInfo = typeof VERSION !== 'undefined' ? VERSION.getInfo() : null;

      let emailBody;
      if (versionInfo && versionInfo.updateAvailable) {
        const parts = [];
        parts.push('🔄 UPDATE AVAILABLE!\n');
        parts.push(`📜 Script: ${versionInfo.userVersion} → ${versionInfo.currentVersion}${versionInfo.scriptUpdateAvailable ? ' ⬆️' : ''}`);
        parts.push(`🔧 Installer: ${versionInfo.userInstallerVersion} → ${versionInfo.currentInstallerVersion}${versionInfo.installerUpdateAvailable ? ' ⬆️' : ''}`);

        if (versionInfo.changelog) {
          parts.push(`\n📝 Changes:\n${versionInfo.changelog}`);
        }

        parts.push('\nTo update, send an email with: #UPDATE_SERVICE');
        parts.push('\n⚠️ All user settings will be preserved during update.');
        emailBody = parts.join('\n');
      } else if (versionInfo) {
        emailBody = `✅ YOU'RE UP TO DATE!

📜 Script version: ${versionInfo.userVersion}
🔧 Installer version: ${versionInfo.userInstallerVersion}

No update required.`;
      } else if (localInfo) {
        emailBody = `📦 VERSION INFO (offline)

📜 Script version: ${localInfo.script}
🔧 Installer version: ${localInfo.installer}
📅 Installed: ${localInfo.installedAt}

⚠️ Could not reach update server to check for newer versions.`;
      } else {
        emailBody = `⚠️ VERSION CHECK UNAVAILABLE

VERSION module is not installed.
Please update manually through the installer website.`;
      }
      
      GmailApp.sendEmail(userEmail, '📦 Mail Architect Version Check', emailBody);
      Logger.log(userEmail, 'Admin Command: CHECK_UPDATE', 0);
      return true;
      
    } catch (error) {
      console.error('Check update error:', error);
      GmailApp.sendEmail(
        userEmail,
        '❌ Version Check Failed',
        `An error occurred while checking for updates:\n\n${error.message}`
      );
      return true;
    }
  },

  /**
   * Handle #UPDATE_SERVICE command
   * @private
   */
  _handleUpdateService(userEmail) {
    try {
      // Check if VERSION module exists
      if (typeof VERSION === 'undefined') {
        GmailApp.sendEmail(
          userEmail,
          '⚠️ Update Not Available',
          `The update system is not installed in this version.

Please update manually through the installer website.`
        );
        return true;
      }
      
      const versionInfo = VERSION.checkForUpdate();
      
      if (!versionInfo.updateAvailable) {
        GmailApp.sendEmail(
          userEmail,
          '✅ Already Up To Date',
          `Mail Architect is already running the latest version (${versionInfo.currentVersion}).`
        );
        return true;
      }
      
      // Backup configuration
      const backup = VERSION.getConfigBackup();
      const scriptId = ScriptApp.getScriptId();
      
      // Request update from server
      const response = UrlFetchApp.fetch(
        `${VERSION.updateServer}/api/update/request`,
        {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({
            scriptId: scriptId,
            currentVersion: VERSION.current,
            userEmail: userEmail,
            backup: backup
          }),
          muteHttpExceptions: true
        }
      );
      
      const result = JSON.parse(response.getContentText());
      
      if (result.success) {
        GmailApp.sendEmail(
          userEmail,
          '🔄 Update Instructions',
          `To complete the update, please visit:

${result.updateUrl || VERSION.updateServer + '/update.html?scriptId=' + scriptId}

You will need to:
1. Log in with your Google account
2. Confirm the update
3. Re-authorize if prompted

📜 Script: ${versionInfo.userVersion} → ${versionInfo.currentVersion}
🔧 Installer: ${versionInfo.userInstallerVersion} → ${versionInfo.currentInstallerVersion}
          `.trim()
        );
      } else {
        throw new Error(result.error || 'Update request failed');
      }
      
      Logger.log(userEmail, 'Admin Command: UPDATE_SERVICE', 0);
      return true;
      
    } catch (error) {
      console.error('Update service error:', error);
      GmailApp.sendEmail(
        userEmail,
        '❌ Update Failed',
        `An error occurred during the update process:\n\n${error.message}\n\nPlease try again later or update manually through the installer website.`
      );
      return true;
    }
  },

  /**
   * Handle #GET_WHITELIST command
   * @private
   */
  _handleGetWhitelist(userEmail) {
    const whitelist = CONFIG.WHITELIST_EMAILS || [];
    const adminList = this.getAdminEmails();
    
    let emailBody = `
📋 MAIL ARCHITECT - ACCESS LIST
===========================================

👑 ADMINISTRATORS (${adminList.length}):
${adminList.length > 0 ? adminList.map((e, i) => `   ${i + 1}. ${e}`).join('\n') : '   (none configured)'}

👥 AUTHORIZED USERS (${whitelist.length}):
${whitelist.length > 0 ? whitelist.map((e, i) => `   ${i + 1}. ${e}`).join('\n') : '   (none configured)'}

===========================================

📝 MANAGEMENT COMMANDS:

Add user:      #ADD_EMAIL user@example.com
Remove user:   #REMOVE_EMAIL user@example.com
Add admin:     #ADD_ADMIN admin@example.com
Remove admin:  #REMOVE_ADMIN admin@example.com

===========================================
    `.trim();
    
    GmailApp.sendEmail(userEmail, '📋 Mail Architect - Access List', emailBody);
    Logger.log(userEmail, 'Admin Command: GET_WHITELIST', 0);
    return true;
  },

  /**
   * Handle #ADD_EMAIL command
   * @private
   */
  _handleAddEmail(userEmail, body) {
    try {
      const emailToAdd = this._extractEmailFromCommand(body, '#ADD_EMAIL');
      
      if (!emailToAdd) {
        GmailApp.sendEmail(
          userEmail,
          '❌ Invalid Command',
          `Please specify an email address to add.

Usage: #ADD_EMAIL user@example.com`
        );
        return true;
      }
      
      // Validate email format
      if (!this._isValidEmail(emailToAdd)) {
        GmailApp.sendEmail(
          userEmail,
          '❌ Invalid Email',
          `"${emailToAdd}" is not a valid email address.`
        );
        return true;
      }
      
      // Get current whitelist
      const currentWhitelist = CONFIG.WHITELIST_EMAILS || [];
      
      // Check if already exists
      if (currentWhitelist.some(e => e.toLowerCase() === emailToAdd.toLowerCase())) {
        GmailApp.sendEmail(
          userEmail,
          '⚠️ Email Already Exists',
          `"${emailToAdd}" is already in the whitelist.`
        );
        return true;
      }
      
      // Add to whitelist
      const newWhitelist = [...currentWhitelist, emailToAdd.toLowerCase()];
      PropertiesService.getScriptProperties().setProperty(
        'WHITELIST_EMAILS',
        newWhitelist.join(', ')
      );
      
      GmailApp.sendEmail(
        userEmail,
        '✅ Email Added',
        `Successfully added "${emailToAdd}" to the whitelist.

Current whitelist (${newWhitelist.length} users):
${newWhitelist.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
      );
      
      Logger.log(userEmail, `Admin Command: ADD_EMAIL ${emailToAdd}`, 0);
      return true;
      
    } catch (error) {
      console.error('Add email error:', error);
      GmailApp.sendEmail(
        userEmail,
        '❌ Error Adding Email',
        `An error occurred: ${error.message}`
      );
      return true;
    }
  },

  /**
   * Handle #REMOVE_EMAIL command
   * @private
   */
  _handleRemoveEmail(userEmail, body) {
    try {
      const emailToRemove = this._extractEmailFromCommand(body, '#REMOVE_EMAIL');
      
      if (!emailToRemove) {
        GmailApp.sendEmail(
          userEmail,
          '❌ Invalid Command',
          `Please specify an email address to remove.

Usage: #REMOVE_EMAIL user@example.com`
        );
        return true;
      }
      
      // Get current whitelist
      const currentWhitelist = CONFIG.WHITELIST_EMAILS || [];
      
      // Check if exists
      const emailIndex = currentWhitelist.findIndex(
        e => e.toLowerCase() === emailToRemove.toLowerCase()
      );
      
      if (emailIndex === -1) {
        GmailApp.sendEmail(
          userEmail,
          '⚠️ Email Not Found',
          `"${emailToRemove}" is not in the whitelist.`
        );
        return true;
      }
      
      // Prevent removing the last admin
      if (this.isAdmin(emailToRemove)) {
        const adminEmails = this.getAdminEmails();
        if (adminEmails.length <= 1) {
          GmailApp.sendEmail(
            userEmail,
            '🚫 Cannot Remove',
            `Cannot remove "${emailToRemove}" - they are the last administrator.

Use #REMOVE_ADMIN first if you want to demote them to regular user.`
          );
          return true;
        }
      }
      
      // Remove from whitelist
      const newWhitelist = currentWhitelist.filter(
        e => e.toLowerCase() !== emailToRemove.toLowerCase()
      );
      
      PropertiesService.getScriptProperties().setProperty(
        'WHITELIST_EMAILS',
        newWhitelist.join(', ')
      );
      
      // Also remove their personal prompt
      const promptKey = `PROMPT_${emailToRemove.toLowerCase()}`;
      PropertiesService.getScriptProperties().deleteProperty(promptKey);
      
      GmailApp.sendEmail(
        userEmail,
        '✅ Email Removed',
        `Successfully removed "${emailToRemove}" from the whitelist.

Their personal rules have also been cleared.

Current whitelist (${newWhitelist.length} users):
${newWhitelist.length > 0 ? newWhitelist.map((e, i) => `${i + 1}. ${e}`).join('\n') : '(empty)'}`
      );
      
      Logger.log(userEmail, `Admin Command: REMOVE_EMAIL ${emailToRemove}`, 0);
      return true;
      
    } catch (error) {
      console.error('Remove email error:', error);
      GmailApp.sendEmail(
        userEmail,
        '❌ Error Removing Email',
        `An error occurred: ${error.message}`
      );
      return true;
    }
  },

  /**
   * Handle #GET_ADMINS command
   * @private
   */
  _handleGetAdmins(userEmail) {
    const adminList = this.getAdminEmails();
    
    let emailBody = `
👑 MAIL ARCHITECT - ADMINISTRATORS
===========================================

${adminList.length > 0 
  ? adminList.map((e, i) => `${i + 1}. ${e}`).join('\n') 
  : '(no administrators configured)'}

===========================================

📝 MANAGEMENT COMMANDS:

Add admin:     #ADD_ADMIN admin@example.com
Remove admin:  #REMOVE_ADMIN admin@example.com

⚠️ Note: Admins must also be in the whitelist to receive emails.

===========================================
    `.trim();
    
    GmailApp.sendEmail(userEmail, '👑 Mail Architect - Administrators', emailBody);
    Logger.log(userEmail, 'Admin Command: GET_ADMINS', 0);
    return true;
  },

  /**
   * Handle #ADD_ADMIN command
   * @private
   */
  _handleAddAdmin(userEmail, body) {
    try {
      const emailToAdd = this._extractEmailFromCommand(body, '#ADD_ADMIN');
      
      if (!emailToAdd) {
        GmailApp.sendEmail(
          userEmail,
          '❌ Invalid Command',
          `Please specify an email address to add as admin.

Usage: #ADD_ADMIN admin@example.com`
        );
        return true;
      }
      
      // Validate email format
      if (!this._isValidEmail(emailToAdd)) {
        GmailApp.sendEmail(
          userEmail,
          '❌ Invalid Email',
          `"${emailToAdd}" is not a valid email address.`
        );
        return true;
      }
      
      // Get current admin list
      const currentAdmins = this.getAdminEmails();
      
      // Check if already admin
      if (currentAdmins.some(e => e.toLowerCase() === emailToAdd.toLowerCase())) {
        GmailApp.sendEmail(
          userEmail,
          '⚠️ Already Admin',
          `"${emailToAdd}" is already an administrator.`
        );
        return true;
      }
      
      // Add to admin list
      const newAdmins = [...currentAdmins, emailToAdd.toLowerCase()];
      PropertiesService.getScriptProperties().setProperty(
        'ADMIN_EMAILS',
        newAdmins.join(', ')
      );
      
      // Also add to whitelist if not there
      const whitelist = CONFIG.WHITELIST_EMAILS || [];
      if (!whitelist.some(e => e.toLowerCase() === emailToAdd.toLowerCase())) {
        const newWhitelist = [...whitelist, emailToAdd.toLowerCase()];
        PropertiesService.getScriptProperties().setProperty(
          'WHITELIST_EMAILS',
          newWhitelist.join(', ')
        );
      }
      
      GmailApp.sendEmail(
        userEmail,
        '✅ Admin Added',
        `Successfully added "${emailToAdd}" as administrator.

They have also been added to the whitelist if not already present.

Current administrators (${newAdmins.length}):
${newAdmins.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
      );
      
      // Notify the new admin
      if (emailToAdd.toLowerCase() !== userEmail.toLowerCase()) {
        GmailApp.sendEmail(
          emailToAdd,
          '👑 You Are Now an Admin - Mail Architect',
          `Hello!

You have been granted administrator privileges for Mail Architect by ${userEmail}.

As an admin, you can now use:
• #CHECK_UPDATE - Check for updates
• #UPDATE_SERVICE - Update the service
• #GET_WHITELIST - View authorized users
• #ADD_EMAIL / #REMOVE_EMAIL - Manage users
• #GET_ADMINS / #ADD_ADMIN / #REMOVE_ADMIN - Manage admins

Welcome to the admin team!`
        );
      }
      
      Logger.log(userEmail, `Admin Command: ADD_ADMIN ${emailToAdd}`, 0);
      return true;
      
    } catch (error) {
      console.error('Add admin error:', error);
      GmailApp.sendEmail(
        userEmail,
        '❌ Error Adding Admin',
        `An error occurred: ${error.message}`
      );
      return true;
    }
  },

  /**
   * Handle #REMOVE_ADMIN command
   * @private
   */
  _handleRemoveAdmin(userEmail, body) {
    try {
      const emailToRemove = this._extractEmailFromCommand(body, '#REMOVE_ADMIN');
      
      if (!emailToRemove) {
        GmailApp.sendEmail(
          userEmail,
          '❌ Invalid Command',
          `Please specify an email address to remove from admins.

Usage: #REMOVE_ADMIN admin@example.com`
        );
        return true;
      }
      
      // Get current admin list
      const currentAdmins = this.getAdminEmails();
      
      // Check if is admin
      const adminIndex = currentAdmins.findIndex(
        e => e.toLowerCase() === emailToRemove.toLowerCase()
      );
      
      if (adminIndex === -1) {
        GmailApp.sendEmail(
          userEmail,
          '⚠️ Not an Admin',
          `"${emailToRemove}" is not in the administrators list.`
        );
        return true;
      }
      
      // Prevent removing the last admin
      if (currentAdmins.length <= 1) {
        GmailApp.sendEmail(
          userEmail,
          '🚫 Cannot Remove',
          `Cannot remove the last administrator.

There must be at least one admin at all times.`
        );
        return true;
      }
      
      // Prevent self-removal (optional safety)
      if (emailToRemove.toLowerCase() === userEmail.toLowerCase()) {
        GmailApp.sendEmail(
          userEmail,
          '🚫 Cannot Remove Yourself',
          `You cannot remove yourself from administrators.

Ask another admin to remove you if needed.`
        );
        return true;
      }
      
      // Remove from admin list
      const newAdmins = currentAdmins.filter(
        e => e.toLowerCase() !== emailToRemove.toLowerCase()
      );
      
      PropertiesService.getScriptProperties().setProperty(
        'ADMIN_EMAILS',
        newAdmins.join(', ')
      );
      
      GmailApp.sendEmail(
        userEmail,
        '✅ Admin Removed',
        `Successfully removed "${emailToRemove}" from administrators.

They remain in the whitelist as a regular user.

Current administrators (${newAdmins.length}):
${newAdmins.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
      );
      
      // Notify the removed admin
      if (emailToRemove.toLowerCase() !== userEmail.toLowerCase()) {
        GmailApp.sendEmail(
          emailToRemove,
          '⚠️ Admin Rights Revoked - Mail Architect',
          `Hello,

Your administrator privileges for Mail Architect have been revoked by ${userEmail}.

You remain an authorized user and can still:
• Forward emails for AI processing
• Use #SET_USER_PROMPT for personal rules
• Use #GET_PROMPT to view your configuration

If you believe this was done in error, please contact the administrator.`
        );
      }
      
      Logger.log(userEmail, `Admin Command: REMOVE_ADMIN ${emailToRemove}`, 0);
      return true;
      
    } catch (error) {
      console.error('Remove admin error:', error);
      GmailApp.sendEmail(
        userEmail,
        '❌ Error Removing Admin',
        `An error occurred: ${error.message}`
      );
      return true;
    }
  },

  /**
   * Extract email from command string
   * @private
   */
  _extractEmailFromCommand(body, command) {
    const lines = body.split('\n');
    for (const line of lines) {
      if (line.includes(command)) {
        const match = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (match) {
          return match[0].toLowerCase().trim();
        }
        // Also try getting text after command
        const parts = line.split(command);
        if (parts[1]) {
          const email = parts[1].trim().split(/\s+/)[0];
          if (this._isValidEmail(email)) {
            return email.toLowerCase().trim();
          }
        }
      }
    }
    return null;
  },

  /**
   * Validate email format
   * @private
   */
  _isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }
};
