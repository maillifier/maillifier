/**
 * GeminiAPI.gs - Version 2.11
 * Multimodal support + File Generation (TXT, MD, CSV, PDF, DOCX, XLSX, PNG charts)
 * NEW: PDF to DOCX conversion with formatting preservation
 * FIXED: Cyrillic text detection (regex \b doesn't work with non-ASCII)
 */
const GeminiAPI = {

  generateResponse(currentEmailBody, context, knowledge, ownerName, attachments = []) {
    const apiKey = CONFIG.getApiKey();
    const url = `${CONFIG.GEMINI.ENDPOINT}${CONFIG.GEMINI.MODEL}:generateContent?key=${apiKey}`;

    const hasAttachments = attachments && attachments.length > 0;
    const hasPdfAttachments = hasAttachments && attachments.some(att => att.type === 'PDF');

    const systemPrompt = `SYSTEM INSTRUCTIONS:
You are a professional AI Assistant for ${ownerName}.

YOUR PRIMARY MISSION:
${hasAttachments ? 
  'IMPORTANT: The email includes attached files (images, PDFs, documents, markdown, CSV). Please analyze them carefully and reference specific details in your response.' 
  : 
  'If instructions or notes are provided, translate and refine them into a professional email draft.'}

=========================================
KNOWLEDGE BASE / STRATEGIC RULES:
${knowledge}
=========================================

=========================================
HISTORICAL CONTEXT:
${context}
=========================================

${hasAttachments ? `=========================================
ATTACHED FILES ANALYSIS:
${AttachmentHandler.getAttachmentContext(attachments)}
=========================================` : ''}

=========================================
FILE CREATION CAPABILITY:
You MUST create files using EXACT marker format below. ALL THREE PARTS ARE MANDATORY:

**Text files:**
[CREATE_TXT:filename_without_extension]
[TXT_CONTENT_START]
Content here
[TXT_CONTENT_END]

**Markdown files:**
[CREATE_MD:filename_without_extension]
[MD_CONTENT_START]
# Markdown content here
[MD_CONTENT_END]

**CSV files:**
[CREATE_CSV:filename_without_extension]
[CSV_CONTENT_START]
Header1,Header2,Header3
Value1,Value2,Value3
[CSV_CONTENT_END]

**PDF files:**
[CREATE_PDF:filename_without_extension]
[PDF_CONTENT_START]
Content for PDF
[PDF_CONTENT_END]

**Word documents (from text):**
[CREATE_DOCX:filename_without_extension]
[DOCX_CONTENT_START]
Content for Word
[DOCX_CONTENT_END]

**Excel spreadsheets:**
[CREATE_XLSX:filename_without_extension]
[XLSX_DATA_START]
Header1|Header2|Header3
Row1Col1|Row1Col2|Row1Col3
[XLSX_DATA_END]

**PNG charts:**
[CREATE_CHART:filename_without_extension]
[CHART_CONFIG_START]
{"type":"bar","data":{...}}
[CHART_CONFIG_END]

${hasPdfAttachments ? `
=========================================
PDF TO DOCX CONVERSION CAPABILITY:
When user asks to convert PDF to DOCX/Word format, use this EXACT marker:

[CONVERT_PDF_TO_DOCX:output_filename_without_extension]
[PDF_SOURCE:original_pdf_filename.pdf]

This will:
- Convert the attached PDF to editable Word document
- Preserve formatting, images, and tables
- Export as .docx file

IMPORTANT: Use EXACT original PDF filename from attachments!

Example - if user attached "Report.pdf" and asks to convert:
[CONVERT_PDF_TO_DOCX:Report_converted]
[PDF_SOURCE:Report.pdf]
=========================================` : ''}

CRITICAL FILE CREATION RULES - MUST FOLLOW EXACTLY:
1. ALWAYS use ALL THREE markers: [CREATE_TYPE:name], [TYPE_CONTENT_START], [TYPE_CONTENT_END]
2. NEVER skip [CREATE_TYPE:filename] marker - file will NOT be created without it!
3. ALWAYS close with [TYPE_CONTENT_END] marker - incomplete files are ignored!
4. Place file markers AFTER your main response text
5. Filenames: descriptive, no spaces (use underscores)
6. When user asks for files/attachments - you MUST create them
7. For long documents: include COMPLETE content, do not truncate
8. If content is very long, still include [TYPE_CONTENT_END] at the end
${hasPdfAttachments ? '9. For PDF to DOCX conversion - use [CONVERT_PDF_TO_DOCX:name] with [PDF_SOURCE:filename]' : ''}

EXAMPLES:

User: "Extract PowerShell scripts as txt files"
Response:
I've extracted 2 PowerShell scripts.

[CREATE_TXT:Create_Certificate]
[TXT_CONTENT_START]
# PowerShell script
$password = "STRONG_PASSWORD"
New-SelfSignedCertificate -Subject "CN=Cert"
[TXT_CONTENT_END]

User: "Create documentation in markdown"
Response:
I've prepared the documentation.

[CREATE_MD:API_Documentation]
[MD_CONTENT_START]
# API Documentation

## Authentication
Use Bearer token...

## Endpoints
- GET /api/users
- POST /api/users
[MD_CONTENT_END]

User: "Export data as CSV"
Response:
I've exported the data to CSV format.

[CREATE_CSV:Sales_Data_2026]
[CSV_CONTENT_START]
Month,Revenue,Units
January,50000,1200
February,65000,1500
[CSV_CONTENT_END]

User: "Create a sales chart"
Response:
I've created a bar chart showing quarterly sales.

[CREATE_CHART:Q4_Sales_Chart]
[CHART_CONFIG_START]
{
  "type": "bar",
  "data": {
    "labels": ["Q1", "Q2", "Q3", "Q4"],
    "datasets": [{
      "label": "Revenue ($K)",
      "data": [50, 65, 80, 95],
      "backgroundColor": "rgba(54, 162, 235, 0.5)"
    }]
  },
  "options": {
    "title": {
      "display": true,
      "text": "Quarterly Sales 2026"
    }
  }
}
[CHART_CONFIG_END]

${hasPdfAttachments ? `User: "Convert the PDF to Word document" (with Report.pdf attached)
Response:
I'll convert the PDF document to an editable Word format.

[CONVERT_PDF_TO_DOCX:Report_Word_Version]
[PDF_SOURCE:Report.pdf]

The conversion will preserve the original formatting, images, and tables from the PDF.` : ''}
=========================================

CRITICAL TASK:
1. Read the "CURRENT INCOMING EMAIL" below.
${hasAttachments ? '2. Analyze ALL attached files (images, PDFs, documents, markdown, CSV).\n3. Reference specific details from attachments.' : '2. If it contains instructions, prepare a formal draft.'}
${hasAttachments ? '4' : '3'}. If user requests files/attachments, create them using markers above.
${hasPdfAttachments ? '5. If user asks to convert PDF to DOCX/Word, use [CONVERT_PDF_TO_DOCX] marker.' : ''}
${hasAttachments ? '6' : '4'}. Always mirror the professional tone.
${hasAttachments ? '7' : '5'}. Evaluate your confidence in the output.`;

    const contentParts = [
      {
        text: `${systemPrompt}\n\n=========================================\nCURRENT INCOMING EMAIL TO PROCESS:\n${currentEmailBody}`
      }
    ];

    if (hasAttachments) {
      const attachmentParts = AttachmentHandler.prepareForGemini(attachments);
      contentParts.push(...attachmentParts);
    }

    const payload = {
      contents: [
        {
          role: "user",
          parts: contentParts
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 32768
      }
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    console.log(`Calling Gemini API ${hasAttachments ? 'with ' + attachments.length + ' attachment(s)' : 'without attachments'}`);

    const response = UrlFetchApp.fetch(url, options);
    const responseText = response.getContentText();
    const json = JSON.parse(responseText);

    if (json.error) {
      throw new Error(`Gemini API Error: ${json.error.message}`);
    }

    if (!json.candidates || !json.candidates[0].content || !json.candidates[0].content.parts) {
      throw new Error(`Gemini API Error: No valid response returned. Raw: ${responseText}`);
    }

    const fullText = json.candidates[0].content.parts[0].text;

    const confidenceMatch = fullText.match(/CONFIDENCE:\s*(\d+)%/i);
    const confidence = confidenceMatch ? confidenceMatch[0] : "N/A";

    // Pass attachments to enable PDF conversion
    const responseAttachments = this._generateResponseAttachments(fullText, attachments);
    const cleanedText = this._removeFileMarkers(fullText);

    return {
      text: cleanedText,
      confidence: confidence,
      usage: json.usageMetadata || { totalTokenCount: 0 },
      attachments: responseAttachments
    };
  },

  _generateResponseAttachments(aiText, originalAttachments = []) {
    const attachments = [];

    // Log detection of file markers for debugging
    const fileTypes = ['TXT', 'MD', 'CSV', 'PDF', 'DOCX', 'XLSX'];
    fileTypes.forEach(type => {
      const startTag = type === 'XLSX' ? 'XLSX_DATA_START' : `${type}_CONTENT_START`;
      if (aiText.includes(`[${startTag}]`)) {
        console.log(`Detected [${startTag}] marker in response`);
        const hasCreate = aiText.includes(`[CREATE_${type}:`);
        const endTag = type === 'XLSX' ? 'XLSX_DATA_END' : `${type}_CONTENT_END`;
        const hasEnd = aiText.includes(`[${endTag}]`);
        console.log(`  - CREATE marker: ${hasCreate ? 'YES' : 'NO (will use fallback filename)'}`);
        console.log(`  - END marker: ${hasEnd ? 'YES' : 'NO (will try fallback extraction)'}`);
      }
    });

    // Check if there are PDF attachments available for conversion
    const pdfAttachments = originalAttachments.filter(att => att.type === 'PDF');
    const hasPdfAttachments = pdfAttachments.length > 0;

    // Check for PDF to DOCX conversion marker
    if (aiText.includes('[CONVERT_PDF_TO_DOCX:')) {
      console.log('Detected [CONVERT_PDF_TO_DOCX:] marker in response');
      const conversionMatches = this._extractPdfConversionRequests(aiText);
      
      conversionMatches.forEach(match => {
        console.log(`Processing PDF conversion: ${match.pdfSource} -> ${match.outputName}.docx`);

        // Find the PDF in original attachments
        let pdfAttachment;

        if (match.pdfSource === '*') {
          // Wildcard - use first PDF found
          pdfAttachment = originalAttachments.find(att => att.type === 'PDF');
          if (pdfAttachment) {
            console.log(`Wildcard match: using first PDF found: ${pdfAttachment.name}`);
          }
        } else {
          // Exact match by name
          pdfAttachment = originalAttachments.find(att =>
            att.type === 'PDF' && (
              att.name.toLowerCase() === match.pdfSource.toLowerCase() ||
              att.name.toLowerCase().replace(/\.pdf$/i, '') === match.pdfSource.toLowerCase().replace(/\.pdf$/i, '')
            )
          );
        }

        if (pdfAttachment) {
          console.log(`Found PDF attachment: ${pdfAttachment.name}`);
          const docxBlob = AttachmentHandler.convertPdfAttachmentToDocx(pdfAttachment, match.outputName);

          if (docxBlob) {
            attachments.push(docxBlob);
            console.log(`SUCCESS: Converted ${pdfAttachment.name} to ${match.outputName}.docx`);
          } else {
            console.error(`FAILED: Could not convert ${pdfAttachment.name} to DOCX`);
          }
        } else {
          console.error(`PDF not found in attachments: ${match.pdfSource}`);
          const pdfList = originalAttachments.filter(a => a.type === 'PDF').map(a => a.name);
          console.log(`Available PDF attachments: ${pdfList.length > 0 ? pdfList.join(', ') : 'NONE'}`);
        }
      });
    }

    if (aiText.includes('[CHART_CONFIG_START]')) {
      console.log('Detected [CHART_CONFIG_START] marker');
    }

    // TXT files
    const txtMatches = this._extractFileContent(aiText, 'TXT');
    txtMatches.forEach(match => {
      const blob = AttachmentHandler.createTextFile(match.content, match.filename);
      if (blob) {
        attachments.push(blob);
        console.log(`Generated TXT: ${match.filename}.txt`);
      }
    });

    // MD files
    const mdMatches = this._extractFileContent(aiText, 'MD');
    mdMatches.forEach(match => {
      const blob = AttachmentHandler.createMarkdownFile(match.content, match.filename);
      if (blob) {
        attachments.push(blob);
        console.log(`Generated MD: ${match.filename}.md`);
      }
    });

    // CSV files
    const csvMatches = this._extractFileContent(aiText, 'CSV');
    csvMatches.forEach(match => {
      const blob = AttachmentHandler.createCsvFile(match.content, match.filename);
      if (blob) {
        attachments.push(blob);
        console.log(`Generated CSV: ${match.filename}.csv`);
      }
    });

    // PDF files
    const pdfMatches = this._extractFileContent(aiText, 'PDF');
    pdfMatches.forEach(match => {
      const pdfBlob = AttachmentHandler.generatePdfReport(match.content, match.filename);
      if (pdfBlob) {
        attachments.push(pdfBlob);
        console.log(`Generated PDF: ${match.filename}.pdf`);
      }
    });

    // DOCX files (from content, not conversion)
    const docxMatches = this._extractFileContent(aiText, 'DOCX');
    docxMatches.forEach(match => {
      // Smart fallback: if we have PDF attachments and Gemini is trying to create DOCX
      // from extracted PDF text, use Drive API conversion instead for better quality
      if (hasPdfAttachments && match.content.length > 100) {
        console.log('Detected DOCX creation with PDF available - using Drive API conversion for better quality');
        const pdfToConvert = pdfAttachments[0];
        const docxBlob = AttachmentHandler.convertPdfAttachmentToDocx(pdfToConvert, match.filename);
        if (docxBlob) {
          attachments.push(docxBlob);
          console.log(`Generated DOCX via PDF conversion: ${match.filename}.docx`);
          return; // Skip text-based generation
        }
      }

      // Fallback to text-based DOCX generation
      const docxBlob = AttachmentHandler.generateWordDocument(match.content, match.filename);
      if (docxBlob) {
        attachments.push(docxBlob);
        console.log(`Generated DOCX from text: ${match.filename}.docx`);
      }
    });

    // XLSX files
    const xlsxMatches = this._extractFileContent(aiText, 'XLSX');
    xlsxMatches.forEach(match => {
      const data = match.content.split('\n')
        .filter(line => line.trim())
        .map(line => line.split('|').map(cell => cell.trim()));
      
      if (data.length > 0) {
        const xlsxBlob = AttachmentHandler.generateExcelSpreadsheet(data, match.filename);
        if (xlsxBlob) {
          attachments.push(xlsxBlob);
          console.log(`Generated XLSX: ${match.filename}.xlsx`);
        }
      }
    });

    // PNG charts (via QuickChart.io)
    const chartMatches = this._extractChartConfig(aiText);
    chartMatches.forEach(match => {
      try {
        const chartConfig = JSON.parse(match.content);
        const chartBlob = AttachmentHandler.createChartImage(chartConfig, match.filename);
        if (chartBlob) {
          attachments.push(chartBlob);
          console.log(`Generated Chart PNG: ${match.filename}.png`);
        }
      } catch (error) {
        console.error(`Error parsing chart config: ${error.message}`);
      }
    });

    // Final summary
    console.log(`Total attachments generated: ${attachments.length}`);

    // Ultimate fallback: if no attachments generated but we have PDF and AI mentioned DOCX/Word/document
    if (attachments.length === 0 && hasPdfAttachments) {
      // Extended pattern - using simple includes() for Cyrillic (regex \b doesn't work with non-ASCII)
      const lowerText = aiText.toLowerCase();
      const mentionsDocxEn = /(docx|word|document)/i.test(aiText);
      const mentionsDocxRu = lowerText.includes('документ') || lowerText.includes('конверт') ||
                            lowerText.includes('прикреп') || lowerText.includes('создал') ||
                            lowerText.includes('формат');
      const mentionsDocx = mentionsDocxEn || mentionsDocxRu;

      const hasDocxMarker = aiText.includes('[DOCX_CONTENT_START]') || aiText.includes('[CREATE_DOCX:');

      const mentionsAttachmentEn = /(attached|file)/i.test(aiText);
      const mentionsAttachmentRu = lowerText.includes('прикреплен') || lowerText.includes('вложен') ||
                                   lowerText.includes('файл');
      const mentionsAttachment = mentionsAttachmentEn || mentionsAttachmentRu;

      console.log(`FALLBACK CHECK: mentionsDocx=${mentionsDocx} (en=${mentionsDocxEn}, ru=${mentionsDocxRu})`);
      console.log(`FALLBACK CHECK: hasDocxMarker=${hasDocxMarker}, mentionsAttachment=${mentionsAttachment}`);

      if (mentionsDocx || hasDocxMarker || mentionsAttachment) {
        console.log('FALLBACK: No attachments but PDF available and document/attachment mentioned - auto-converting PDF');
        const pdfToConvert = pdfAttachments[0];
        const fallbackName = pdfToConvert.name.replace(/\.pdf$/i, '_converted');

        console.log(`FALLBACK: Attempting to convert ${pdfToConvert.name} to ${fallbackName}.docx`);
        console.log(`FALLBACK: PDF has originalBlob: ${!!pdfToConvert.originalBlob}, base64: ${!!pdfToConvert.base64}`);

        const docxBlob = AttachmentHandler.convertPdfAttachmentToDocx(pdfToConvert, fallbackName);

        if (docxBlob) {
          attachments.push(docxBlob);
          console.log(`FALLBACK SUCCESS: Auto-converted ${pdfToConvert.name} to ${fallbackName}.docx`);
        } else {
          console.error('FALLBACK FAILED: convertPdfAttachmentToDocx returned null');
        }
      }
    }

    if (attachments.length === 0) {
      // Check if there were any content markers that failed to process
      const hasAnyMarker = fileTypes.some(type => {
        const startTag = type === 'XLSX' ? 'XLSX_DATA_START' : `${type}_CONTENT_START`;
        return aiText.includes(`[${startTag}]`);
      }) || aiText.includes('[CHART_CONFIG_START]') || aiText.includes('[CONVERT_PDF_TO_DOCX:');

      if (hasAnyMarker) {
        console.warn('WARNING: File markers detected but no attachments were generated. Check marker format.');
      }
    }

    return attachments;
  },

  /**
   * Extract PDF to DOCX conversion requests from AI response
   */
  _extractPdfConversionRequests(text) {
    const matches = [];
    
    // Pattern: [CONVERT_PDF_TO_DOCX:output_name] followed by [PDF_SOURCE:filename.pdf]
    const convertPattern = /\[CONVERT_PDF_TO_DOCX:([^\]]+)\]/g;
    const sourcePattern = /\[PDF_SOURCE:([^\]]+)\]/g;
    
    const outputNames = [];
    let match;
    while ((match = convertPattern.exec(text)) !== null) {
      outputNames.push(match[1].trim());
    }
    
    const pdfSources = [];
    while ((match = sourcePattern.exec(text)) !== null) {
      pdfSources.push(match[1].trim());
    }
    
    // Pair them up
    const count = Math.min(outputNames.length, pdfSources.length);
    for (let i = 0; i < count; i++) {
      matches.push({
        outputName: outputNames[i],
        pdfSource: pdfSources[i]
      });
    }
    
    // Fallback: if no PDF_SOURCE but CONVERT_PDF_TO_DOCX exists, 
    // try to find any PDF in the conversation
    if (outputNames.length > 0 && pdfSources.length === 0) {
      console.log('No [PDF_SOURCE:] found, will try to use first available PDF');
      outputNames.forEach(name => {
        matches.push({
          outputName: name,
          pdfSource: '*'  // Wildcard - use first PDF found
        });
      });
    }
    
    return matches;
  },

  _extractFileContent(text, fileType) {
    const matches = [];

    const createPattern = new RegExp(`\\[CREATE_${fileType}:([^\\]]+)\\]`, 'g');
    const contentPattern = new RegExp(
      `\\[${fileType}_CONTENT_START\\]([\\s\\S]*?)\\[${fileType}_CONTENT_END\\]`,
      'g'
    );
    // Fallback pattern for incomplete markers (missing END tag)
    const incompletePattern = new RegExp(
      `\\[${fileType}_CONTENT_START\\]([\\s\\S]*)$`,
      'g'
    );

    if (fileType === 'XLSX') {
      const dataPattern = new RegExp(
        `\\[XLSX_DATA_START\\]([\\s\\S]*?)\\[XLSX_DATA_END\\]`,
        'g'
      );
      const incompleteDataPattern = new RegExp(
        `\\[XLSX_DATA_START\\]([\\s\\S]*)$`,
        'g'
      );

      let createMatch;
      const filenames = [];
      while ((createMatch = createPattern.exec(text)) !== null) {
        filenames.push(createMatch[1].trim());
      }

      let dataMatch;
      let index = 0;
      while ((dataMatch = dataPattern.exec(text)) !== null) {
        matches.push({
          filename: filenames[index] || `spreadsheet_${index + 1}`,
          content: dataMatch[1].trim()
        });
        index++;
      }

      // Fallback: try incomplete pattern if no complete matches found
      if (matches.length === 0) {
        incompleteDataPattern.lastIndex = 0;
        let incompleteMatch = incompleteDataPattern.exec(text);
        if (incompleteMatch && incompleteMatch[1].trim().length > 50) {
          console.log(`Fallback: Found incomplete XLSX content, extracting...`);
          matches.push({
            filename: filenames[0] || `spreadsheet_fallback`,
            content: incompleteMatch[1].trim()
          });
        }
      }
    } else {
      let createMatch;
      const filenames = [];
      while ((createMatch = createPattern.exec(text)) !== null) {
        filenames.push(createMatch[1].trim());
      }

      let contentMatch;
      let index = 0;
      while ((contentMatch = contentPattern.exec(text)) !== null) {
        matches.push({
          filename: filenames[index] || `file_${index + 1}`,
          content: contentMatch[1].trim()
        });
        index++;
      }

      // Fallback: try incomplete pattern if no complete matches found
      if (matches.length === 0) {
        incompletePattern.lastIndex = 0;
        let incompleteMatch = incompletePattern.exec(text);
        if (incompleteMatch && incompleteMatch[1].trim().length > 50) {
          console.log(`Fallback: Found incomplete ${fileType} content, extracting...`);
          // Clean up the content - remove any trailing markers or junk
          let content = incompleteMatch[1].trim();
          // Remove common trailing patterns
          content = content.replace(/\[\/?\w+_CONTENT_\w*\].*$/s, '').trim();
          content = content.replace(/={5,}[\s\S]*$/s, '').trim();

          if (content.length > 50) {
            matches.push({
              filename: filenames[0] || `${fileType.toLowerCase()}_fallback`,
              content: content
            });
          }
        }
      }
    }

    return matches;
  },

  _extractChartConfig(text) {
    const matches = [];
    
    const createPattern = /\[CREATE_CHART:([^\]]+)\]/g;
    const configPattern = /\[CHART_CONFIG_START\]([\s\S]*?)\[CHART_CONFIG_END\]/g;
    
    let createMatch;
    const filenames = [];
    while ((createMatch = createPattern.exec(text)) !== null) {
      filenames.push(createMatch[1].trim());
    }
    
    let configMatch;
    let index = 0;
    while ((configMatch = configPattern.exec(text)) !== null) {
      matches.push({
        filename: filenames[index] || `chart_${index + 1}`,
        content: configMatch[1].trim()
      });
      index++;
    }
    
    return matches;
  },

  _removeFileMarkers(text) {
    let cleaned = text;

    // Complete markers (with both START and END)
    const completePatterns = [
      /\[CREATE_TXT:[^\]]+\]/g,
      /\[TXT_CONTENT_START\][\s\S]*?\[TXT_CONTENT_END\]/g,
      /\[CREATE_MD:[^\]]+\]/g,
      /\[MD_CONTENT_START\][\s\S]*?\[MD_CONTENT_END\]/g,
      /\[CREATE_CSV:[^\]]+\]/g,
      /\[CSV_CONTENT_START\][\s\S]*?\[CSV_CONTENT_END\]/g,
      /\[CREATE_PDF:[^\]]+\]/g,
      /\[PDF_CONTENT_START\][\s\S]*?\[PDF_CONTENT_END\]/g,
      /\[CREATE_DOCX:[^\]]+\]/g,
      /\[DOCX_CONTENT_START\][\s\S]*?\[DOCX_CONTENT_END\]/g,
      /\[CREATE_XLSX:[^\]]+\]/g,
      /\[XLSX_DATA_START\][\s\S]*?\[XLSX_DATA_END\]/g,
      /\[CREATE_CHART:[^\]]+\]/g,
      /\[CHART_CONFIG_START\][\s\S]*?\[CHART_CONFIG_END\]/g,
      // PDF conversion markers
      /\[CONVERT_PDF_TO_DOCX:[^\]]+\]/g,
      /\[PDF_SOURCE:[^\]]+\]/g
    ];

    completePatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    // Incomplete markers (START without END - remove everything from START to end of text)
    const incompletePatterns = [
      /\[TXT_CONTENT_START\][\s\S]*$/g,
      /\[MD_CONTENT_START\][\s\S]*$/g,
      /\[CSV_CONTENT_START\][\s\S]*$/g,
      /\[PDF_CONTENT_START\][\s\S]*$/g,
      /\[DOCX_CONTENT_START\][\s\S]*$/g,
      /\[XLSX_DATA_START\][\s\S]*$/g,
      /\[CHART_CONFIG_START\][\s\S]*$/g
    ];

    incompletePatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

    return cleaned;
  }
};
