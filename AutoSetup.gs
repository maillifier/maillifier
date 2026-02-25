/**
 * AutoSetup.gs — Maillifier Manual Setup
 *
 * For MANUAL installation from https://github.com/maillifier/maillifier
 *
 * BEFORE running:
 *   1. Open Project Settings (gear icon) → Script Properties
 *   2. Add the following properties:
 *
 *      AGENT_NAME       — display name for your agent, e.g. "Maillifier"
 *      ADMIN_EMAIL      — your personal email (receives activation instructions)
 *      WAITING_INTERVAL — check interval in minutes, e.g. "1"
 *      GEMINI_API_KEY   — your key from https://aistudio.google.com/app/apikey
 *
 * THEN:
 *   Select runInitialSetup in the function dropdown and click Run.
 *   Authorise the requested permissions when prompted.
 *   Check your ADMIN_EMAIL inbox for activation instructions.
 */

function runInitialSetup() {
  console.log('Starting Maillifier setup...');

  var agentEmail = Session.getActiveUser().getEmail();

  // Read config from Script Properties set by the user before running
  var props        = PropertiesService.getScriptProperties();
  var agentName    = props.getProperty('AGENT_NAME')       || 'Maillifier';
  var adminEmail   = props.getProperty('ADMIN_EMAIL')      || agentEmail;
  var interval     = props.getProperty('WAITING_INTERVAL') || '1';
  var geminiKey    = props.getProperty('GEMINI_API_KEY')   || 'PASTE_YOUR_KEY_HERE';

  try {
    // Step 1: Create Knowledge Base document
    var kbDoc  = DocumentApp.create(agentName + ' \u2014 Knowledge Base');
    var kbBody = kbDoc.getBody();
    kbBody.appendParagraph('=== COMPANY INFORMATION ===');
    kbBody.appendParagraph('Company Name: Your Company');
    kbBody.appendParagraph('Website: www.yourcompany.com');
    kbBody.appendParagraph('');
    kbBody.appendParagraph('=== SERVICES ===');
    kbBody.appendParagraph('Add your services and descriptions here.');
    kbBody.appendParagraph('');
    kbBody.appendParagraph('=== TONE GUIDELINES ===');
    kbBody.appendParagraph('Professional but friendly tone.');
    kbDoc.saveAndClose();
    var kbUrl = 'https://docs.google.com/document/d/' + kbDoc.getId();

    // Step 2: Create Log spreadsheet
    var logSheet = SpreadsheetApp.create(agentName + ' \u2014 Logs');
    var sheet    = logSheet.getActiveSheet();
    sheet.setName('Logs');
    sheet.appendRow(['Date', 'Sender', 'Status', 'Tokens Used', 'Notes']);
    sheet.setFrozenRows(1);
    var logUrl = 'https://docs.google.com/spreadsheets/d/' + logSheet.getId();

    // Step 3: Write all Script Properties
    props.setProperties({
      'AGENT_NAME':         agentName,
      'AGENT_EMAIL':        agentEmail,
      'ADMIN_EMAIL':        adminEmail,
      'WHITELIST_EMAILS':   adminEmail,
      'WAITING_INTERVAL':   interval,
      'KNOWLEDGE_BASE_URL': kbUrl,
      'LOG_SHEET_URL':      logUrl,
      'GEMINI_API_KEY':     geminiKey
    });

    // Step 4: Create Gmail labels
    try {
      GmailApp.createLabel('Maillifier-History');
      GmailApp.createLabel('Filtered/External');
    } catch (e) {
      console.log('Labels may already exist: ' + e.message);
    }

    // Step 5: Setup time-based trigger
    ScriptApp.getProjectTriggers().forEach(function(t) {
      if (t.getHandlerFunction() === 'processEmails') ScriptApp.deleteTrigger(t);
    });
    ScriptApp.newTrigger('processEmails')
      .timeBased()
      .everyMinutes(parseInt(interval) || 1)
      .create();

    // Step 6: Send activation instructions to admin
    var lines = [
      '====================================================',
      'YOUR RESOURCES',
      '====================================================',
      '',
      'Open these links in a private / incognito window logged in as:',
      '    ' + agentEmail,
      '',
      'Knowledge Base (add your company info here):',
      kbUrl,
      '',
      'Activity Logs:',
      logUrl,
      '',
      '====================================================',
      'SECURITY NOTICE',
      '====================================================',
      '',
      'Maillifier processes emails inside the agent Google account:',
      '    ' + agentEmail,
      '',
      'If you were invited to use an agent set up by someone else,',
      'make sure you trust that account owner.',
      'If you are unsure, do not forward sensitive or private emails to it.',
      'Use it only for processing public information (e.g. social media',
      'inquiries, public contact forms) until you have verified ownership.',
      '',
      '====================================================',
      'NEXT STEP: ENABLE GEMINI API',
      '====================================================',
      '',
      'Your Gemini API key has been saved. One last step:',
      '',
      'Make sure the Gemini API is enabled in your Google Cloud project.',
      '',
      '  a) Open this link in a private window as ' + agentEmail + ':',
      '     https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com',
      '  b) Make sure the correct project is selected in the top dropdown',
      '     (the same project where you created the API key)',
      '  c) If you see an "Enable" button — click it',
      '  d) If you see "API Enabled" — you are good',
      '  e) Wait 1-2 minutes before testing',
      '',
      'That is it! Your agent will start processing forwarded emails automatically.',
      '',
      '====================================================',
      'HOW TO USE MAILLIFIER',
      '====================================================',
      '',
      'Forward any email to the agent account (' + agentEmail + ')',
      'to receive an AI-drafted reply within 1-5 minutes.',
      '',
      '====================================================',
      'EMAIL COMMANDS',
      '====================================================',
      '',
      'Send these commands from ' + adminEmail + ' to ' + agentEmail + ':',
      '',
      '--- AI BEHAVIOUR ---',
      '',
      '#SET_USER_PROMPT',
      'Set personal rules for the AI (tone, Calendly link, vacation notice, etc.)',
      'Example:',
      '  #SET_USER_PROMPT',
      '  Use a friendly tone. Always include my Calendly: https://calendly.com/you',
      '',
      '#GET_PROMPT',
      'View your current personal rules and global configuration.',
      '',
      '--- USER MANAGEMENT (admin only) ---',
      '',
      '#ADD_USER user@example.com',
      'Grant a user permission to forward emails to the agent.',
      '',
      '#REMOVE_USER user@example.com',
      'Revoke user access.',
      '',
      '#LIST_USERS',
      'Show all currently authorised users.',
      '',
      '#SET_ADMIN new-admin@example.com',
      'Transfer admin rights to another account.',
      'WARNING: you will lose admin access after this command.',
      '',
      '====================================================',
      'FILL IN YOUR KNOWLEDGE BASE',
      '====================================================',
      '',
      'Open in a private window as ' + agentEmail + ':',
      kbUrl,
      '',
      'Add your company info: services, pricing, FAQs, tone guidelines.',
      'The more detail you add, the better your AI drafts will be.',
      '',
      '---',
      'Maillifier — https://maillifier.com',
      'Open source: https://github.com/maillifier/maillifier',
      'Support: https://github.com/maillifier/maillifier/issues'
    ];

    GmailApp.sendEmail(
      adminEmail,
      '\u2705 ' + agentName + ' Agent is ready \u2014 activate with your Gemini API key',
      lines.join('\n')
    );

    if (agentEmail !== adminEmail) {
      GmailApp.sendEmail(
        agentEmail,
        '\u2705 ' + agentName + ' Agent setup complete',
        'This account (' + agentEmail + ') has been configured as a Maillifier agent.\n' +
        'Administrator: ' + adminEmail + '\n\n' +
        'Full activation instructions have been sent to ' + adminEmail + '.\n\n' +
        'Knowledge Base: ' + kbUrl + '\n' +
        'Activity Logs: ' + logUrl
      );
    }

    console.log('Setup complete! Activation email sent to ' + adminEmail);

  } catch (error) {
    console.error('Setup error: ' + error.message);
    throw error;
  }
}
