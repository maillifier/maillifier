/**
 * MaillifierDeployUpdate.gs — Maillifier Installer & Updater
 *
 * Clones/updates files from the public maillifier GitHub repository
 * into this Apps Script project with SHA-1 integrity verification.
 *
 * This file is preserved across updates and should NOT be deleted.
 *
 * FIRST-TIME SETUP:
 * 1. Create a new Apps Script project at https://script.google.com
 * 2. Go to Project Settings (gear icon):
 *    - Check "Show 'appsscript.json' manifest file in editor"
 * 3. Replace appsscript.json content with:
 *    {
 *      "timeZone": "Etc/UTC",
 *      "dependencies": {},
 *      "exceptionLogging": "STACKDRIVER",
 *      "runtimeVersion": "V8",
 *      "oauthScopes": [
 *        "https://www.googleapis.com/auth/script.projects",
 *        "https://www.googleapis.com/auth/script.external_request"
 *      ]
 *    }
 * 4. Create new script file, paste this code
 * 5. Enable Apps Script API: https://script.google.com/home/usersettings
 *    Toggle "Google Apps Script API" to ON
 * 6. Run installMaillifier()
 *
 * UPDATING:
 *   Run updateMaillifier() to pull latest changes from GitHub.
 *
 * After first install set ADMIN_EMAIL and GEMINI_API_KEY in Script Properties,
 * then run runInitialSetup().
 */

// ————————————————————————————————————————————
// Configuration
// ————————————————————————————————————————————

var DEPLOY_CONFIG = {
  OWNER: 'maillifier',
  REPO: 'maillifier',
  BRANCH: 'main',
  PATH: '',
  SELF_FILENAME: 'MaillifierDeployUpdate'
};


// ————————————————————————————————————————————
// Public functions
// ————————————————————————————————————————————

/**
 * First-time installation. Downloads all files from GitHub,
 * verifies SHA-1 integrity, and deploys to this project.
 */
function installMaillifier() {
  var scriptId = ScriptApp.getScriptId();

  console.log('=== Maillifier Installer ===');
  console.log('Target project: ' + scriptId);
  console.log('Source: https://github.com/' + DEPLOY_CONFIG.OWNER + '/' + DEPLOY_CONFIG.REPO +
    ' (branch: ' + DEPLOY_CONFIG.BRANCH + ')');
  console.log('');

  // Step 1: Fetch file listing from GitHub
  console.log('Step 1: Fetching file list from GitHub...');
  var fileList = fetchFileList_();
  console.log('  Found ' + fileList.length + ' files');

  // Step 2: Download and verify each file
  console.log('Step 2: Downloading and verifying SHA-1...');
  var verifiedFiles = downloadAndVerify_(fileList);

  // Step 3: Deploy to this Apps Script project (merge mode)
  console.log('Step 3: Deploying to Apps Script project...');
  var result = mergeAndDeploy_(scriptId, verifiedFiles);

  console.log('');
  console.log('=== Installation complete ===');
  console.log('  Files installed: ' + result.added.length);
  result.added.forEach(function(n) { console.log('    + ' + n); });
  console.log('  Preserved: ' + DEPLOY_CONFIG.SELF_FILENAME);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Refresh the editor (Ctrl+Shift+R or F5)');
  console.log('  2. Set Script Properties: ADMIN_EMAIL, GEMINI_API_KEY');
  console.log('  3. Open AutoSetup.gs and run: runInitialSetup()');
}

/**
 * Update existing installation. Downloads files from GitHub,
 * verifies SHA-1, and shows what changed before deploying.
 */
function updateMaillifier() {
  var scriptId = ScriptApp.getScriptId();

  console.log('=== Maillifier Updater ===');
  console.log('');

  // Step 1: Fetch current project files
  console.log('Step 1: Reading current project...');
  var currentFiles = fetchProjectFiles_(scriptId);
  console.log('  Current files: ' + currentFiles.length);

  // Step 2: Fetch file listing from GitHub
  console.log('Step 2: Fetching file list from GitHub...');
  var fileList = fetchFileList_();

  // Step 3: Download and verify
  console.log('Step 3: Downloading and verifying SHA-1...');
  var verifiedFiles = downloadAndVerify_(fileList);

  // Step 4: Compare and report changes
  console.log('Step 4: Comparing...');
  var diff = computeDiff_(currentFiles, verifiedFiles);

  if (diff.added.length === 0 && diff.updated.length === 0 && diff.removed.length === 0) {
    console.log('');
    console.log('Already up to date. No changes needed.');
    return;
  }

  console.log('');
  console.log('Changes found:');
  diff.added.forEach(function(n) { console.log('  + NEW:     ' + n); });
  diff.updated.forEach(function(n) { console.log('  ~ UPDATED: ' + n); });
  diff.removed.forEach(function(n) { console.log('  - REMOVED: ' + n); });
  diff.unchanged.forEach(function(n) { console.log('  = unchanged: ' + n); });

  // Step 5: Deploy
  console.log('');
  console.log('Step 5: Deploying updates...');
  mergeAndDeploy_(scriptId, verifiedFiles);

  console.log('');
  console.log('=== Update complete ===');
  console.log('  Added:     ' + diff.added.length);
  console.log('  Updated:   ' + diff.updated.length);
  console.log('  Removed:   ' + diff.removed.length);
  console.log('  Unchanged: ' + diff.unchanged.length);
  console.log('');
  console.log('Refresh the editor (Ctrl+Shift+R or F5) to see changes.');
}


// ————————————————————————————————————————————
// GitHub API
// ————————————————————————————————————————————

function fetchFileList_() {
  var pathSegment = DEPLOY_CONFIG.PATH ? '/' + DEPLOY_CONFIG.PATH : '';
  var url = 'https://api.github.com/repos/' + DEPLOY_CONFIG.OWNER + '/' + DEPLOY_CONFIG.REPO +
    '/contents' + pathSegment + '?ref=' + DEPLOY_CONFIG.BRANCH;

  var response = UrlFetchApp.fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json'
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('GitHub API error (' + response.getResponseCode() + '): ' +
      response.getContentText());
  }

  var items = JSON.parse(response.getContentText());
  return items.filter(function(item) {
    return item.type === 'file' &&
      (item.name.endsWith('.gs') || item.name === 'appsscript.json');
  });
}

function fetchFileContent_(file) {
  // For files under 1 MB the Contents API already returned base64 content
  // and sha directly in the listing — no extra API call needed.
  if (file.content && file.sha) {
    return { content: file.content, sha: file.sha };
  }

  // Fallback: download via raw.githubusercontent.com (no API rate limit)
  // and fetch sha from the already-known listing entry.
  var rawUrl = 'https://raw.githubusercontent.com/' + DEPLOY_CONFIG.OWNER + '/' +
    DEPLOY_CONFIG.REPO + '/' + DEPLOY_CONFIG.BRANCH + '/' +
    (DEPLOY_CONFIG.PATH ? DEPLOY_CONFIG.PATH + '/' : '') + file.name;

  var response = UrlFetchApp.fetch(rawUrl, { muteHttpExceptions: true });

  if (response.getResponseCode() !== 200) {
    throw new Error('Failed to fetch file ' + file.name + ' (' + response.getResponseCode() + ')');
  }

  // Encode as base64 to keep the same contract with downloadAndVerify_
  var contentBytes = response.getBlob().getBytes();
  var base64 = Utilities.base64Encode(contentBytes);
  return { content: base64, sha: file.sha };
}


// ————————————————————————————————————————————
// Download and SHA-1 verification
// ————————————————————————————————————————————

function downloadAndVerify_(fileList) {
  var verified = [];

  for (var i = 0; i < fileList.length; i++) {
    var file = fileList[i];
    var data = fetchFileContent_(file);

    // Decode base64 content from GitHub API
    var base64 = data.content.replace(/\n/g, '');
    var contentBytes = Utilities.base64Decode(base64);
    var content = Utilities.newBlob(contentBytes).getDataAsString('UTF-8');

    // Verify SHA-1 using git blob format
    var computedSha = computeGitBlobSha1_(contentBytes);
    if (computedSha !== data.sha) {
      throw new Error('SHA-1 MISMATCH for ' + file.name +
        '\n  Expected: ' + data.sha +
        '\n  Computed: ' + computedSha);
    }

    console.log('  \u2713 ' + file.name + ' (' + computedSha.substring(0, 10) + '...)');
    verified.push({ name: file.name, content: content, sha: data.sha });
  }

  return verified;
}

function computeGitBlobSha1_(contentBytes) {
  var header = 'blob ' + contentBytes.length + '\0';
  var headerBytes = Utilities.newBlob(header).getBytes();
  var allBytes = headerBytes.concat(contentBytes);
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, allBytes);
  return byteArrayToHex_(digest);
}

function byteArrayToHex_(bytes) {
  return bytes.map(function(b) {
    return ('0' + ((b + 256) % 256).toString(16)).slice(-2);
  }).join('');
}


// ————————————————————————————————————————————
// Apps Script API — read and deploy
// ————————————————————————————————————————————

function fetchProjectFiles_(scriptId) {
  var url = 'https://script.googleapis.com/v1/projects/' + scriptId + '/content';

  var response = UrlFetchApp.fetch(url, {
    headers: {
      'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Failed to read project (' + response.getResponseCode() + '): ' +
      response.getContentText());
  }

  return JSON.parse(response.getContentText()).files || [];
}

function mergeAndDeploy_(scriptId, verifiedFiles) {
  // Scopes required by this deploy/update script
  var DEPLOY_SCOPES = [
    'https://www.googleapis.com/auth/script.projects',
    'https://www.googleapis.com/auth/script.external_request'
  ];

  // Build map of new files from GitHub
  var newFileMap = {};
  var projectFiles = [];

  verifiedFiles.forEach(function(f) {
    var name = f.name.replace(/\.gs$/, '').replace(/\.json$/, '');
    var type = f.name.endsWith('.json') ? 'JSON' : 'SERVER_JS';
    var source = f.content;

    // Merge deploy scopes into appsscript.json
    if (f.name === 'appsscript.json') {
      source = mergeManifestScopes_(source, DEPLOY_SCOPES);
    }

    newFileMap[name] = true;
    projectFiles.push({ name: name, type: type, source: source });
  });

  // Always preserve self (this deploy/update script)
  if (!newFileMap[DEPLOY_CONFIG.SELF_FILENAME]) {
    var currentFiles = fetchProjectFiles_(ScriptApp.getScriptId());
    var selfFile = currentFiles.filter(function(f) {
      return f.name === DEPLOY_CONFIG.SELF_FILENAME;
    })[0];

    if (selfFile) {
      projectFiles.push({
        name: selfFile.name,
        type: selfFile.type,
        source: selfFile.source
      });
    }
  }

  // Deploy
  var url = 'https://script.googleapis.com/v1/projects/' + scriptId + '/content';

  var response = UrlFetchApp.fetch(url, {
    method: 'put',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
    },
    payload: JSON.stringify({ files: projectFiles }),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Apps Script API error (' + response.getResponseCode() + '): ' +
      response.getContentText());
  }

  console.log('  Project updated successfully');

  // Return list of added files for logging
  var added = verifiedFiles.map(function(f) {
    return f.name;
  });
  return { added: added };
}


// ————————————————————————————————————————————
// Diff
// ————————————————————————————————————————————

function computeDiff_(currentProjectFiles, verifiedGitHubFiles) {
  // Build source hash map from current project
  var currentMap = {};
  currentProjectFiles.forEach(function(f) {
    if (f.name === DEPLOY_CONFIG.SELF_FILENAME) return;
    if (f.type === 'JSON' && f.name === 'appsscript') {
      currentMap['appsscript.json'] = f.source;
    } else if (f.type === 'SERVER_JS') {
      currentMap[f.name + '.gs'] = f.source;
    }
  });

  var added = [];
  var updated = [];
  var unchanged = [];
  var visitedCurrent = {};

  verifiedGitHubFiles.forEach(function(gf) {
    visitedCurrent[gf.name] = true;
    if (!(gf.name in currentMap)) {
      added.push(gf.name);
    } else if (currentMap[gf.name] !== gf.content) {
      updated.push(gf.name);
    } else {
      unchanged.push(gf.name);
    }
  });

  var removed = [];
  Object.keys(currentMap).forEach(function(name) {
    if (!visitedCurrent[name]) {
      removed.push(name);
    }
  });

  return { added: added, updated: updated, unchanged: unchanged, removed: removed };
}


// ————————————————————————————————————————————
// Helpers
// ————————————————————————————————————————————

function mergeManifestScopes_(manifestJson, extraScopes) {
  var manifest = JSON.parse(manifestJson);
  var scopes = manifest.oauthScopes || [];

  extraScopes.forEach(function(s) {
    if (scopes.indexOf(s) === -1) {
      scopes.push(s);
    }
  });

  manifest.oauthScopes = scopes;
  return JSON.stringify(manifest, null, 2);
}