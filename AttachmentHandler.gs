/**
 * AttachmentHandler.gs - Version 2.9
 * Full support for: Images, PDF, Word, Excel, Markdown, CSV
 * File Generation: TXT, MD, CSV, PDF, DOCX, XLSX, SVG, PNG (charts)
 * NEW: PDF to DOCX conversion with formatting and images preservation
 * FIXED: Added extensive debug logging for PDF conversion troubleshooting
 */
const AttachmentHandler = {

  SUPPORTED_TYPES: {
    IMAGES: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
    PDF: ['application/pdf'],
    WORD: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
    EXCEL: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
    MARKDOWN: ['text/markdown', 'text/x-markdown', 'text/plain'],
    CSV: ['text/csv', 'text/comma-separated-values', 'application/csv']
  },

  MAX_FILE_SIZE: 10 * 1024 * 1024,
  TEMP_FOLDER_NAME: 'AI_Agent_Temp_Files',

  processIncomingAttachments(message) {
    const attachments = message.getAttachments();
    const processed = [];

    if (!attachments || attachments.length === 0) return processed;

    console.log(`Processing ${attachments.length} attachment(s)`);

    attachments.forEach((attachment, index) => {
      try {
        const contentType = attachment.getContentType();
        const size = attachment.getSize();
        const name = attachment.getName();

        if (!this._isSupportedType(contentType, name)) {
          console.log(`Skipping unsupported type: ${contentType} (${name})`);
          return;
        }

        if (size > this.MAX_FILE_SIZE) {
          console.log(`Skipping large file: ${name} (${size} bytes)`);
          return;
        }

        const fileType = this._getFileCategory(contentType, name);
        let processedItem = null;

        switch (fileType) {
          case 'IMAGE':
          case 'PDF':
            processedItem = this._processImageOrPdf(attachment, contentType, name, size);
            break;
          case 'WORD':
            processedItem = this._processWord(attachment, name, size);
            break;
          case 'EXCEL':
            processedItem = this._processExcel(attachment, name, size);
            break;
          case 'MARKDOWN':
            processedItem = this._processMarkdown(attachment, name, size);
            break;
          case 'CSV':
            processedItem = this._processCsv(attachment, name, size);
            break;
        }

        if (processedItem) {
          processed.push(processedItem);
          console.log(`Processed: ${name} (${fileType})`);
        }

      } catch (error) {
        console.error(`Error processing attachment ${index}: ${error.message}`);
      }
    });

    return processed;
  },

  _processImageOrPdf(attachment, contentType, name, size) {
    const blob = attachment.copyBlob();
    const base64Data = Utilities.base64Encode(blob.getBytes());

    return {
      name: name,
      contentType: contentType,
      size: size,
      base64: base64Data,
      type: this._getFileCategory(contentType, name),
      textContent: null,
      images: null,
      tables: null,
      // Store original blob for PDF conversion
      originalBlob: blob
    };
  },

  _processWord(attachment, name, size) {
    try {
      console.log(`Converting Word document with images: ${name}`);

      const blob = attachment.copyBlob();
      const tempFolder = this._getTempFolder();

      const file = Drive.Files.insert(
        {
          title: name,
          mimeType: 'application/vnd.google-apps.document',
          parents: [{ id: tempFolder.getId() }]
        },
        blob,
        { convert: true }
      );

      const doc = DocumentApp.openById(file.id);
      const body = doc.getBody();

      const textContent = body.getText();
      const images = this._extractImagesFromDoc(body);
      const tables = this._extractTablesFromDoc(body);

      Drive.Files.remove(file.id);

      console.log(`Extracted from Word: ${textContent.length} chars, ${images.length} image(s), ${tables.length} table(s)`);

      return {
        name: name,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: size,
        base64: null,
        type: 'WORD',
        textContent: textContent,
        images: images,
        tables: tables,
        hasVisualContent: images.length > 0 || tables.length > 0
      };

    } catch (error) {
      console.error(`Error processing Word document: ${error.message}`);
      return null;
    }
  },

  _extractImagesFromDoc(body) {
    const images = [];

    try {
      const inlineImages = body.getImages();

      inlineImages.forEach((image, index) => {
        try {
          const blob = image.getBlob();
          const base64Data = Utilities.base64Encode(blob.getBytes());
          const contentType = blob.getContentType();

          images.push({
            index: index,
            contentType: contentType,
            base64: base64Data,
            width: image.getWidth(),
            height: image.getHeight(),
            altText: image.getAltDescription() || `Image ${index + 1}`
          });

          console.log(`Extracted image ${index + 1}: ${contentType}, ${blob.getBytes().length} bytes`);
        } catch (error) {
          console.error(`Error extracting image ${index}: ${error.message}`);
        }
      });

    } catch (error) {
      console.error(`Error getting images from document: ${error.message}`);
    }

    return images;
  },

  _extractTablesFromDoc(body) {
    const tables = [];

    try {
      const numChildren = body.getNumChildren();

      for (let i = 0; i < numChildren; i++) {
        const child = body.getChild(i);

        if (child.getType() === DocumentApp.ElementType.TABLE) {
          const table = child.asTable();
          const tableData = this._formatTableData(table);

          tables.push({
            index: tables.length,
            rows: table.getNumRows(),
            formattedText: tableData
          });

          console.log(`Extracted table ${tables.length}: ${table.getNumRows()} rows`);
        }
      }

    } catch (error) {
      console.error(`Error extracting tables: ${error.message}`);
    }

    return tables;
  },

  _formatTableData(table) {
    const numRows = table.getNumRows();
    let formatted = '\n[TABLE]\n';

    for (let row = 0; row < numRows; row++) {
      const tableRow = table.getRow(row);
      const numCells = tableRow.getNumCells();
      const cells = [];

      for (let cell = 0; cell < numCells; cell++) {
        const cellText = tableRow.getCell(cell).getText().trim();
        cells.push(cellText || '-');
      }

      formatted += cells.join(' | ') + '\n';

      if (row === 0) {
        formatted += cells.map(() => '---').join(' | ') + '\n';
      }
    }

    formatted += '[/TABLE]\n';
    return formatted;
  },

  _processExcel(attachment, name, size) {
    try {
      console.log(`Converting Excel spreadsheet: ${name}`);

      const blob = attachment.copyBlob();
      const tempFolder = this._getTempFolder();

      const file = Drive.Files.insert(
        {
          title: name,
          mimeType: 'application/vnd.google-apps.spreadsheet',
          parents: [{ id: tempFolder.getId() }]
        },
        blob,
        { convert: true }
      );

      const spreadsheet = SpreadsheetApp.openById(file.id);
      const textContent = this._extractSheetsData(spreadsheet);

      Drive.Files.remove(file.id);

      console.log(`Extracted ${textContent.length} characters from Excel spreadsheet`);

      return {
        name: name,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: size,
        base64: null,
        type: 'EXCEL',
        textContent: textContent,
        images: null,
        tables: null
      };

    } catch (error) {
      console.error(`Error processing Excel spreadsheet: ${error.message}`);
      return null;
    }
  },

  _extractSheetsData(spreadsheet) {
    const sheets = spreadsheet.getSheets();
    let textContent = '';

    sheets.forEach(sheet => {
      const sheetName = sheet.getName();
      const data = sheet.getDataRange().getValues();

      textContent += `\n[SHEET: ${sheetName}]\n`;

      data.forEach((row, rowIndex) => {
        const rowText = row.map(cell => String(cell).trim()).join(' | ');
        textContent += rowText + '\n';

        if (rowIndex === 0) {
          textContent += row.map(() => '---').join(' | ') + '\n';
        }
      });

      textContent += `[/SHEET: ${sheetName}]\n`;
    });

    return textContent;
  },

  _processMarkdown(attachment, name, size) {
    try {
      const blob = attachment.copyBlob();
      const textContent = blob.getDataAsString('UTF-8');

      console.log(`Processed Markdown: ${name} (${textContent.length} chars)`);

      return {
        name: name,
        contentType: 'text/markdown',
        size: size,
        base64: null,
        type: 'MARKDOWN',
        textContent: textContent,
        images: null,
        tables: null
      };

    } catch (error) {
      console.error(`Error processing Markdown: ${error.message}`);
      return null;
    }
  },

  _processCsv(attachment, name, size) {
    try {
      const blob = attachment.copyBlob();
      const csvContent = blob.getDataAsString('UTF-8');

      const lines = csvContent.split('\n').filter(line => line.trim());
      const parsedData = lines.map(line => this._parseCsvLine(line));

      let formattedText = '\n[CSV DATA]\n';
      parsedData.forEach((row, index) => {
        formattedText += row.join(' | ') + '\n';
        if (index === 0) {
          formattedText += row.map(() => '---').join(' | ') + '\n';
        }
      });
      formattedText += '[/CSV DATA]\n';

      console.log(`Processed CSV: ${name} (${parsedData.length} rows)`);

      return {
        name: name,
        contentType: 'text/csv',
        size: size,
        base64: null,
        type: 'CSV',
        textContent: formattedText,
        csvData: parsedData,
        images: null,
        tables: null
      };

    } catch (error) {
      console.error(`Error processing CSV: ${error.message}`);
      return null;
    }
  },

  _parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"' && inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  },

  _isSupportedType(contentType, filename) {
    const allTypes = [
      ...this.SUPPORTED_TYPES.IMAGES,
      ...this.SUPPORTED_TYPES.PDF,
      ...this.SUPPORTED_TYPES.WORD,
      ...this.SUPPORTED_TYPES.EXCEL,
      ...this.SUPPORTED_TYPES.MARKDOWN,
      ...this.SUPPORTED_TYPES.CSV
    ];

    if (allTypes.includes(contentType)) return true;

    const ext = filename.toLowerCase().split('.').pop();
    const supportedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'md', 'markdown', 'csv'];

    return supportedExtensions.includes(ext);
  },

  _getFileCategory(contentType, filename) {
    if (this.SUPPORTED_TYPES.IMAGES.includes(contentType)) return 'IMAGE';
    if (this.SUPPORTED_TYPES.PDF.includes(contentType)) return 'PDF';
    if (this.SUPPORTED_TYPES.WORD.includes(contentType)) return 'WORD';
    if (this.SUPPORTED_TYPES.EXCEL.includes(contentType)) return 'EXCEL';
    if (this.SUPPORTED_TYPES.CSV.includes(contentType)) return 'CSV';

    const ext = filename.toLowerCase().split('.').pop();

    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'IMAGE';
    if (ext === 'pdf') return 'PDF';
    if (['doc', 'docx'].includes(ext)) return 'WORD';
    if (['xls', 'xlsx'].includes(ext)) return 'EXCEL';
    if (['md', 'markdown'].includes(ext)) return 'MARKDOWN';
    if (ext === 'csv') return 'CSV';

    if (this.SUPPORTED_TYPES.MARKDOWN.includes(contentType)) return 'MARKDOWN';

    return 'UNKNOWN';
  },

  _getTempFolder() {
    const folders = DriveApp.getFoldersByName(this.TEMP_FOLDER_NAME);

    if (folders.hasNext()) {
      return folders.next();
    }

    return DriveApp.createFolder(this.TEMP_FOLDER_NAME);
  },

  prepareForGemini(attachments) {
    const parts = [];

    attachments.forEach(att => {
      if (att.base64) {
        parts.push({
          inline_data: {
            mime_type: att.contentType,
            data: att.base64
          }
        });
      }

      if (att.textContent) {
        parts.push({
          text: `\n[CONTENT FROM ${att.name}]:\n${att.textContent}\n[END OF ${att.name}]\n`
        });
      }

      if (att.images && att.images.length > 0) {
        att.images.forEach(img => {
          parts.push({
            inline_data: {
              mime_type: img.contentType,
              data: img.base64
            }
          });

          parts.push({
            text: `[Image from ${att.name}: ${img.altText}, dimensions: ${img.width}x${img.height}]`
          });
        });
      }

      if (att.tables && att.tables.length > 0) {
        att.tables.forEach(table => {
          parts.push({
            text: table.formattedText
          });
        });
      }
    });

    return parts;
  },

  createAttachment(filename, content, mimeType) {
    try {
      const blob = Utilities.newBlob(content, mimeType, filename);
      console.log(`Created attachment: ${filename} (${mimeType})`);
      return blob;
    } catch (error) {
      console.error(`Error creating attachment: ${error.message}`);
      return null;
    }
  },

  createTextFile(content, filename) {
    try {
      const blob = Utilities.newBlob(content, 'text/plain', `${filename}.txt`);
      console.log(`Created text file: ${filename}.txt`);
      return blob;
    } catch (error) {
      console.error(`Error creating text file: ${error.message}`);
      return null;
    }
  },

  /**
   * Creates a Markdown file (.md)
   * @param {string} content - Markdown content
   * @param {string} filename - Name without extension
   * @returns {GoogleAppsScript.Base.Blob} - MD blob
   */
  createMarkdownFile(content, filename) {
    try {
      const blob = Utilities.newBlob(content, 'text/markdown', `${filename}.md`);
      console.log(`Created Markdown file: ${filename}.md`);
      return blob;
    } catch (error) {
      console.error(`Error creating Markdown file: ${error.message}`);
      return null;
    }
  },

  /**
   * Creates a CSV file
   * @param {Array|string} data - 2D array or CSV string
   * @param {string} filename - Name without extension
   * @returns {GoogleAppsScript.Base.Blob} - CSV blob
   */
  createCsvFile(data, filename) {
    try {
      let csvContent;

      if (typeof data === 'string') {
        csvContent = data;
      } else if (Array.isArray(data)) {
        csvContent = data.map(row => {
          return row.map(cell => {
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          }).join(',');
        }).join('\n');
      } else {
        throw new Error('Data must be string or 2D array');
      }

      const blob = Utilities.newBlob(csvContent, 'text/csv', `${filename}.csv`);
      console.log(`Created CSV file: ${filename}.csv`);
      return blob;
    } catch (error) {
      console.error(`Error creating CSV file: ${error.message}`);
      return null;
    }
  },

  /**
   * Creates PNG chart using QuickChart.io API
   * @param {Object} chartConfig - Chart.js configuration
   * @param {string} filename - Name without extension
   * @returns {GoogleAppsScript.Base.Blob} - PNG blob
   */
  createChartImage(chartConfig, filename) {
    try {
      const url = 'https://quickchart.io/chart';

      const payload = {
        chart: chartConfig,
        width: 800,
        height: 600,
        backgroundColor: 'white'
      };

      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(url, options);

      if (response.getResponseCode() === 200) {
        const imageBlob = response.getBlob();
        imageBlob.setName(`${filename}.png`);
        console.log(`Created chart image: ${filename}.png`);
        return imageBlob;
      } else {
        console.error(`QuickChart API error: ${response.getContentText()}`);
        return null;
      }

    } catch (error) {
      console.error(`Error creating chart image: ${error.message}`);
      return null;
    }
  },

  /**
   * Generates PDF report from text content
   * @param {string} content - Text content for PDF
   * @param {string} title - Document title (used as filename)
   * @returns {GoogleAppsScript.Base.Blob} - PDF blob
   */
  generatePdfReport(content, title) {
    try {
      const doc = DocumentApp.create(title);
      const body = doc.getBody();
      body.setText(content);
      doc.saveAndClose();

      const docId = doc.getId();
      const pdfBlob = DocumentApp.openById(docId).getAs('application/pdf');
      pdfBlob.setName(`${title}.pdf`);

      DriveApp.getFileById(docId).setTrashed(true);

      console.log(`Generated PDF: ${title}.pdf`);
      return pdfBlob;

    } catch (error) {
      console.error(`Error generating PDF: ${error.message}`);
      return null;
    }
  },

  /**
   * Generates Word document (.docx) from text content
   * FIXED: Uses Drive API URL export instead of getAs() which doesn't work for fresh docs
   * @param {string} content - Text content for document
   * @param {string} title - Document title (used as filename)
   * @returns {GoogleAppsScript.Base.Blob} - DOCX blob
   */
  generateWordDocument(content, title) {
    try {
      const doc = DocumentApp.create(title);
      const body = doc.getBody();
      body.setText(content);
      doc.saveAndClose();

      const docId = doc.getId();

      // Use Drive API URL export instead of getAs()
      const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=docx`;
      const token = ScriptApp.getOAuthToken();

      const response = UrlFetchApp.fetch(exportUrl, {
        headers: {
          'Authorization': 'Bearer ' + token
        },
        muteHttpExceptions: true
      });

      if (response.getResponseCode() !== 200) {
        throw new Error(`Export failed with code ${response.getResponseCode()}: ${response.getContentText()}`);
      }

      const docxBlob = response.getBlob();
      docxBlob.setName(`${title}.docx`);

      // Clean up temporary Google Doc
      DriveApp.getFileById(docId).setTrashed(true);

      console.log(`Generated Word document: ${title}.docx`);
      return docxBlob;

    } catch (error) {
      console.error(`Error generating Word document: ${error.message}`);
      return null;
    }
  },

  /**
   * NEW: Converts PDF to DOCX preserving formatting and images
   * Uses Google Drive OCR to convert PDF to Google Doc, then exports as DOCX
   * This method preserves:
   * - Text with basic formatting (headings, paragraphs)
   * - Images (when Google can extract them)
   * - Tables (basic structure)
   * - Document layout
   * 
   * @param {GoogleAppsScript.Base.Blob} pdfBlob - PDF file blob
   * @param {string} filename - Output filename without extension
   * @returns {GoogleAppsScript.Base.Blob} - DOCX blob or null if conversion fails
   */
  convertPdfToDocx(pdfBlob, filename) {
    let tempDocId = null;

    try {
      console.log(`convertPdfToDocx called with filename: ${filename}`);

      if (!pdfBlob) {
        throw new Error('pdfBlob is null or undefined');
      }

      const blobBytes = pdfBlob.getBytes();
      console.log(`  - pdfBlob size: ${blobBytes.length} bytes`);
      console.log(`  - pdfBlob contentType: ${pdfBlob.getContentType()}`);
      console.log(`  - pdfBlob name: ${pdfBlob.getName()}`);

      if (blobBytes.length === 0) {
        throw new Error('pdfBlob is empty (0 bytes)');
      }

      const tempFolder = this._getTempFolder();
      console.log(`  - tempFolder: ${tempFolder.getName()} (${tempFolder.getId()})`);
      
      // Step 1: Upload PDF to Google Drive with OCR conversion to Google Doc
      // This is the key - Google's OCR preserves formatting and images
      const uploadedFile = Drive.Files.insert(
        {
          title: filename + '_temp_conversion',
          mimeType: 'application/vnd.google-apps.document',
          parents: [{ id: tempFolder.getId() }]
        },
        pdfBlob,
        {
          convert: true,  // Enable OCR conversion
          ocr: true       // Explicitly enable OCR
        }
      );
      
      tempDocId = uploadedFile.id;
      console.log(`PDF uploaded and converted to Google Doc: ${tempDocId}`);
      
      // Step 2: Wait a moment for Google to process
      Utilities.sleep(2000);
      
      // Step 3: Export directly as DOCX using Drive API URL
      const exportUrl = `https://docs.google.com/document/d/${tempDocId}/export?format=docx`;
      const token = ScriptApp.getOAuthToken();
      
      const response = UrlFetchApp.fetch(exportUrl, {
        headers: {
          'Authorization': 'Bearer ' + token
        },
        muteHttpExceptions: true
      });
      
      if (response.getResponseCode() !== 200) {
        throw new Error(`DOCX export failed: ${response.getResponseCode()} - ${response.getContentText()}`);
      }
      
      const docxBlob = response.getBlob();
      docxBlob.setName(`${filename}.docx`);
      
      // Step 4: Clean up temporary Google Doc
      try {
        Drive.Files.remove(tempDocId);
        console.log(`Cleaned up temporary file: ${tempDocId}`);
      } catch (cleanupError) {
        console.warn(`Could not delete temp file: ${cleanupError.message}`);
        // Try to trash it instead
        try {
          DriveApp.getFileById(tempDocId).setTrashed(true);
        } catch (e) {
          // Ignore
        }
      }
      
      console.log(`Successfully converted PDF to DOCX: ${filename}.docx`);
      return docxBlob;
      
    } catch (error) {
      console.error(`Error converting PDF to DOCX: ${error.message}`);
      
      // Clean up on error
      if (tempDocId) {
        try {
          Drive.Files.remove(tempDocId);
        } catch (e) {
          try {
            DriveApp.getFileById(tempDocId).setTrashed(true);
          } catch (e2) {
            // Ignore cleanup errors
          }
        }
      }
      
      return null;
    }
  },

  /**
   * NEW: Converts PDF to DOCX from base64 encoded PDF
   * Convenience method for use with processed attachments
   * 
   * @param {string} base64Data - Base64 encoded PDF content
   * @param {string} filename - Output filename without extension
   * @returns {GoogleAppsScript.Base.Blob} - DOCX blob or null if conversion fails
   */
  convertPdfBase64ToDocx(base64Data, filename) {
    try {
      const pdfBytes = Utilities.base64Decode(base64Data);
      const pdfBlob = Utilities.newBlob(pdfBytes, 'application/pdf', filename + '.pdf');
      return this.convertPdfToDocx(pdfBlob, filename);
    } catch (error) {
      console.error(`Error converting base64 PDF to DOCX: ${error.message}`);
      return null;
    }
  },

  /**
   * NEW: Converts PDF to DOCX from attachment object
   * Handles attachments processed by processIncomingAttachments
   * 
   * @param {Object} attachment - Processed attachment with base64 data
   * @param {string} outputFilename - Optional output filename (defaults to original name without .pdf)
   * @returns {GoogleAppsScript.Base.Blob} - DOCX blob or null if conversion fails
   */
  convertPdfAttachmentToDocx(attachment, outputFilename) {
    try {
      console.log(`convertPdfAttachmentToDocx called for: ${attachment.name}`);
      console.log(`  - attachment.type: ${attachment.type}`);
      console.log(`  - attachment.contentType: ${attachment.contentType}`);
      console.log(`  - has originalBlob: ${!!attachment.originalBlob}`);
      console.log(`  - has base64: ${!!attachment.base64}`);
      console.log(`  - outputFilename: ${outputFilename}`);

      if (attachment.type !== 'PDF' && !attachment.contentType.includes('pdf')) {
        throw new Error(`Attachment is not a PDF (type=${attachment.type}, contentType=${attachment.contentType})`);
      }

      const filename = outputFilename || attachment.name.replace(/\.pdf$/i, '');
      console.log(`  - Using filename: ${filename}`);

      // Check if we have original blob stored
      if (attachment.originalBlob) {
        console.log('  - Using originalBlob for conversion');
        return this.convertPdfToDocx(attachment.originalBlob, filename);
      }

      // Otherwise use base64 data
      if (attachment.base64) {
        console.log(`  - Using base64 data for conversion (length: ${attachment.base64.length})`);
        return this.convertPdfBase64ToDocx(attachment.base64, filename);
      }

      throw new Error('No PDF data available in attachment (no originalBlob and no base64)');

    } catch (error) {
      console.error(`Error converting PDF attachment to DOCX: ${error.message}`);
      console.error(`  Stack: ${error.stack}`);
      return null;
    }
  },

  /**
   * NEW: Advanced Word document generation with formatting
   * Creates DOCX with headings, paragraphs, and basic styling
   * 
   * @param {Array} contentBlocks - Array of content blocks with type and text
   *   Format: [{type: 'heading1'|'heading2'|'paragraph'|'list', text: 'content'}]
   * @param {string} title - Document title (used as filename)
   * @returns {GoogleAppsScript.Base.Blob} - DOCX blob
   */
  generateFormattedWordDocument(contentBlocks, title) {
    let tempDocId = null;
    
    try {
      const doc = DocumentApp.create(title);
      const body = doc.getBody();
      
      contentBlocks.forEach(block => {
        switch (block.type) {
          case 'heading1':
            const h1 = body.appendParagraph(block.text);
            h1.setHeading(DocumentApp.ParagraphHeading.HEADING1);
            break;
            
          case 'heading2':
            const h2 = body.appendParagraph(block.text);
            h2.setHeading(DocumentApp.ParagraphHeading.HEADING2);
            break;
            
          case 'heading3':
            const h3 = body.appendParagraph(block.text);
            h3.setHeading(DocumentApp.ParagraphHeading.HEADING3);
            break;
            
          case 'list':
            if (Array.isArray(block.items)) {
              block.items.forEach(item => {
                const listItem = body.appendListItem(item);
                listItem.setGlyphType(DocumentApp.GlyphType.BULLET);
              });
            } else {
              const listItem = body.appendListItem(block.text);
              listItem.setGlyphType(DocumentApp.GlyphType.BULLET);
            }
            break;
            
          case 'numberedList':
            if (Array.isArray(block.items)) {
              block.items.forEach(item => {
                const listItem = body.appendListItem(item);
                listItem.setGlyphType(DocumentApp.GlyphType.NUMBER);
              });
            } else {
              const listItem = body.appendListItem(block.text);
              listItem.setGlyphType(DocumentApp.GlyphType.NUMBER);
            }
            break;
            
          case 'table':
            if (block.data && Array.isArray(block.data)) {
              const table = body.appendTable(block.data);
              // Style header row
              if (block.data.length > 0) {
                const headerRow = table.getRow(0);
                for (let i = 0; i < headerRow.getNumCells(); i++) {
                  headerRow.getCell(i).setBackgroundColor('#f0f0f0');
                }
              }
            }
            break;
            
          case 'pageBreak':
            body.appendPageBreak();
            break;
            
          case 'horizontalRule':
            body.appendHorizontalRule();
            break;
            
          default: // 'paragraph' or unknown
            body.appendParagraph(block.text || '');
        }
      });
      
      doc.saveAndClose();
      tempDocId = doc.getId();
      
      // Export as DOCX
      const exportUrl = `https://docs.google.com/document/d/${tempDocId}/export?format=docx`;
      const token = ScriptApp.getOAuthToken();
      
      const response = UrlFetchApp.fetch(exportUrl, {
        headers: {
          'Authorization': 'Bearer ' + token
        },
        muteHttpExceptions: true
      });
      
      if (response.getResponseCode() !== 200) {
        throw new Error(`Export failed: ${response.getResponseCode()}`);
      }
      
      const docxBlob = response.getBlob();
      docxBlob.setName(`${title}.docx`);
      
      // Clean up
      DriveApp.getFileById(tempDocId).setTrashed(true);
      
      console.log(`Generated formatted Word document: ${title}.docx`);
      return docxBlob;
      
    } catch (error) {
      console.error(`Error generating formatted Word document: ${error.message}`);
      
      if (tempDocId) {
        try {
          DriveApp.getFileById(tempDocId).setTrashed(true);
        } catch (e) {
          // Ignore
        }
      }
      
      return null;
    }
  },

  /**
   * Generates Excel spreadsheet (.xlsx) from 2D array data
   * FIXED: Uses Drive API URL export instead of getAs() which doesn't work for fresh sheets
   * @param {Array} data - 2D array of data
   * @param {string} title - Spreadsheet title (used as filename)
   * @returns {GoogleAppsScript.Base.Blob} - XLSX blob
   */
  generateExcelSpreadsheet(data, title) {
    try {
      const spreadsheet = SpreadsheetApp.create(title);
      const sheet = spreadsheet.getActiveSheet();

      if (data && data.length > 0) {
        sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
      }

      // Force save
      SpreadsheetApp.flush();

      const spreadsheetId = spreadsheet.getId();

      // Use Drive API URL export instead of getAs()
      const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
      const token = ScriptApp.getOAuthToken();

      const response = UrlFetchApp.fetch(exportUrl, {
        headers: {
          'Authorization': 'Bearer ' + token
        },
        muteHttpExceptions: true
      });

      if (response.getResponseCode() !== 200) {
        throw new Error(`Export failed with code ${response.getResponseCode()}: ${response.getContentText()}`);
      }

      const xlsxBlob = response.getBlob();
      xlsxBlob.setName(`${title}.xlsx`);

      // Clean up temporary spreadsheet
      DriveApp.getFileById(spreadsheetId).setTrashed(true);

      console.log(`Generated Excel spreadsheet: ${title}.xlsx`);
      return xlsxBlob;

    } catch (error) {
      console.error(`Error generating Excel spreadsheet: ${error.message}`);
      return null;
    }
  },

  getAttachmentContext(attachments) {
    if (!attachments || attachments.length === 0) {
      return "";
    }

    const summary = attachments.map(att => {
      let desc = `- ${att.name} (${att.type})`;
      if (att.textContent) {
        desc += ` - ${att.textContent.length} characters extracted`;
      }
      if (att.images && att.images.length > 0) {
        desc += `, ${att.images.length} image(s)`;
      }
      if (att.tables && att.tables.length > 0) {
        desc += `, ${att.tables.length} table(s)`;
      }
      if (att.csvData) {
        desc += `, ${att.csvData.length} rows`;
      }
      return desc;
    }).join('\n');

    return `\nATTACHED FILES:\n${summary}\n\nPlease analyze the attached files and reference them in your response where relevant.`;
  },

  cleanupTempFiles() {
    try {
      const folder = this._getTempFolder();
      const files = folder.getFiles();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      let deletedCount = 0;
      while (files.hasNext()) {
        const file = files.next();
        if (file.getLastUpdated() < oneDayAgo) {
          file.setTrashed(true);
          deletedCount++;
        }
      }

      console.log(`Cleaned up ${deletedCount} temporary file(s)`);

    } catch (error) {
      console.error(`Error cleaning temp files: ${error.message}`);
    }
  }
};

function setupTempFileCleanup() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'cleanupTempFiles') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('cleanupTempFiles')
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();

  console.log('Temp file cleanup trigger created (runs daily at 3 AM)');
}

function cleanupTempFiles() {
  AttachmentHandler.cleanupTempFiles();
}

// Test function for PDF to DOCX conversion
function testPdfToDocxConversion() {
  console.log('=== Testing PDF to DOCX Conversion ===');
  
  // Test with a simple PDF from Drive
  const testFiles = DriveApp.searchFiles('mimeType = "application/pdf"');
  
  if (testFiles.hasNext()) {
    const pdfFile = testFiles.next();
    console.log(`Testing with: ${pdfFile.getName()}`);
    
    const pdfBlob = pdfFile.getBlob();
    const docxBlob = AttachmentHandler.convertPdfToDocx(pdfBlob, 'Test_Conversion');
    
    if (docxBlob) {
      // Save to Drive for manual inspection
      const folder = AttachmentHandler._getTempFolder();
      const savedFile = folder.createFile(docxBlob);
      console.log(`SUCCESS! Converted file saved: ${savedFile.getUrl()}`);
    } else {
      console.log('FAILED: Conversion returned null');
    }
  } else {
    console.log('No PDF files found in Drive for testing');
  }
}
