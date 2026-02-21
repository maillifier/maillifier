/**
 * INSTALLATION HELPER SCRIPT
 * Run this function once to set up all Script Properties interactively
 */

function setupScriptProperties() {
  const ui = SpreadsheetApp.getUi(); // Works if running from a bound script
  
  console.log("=== AI EMAIL AGENT - PROPERTY SETUP ===");
  
  // Define all required properties
  const properties = {
    'AGENT_NAME': {
      prompt: 'Enter Agent Name (e.g., ResponGen):',
      default: 'AI Assistant',
      required: true
    },
    'GEMINI_API_KEY': {
      prompt: 'Enter your Gemini API Key:',
      default: '',
      required: true,
      sensitive: true
    },
    'KNOWLEDGE_BASE_URL': {
      prompt: 'Enter Knowledge Base Google Doc URL:',
      default: '',
      required: true
    },
    'LOG_SHEET_URL': {
      prompt: 'Enter Log Spreadsheet URL (leave empty to auto-create):',
      default: '',
      required: false
    },
    'WAITING_INTERVAL': {
      prompt: 'Enter checking interval in minutes (1-60):',
      default: '1',
      required: true
    },
    'WHITELIST_EMAILS': {
      prompt: 'Enter authorized emails (comma-separated):',
      default: 'user@example.com',
      required: true
    }
  };
  
  const scriptProperties = PropertiesService.getScriptProperties();
  const results = [];
  
  console.log("\nStarting property configuration...\n");
  
  // Set each property
  for (const [key, config] of Object.entries(properties)) {
    try {
      // Check if property already exists
      const existingValue = scriptProperties.getProperty(key);
      
      if (existingValue) {
        console.log(`✅ ${key}: Already set (${config.sensitive ? '[HIDDEN]' : existingValue})`);
        results.push(`${key}: Existing value kept`);
        continue;
      }
      
      // Use default value (in production, you'd prompt user via UI or CLI)
      const value = config.default;
      
      if (config.required && !value) {
        console.log(`⚠️  ${key}: REQUIRED but not set!`);
        results.push(`${key}: ❌ NOT SET (required)`);
        continue;
      }
      
      if (value) {
        scriptProperties.setProperty(key, value);
        console.log(`✅ ${key}: Set to ${config.sensitive ? '[HIDDEN]' : value}`);
        results.push(`${key}: ✅ Set successfully`);
      } else {
        console.log(`⏭️  ${key}: Skipped (optional)`);
        results.push(`${key}: Skipped`);
      }
      
    } catch (error) {
      console.error(`❌ Error setting ${key}: ${error.message}`);
      results.push(`${key}: ❌ ERROR - ${error.message}`);
    }
  }
  
  console.log("\n=== SETUP SUMMARY ===");
  results.forEach(result => console.log(result));
  
  console.log("\n✅ Script Properties setup complete!");
  console.log("Please verify all properties in Project Settings > Script Properties");
  console.log("\nNext steps:");
  console.log("1. Manually verify/update the properties in Project Settings");
  console.log("2. Run setupTrigger() to activate email processing");
  console.log("3. Test by sending an email from a whitelisted address");
}

/**
 * DIAGNOSTIC FUNCTION
 * Checks all properties and reports their status
 */
function checkConfiguration() {
  console.log("=== CONFIGURATION DIAGNOSTIC ===\n");
  
  const scriptProperties = PropertiesService.getScriptProperties();
  const allProperties = scriptProperties.getProperties();
  
  // Required properties
  const required = [
    'AGENT_NAME',
    'GEMINI_API_KEY',
    'KNOWLEDGE_BASE_URL',
    'WHITELIST_EMAILS',
    'WAITING_INTERVAL'
  ];
  
  console.log("📋 REQUIRED PROPERTIES:");
  required.forEach(key => {
    const value = allProperties[key];
    const status = value ? '✅' : '❌';
    const display = key === 'GEMINI_API_KEY' && value 
      ? `${value.substring(0, 10)}...` 
      : (value || 'NOT SET');
    console.log(`${status} ${key}: ${display}`);
  });
  
  console.log("\n📋 OPTIONAL PROPERTIES:");
  const optional = ['LOG_SHEET_URL'];
  optional.forEach(key => {
    const value = allProperties[key];
    const status = value ? '✅' : '⚠️ ';
    console.log(`${status} ${key}: ${value || 'Not set (will auto-create)'}`);
  });
  
  console.log("\n📋 USER PROMPTS:");
  const userPrompts = Object.keys(allProperties).filter(k => k.startsWith('PROMPT_'));
  if (userPrompts.length === 0) {
    console.log("⚠️  No user prompts configured");
  } else {
    userPrompts.forEach(key => {
      const email = key.replace('PROMPT_', '');
      const value = allProperties[key];
      console.log(`✅ ${email}: ${value ? value.substring(0, 50) + '...' : 'EMPTY'}`);
    });
  }
  
  console.log("\n=== VALIDATION ===");
  
  // Validate whitelist
  const whitelist = allProperties['WHITELIST_EMAILS'];
  if (whitelist) {
    const emails = whitelist.split(',').map(e => e.trim());
    console.log(`✅ Whitelist contains ${emails.length} email(s)`);
    emails.forEach(email => console.log(`   - ${email}`));
  } else {
    console.log("❌ WHITELIST_EMAILS not configured!");
  }
  
  // Validate interval
  const interval = allProperties['WAITING_INTERVAL'];
  if (interval) {
    const num = parseInt(interval);
    if (num >= 1 && num <= 60) {
      console.log(`✅ Waiting interval: ${num} minute(s)`);
    } else {
      console.log(`⚠️  Interval ${num} is outside recommended range (1-60)`);
    }
  }
  
  // Test Knowledge Base access
  console.log("\n=== ACCESS TESTS ===");
  try {
    const kb = GmailManager.getKnowledgeBase();
    if (kb && !kb.includes('unavailable')) {
      console.log(`✅ Knowledge Base accessible (${kb.length} characters)`);
    } else {
      console.log("⚠️  Knowledge Base access issue");
    }
  } catch (e) {
    console.log(`❌ Knowledge Base error: ${e.message}`);
  }
  
  // Test API key format
  const apiKey = allProperties['GEMINI_API_KEY'];
  if (apiKey) {
    if (apiKey.length > 30 && apiKey.startsWith('AIzaSy')) {
      console.log("✅ API Key format looks valid");
    } else {
      console.log("⚠️  API Key format may be incorrect");
    }
  }
  
  console.log("\n=== SUMMARY ===");
  const missingRequired = required.filter(k => !allProperties[k]);
  if (missingRequired.length === 0) {
    console.log("✅ All required properties are set!");
    console.log("Ready to run setupTrigger() and start processing emails.");
  } else {
    console.log(`❌ Missing required properties: ${missingRequired.join(', ')}`);
    console.log("Please set these before running the agent.");
  }
}

/**
 * CLEANUP FUNCTION
 * Removes all Script Properties (use with caution!)
 */
function clearAllProperties() {
  const ui = Browser.msgBox(
    'Clear All Properties',
    'This will DELETE ALL Script Properties. Are you sure?',
    Browser.Buttons.YES_NO
  );
  
  if (ui === 'yes') {
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.deleteAllProperties();
    console.log("✅ All properties cleared");
  } else {
    console.log("⏭️  Cancelled");
  }
}

/**
 * EXAMPLE SETUP
 * Configures properties with example values for testing
 */
function setupExampleConfiguration() {
  const scriptProperties = PropertiesService.getScriptProperties();
  
  const exampleConfig = {
    'AGENT_NAME': 'ResponGen',
    'GEMINI_API_KEY': 'PASTE_YOUR_KEY_HERE',
    'KNOWLEDGE_BASE_URL': 'https://docs.google.com/document/d/YOUR_DOC_ID',
    'LOG_SHEET_URL': '', // Will auto-create
    'WAITING_INTERVAL': '1',
    'WHITELIST_EMAILS': 'your.email@example.com, colleague@example.com'
  };
  
  console.log("=== SETTING UP EXAMPLE CONFIGURATION ===\n");
  
  for (const [key, value] of Object.entries(exampleConfig)) {
    scriptProperties.setProperty(key, value);
    console.log(`✅ ${key}: ${value}`);
  }
  
  console.log("\n⚠️  IMPORTANT: Update these properties with your actual values!");
  console.log("Go to Project Settings > Script Properties to edit.");
}