/**
 * AutoSetup.gs — Maillifier Initial Setup
 * Source: https://github.com/maillifier/maillifier
 *
 * BEFORE running this function, set two Script Properties
 * (Project Settings > Script Properties):
 *   ADMIN_EMAIL    — your personal email (where AI drafts are sent)
 *   GEMINI_API_KEY — free key from https://aistudio.google.com/app/apikey
 *
 * Then run runInitialSetup() ONCE to complete setup.
 */

function runInitialSetup() {
  console.log('Starting Maillifier setup...');

  var props = PropertiesService.getScriptProperties();
  var agentEmail = Session.getActiveUser().getEmail();
  var adminEmail = props.getProperty('ADMIN_EMAIL');
  var geminiKey = props.getProperty('GEMINI_API_KEY');

  // ── Pre-flight checks ──────────────────────────────────────
  if (!adminEmail) {
    throw new Error(
      'ADMIN_EMAIL is not set. Go to Project Settings > Script Properties ' +
      'and add ADMIN_EMAIL with your personal email address, then run again.'
    );
  }

  if (!geminiKey || geminiKey === 'PASTE_YOUR_KEY_HERE') {
    throw new Error(
      'GEMINI_API_KEY is not set. Go to Project Settings > Script Properties ' +
      'and add your Gemini API key (https://aistudio.google.com/app/apikey), then run again.'
    );
  }

  var agentName = props.getProperty('AGENT_NAME') || 'Maillifier';
  var checkInterval = parseInt(props.getProperty('WAITING_INTERVAL') || '1', 10) || 1;

  try {
    // ── Step 1: Create Knowledge Base document ────────────────
    console.log('Step 1: Creating Knowledge Base...');
    var kbDoc  = DocumentApp.create(agentName + ' — Knowledge Base');
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

    // ── Step 2: Create Log spreadsheet ────────────────────────
    console.log('Step 2: Creating Logs spreadsheet...');
    var logSheet = SpreadsheetApp.create(agentName + ' — Logs');
    var sheet    = logSheet.getActiveSheet();
    sheet.setName('Logs');
    sheet.appendRow(['Date', 'Sender', 'Status', 'Tokens Used', 'Notes']);
    sheet.setFrozenRows(1);
    var logUrl = 'https://docs.google.com/spreadsheets/d/' + logSheet.getId();

    // ── Step 3: Set Script Properties ─────────────────────────
    console.log('Step 3: Saving configuration...');
    props.setProperties({
      'AGENT_NAME':         agentName,
      'AGENT_EMAIL':        agentEmail,
      'ADMIN_EMAIL':        adminEmail,
      'WHITELIST_EMAILS':   adminEmail,
      'WAITING_INTERVAL':   String(checkInterval),
      'KNOWLEDGE_BASE_URL': kbUrl,
      'LOG_SHEET_URL':      logUrl
    });

    // ── Step 4: Create Gmail labels ───────────────────────────
    console.log('Step 4: Creating Gmail labels...');
    try {
      GmailApp.createLabel('Maillifier-History');
      GmailApp.createLabel('Filtered/External');
    } catch (e) {
      console.log('Labels may already exist: ' + e.message);
    }

    // ── Step 5: Setup time trigger ────────────────────────────
    console.log('Step 5: Setting up email check trigger...');
    ScriptApp.getProjectTriggers().forEach(function(t) {
      if (t.getHandlerFunction() === 'processEmails') ScriptApp.deleteTrigger(t);
    });
    ScriptApp.newTrigger('processEmails')
      .timeBased()
      .everyMinutes(checkInterval)
      .create();

    // ── Step 6: Send confirmation email ───────────────────────
    console.log('Step 6: Sending confirmation email...');
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
      '\u2705 ' + agentName + ' Agent is ready',
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

    console.log('Setup complete! Confirmation email sent to ' + adminEmail);

  } catch (error) {
    console.error('Setup error: ' + error.message);
    throw error;
  }
}
