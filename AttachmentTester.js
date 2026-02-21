/**
 * AttachmentTester.gs - Complete Testing Module
 * Tests all file generation types: TXT, MD, CSV, PDF, DOCX, XLSX, SVG, PNG Charts
 */
const AttachmentTester = {

  testAllFileTypes() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   COMPREHENSIVE FILE GENERATION TEST         ║');
    console.log('╚══════════════════════════════════════════════╝');
    
    const results = {
      txt: this.testTxtGeneration(),
      md: this.testMdGeneration(),
      csv: this.testCsvGeneration(),
      pdf: this.testPdfGeneration(),
      docx: this.testDocxGeneration(),
      xlsx: this.testXlsxGeneration(),
      svg: this.testSvgGeneration(),
      chart: this.testChartGeneration()
    };
    
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║           TEST RESULTS SUMMARY               ║');
    console.log('╚══════════════════════════════════════════════╝\n');
    
    Object.keys(results).forEach(type => {
      const status = results[type] ? '✅ PASS' : '❌ FAIL';
      console.log(`${type.toUpperCase().padEnd(6)}: ${status}`);
    });
    
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r === true).length;
    const allPassed = passedTests === totalTests;
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Total: ${totalTests} | Passed: ${passedTests} | Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    console.log(`${'='.repeat(50)}\n`);
    
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED - SYSTEM READY');
    } else {
      console.log('❌ SOME TESTS FAILED - CHECK DETAILS ABOVE');
    }
    
    return results;
  },

  testTxtGeneration() {
    console.log('\n--- Testing TXT Generation ---');
    try {
      const content = `# PowerShell Script Example
$password = "STRONG_PASSWORD"
New-SelfSignedCertificate -Subject "CN=TestCert"
Export-PfxCertificate -Cert $cert -FilePath "test.pfx"
Write-Host "Certificate created successfully"`;
      
      const blob = AttachmentHandler.createTextFile(content, 'Test_PowerShell_Script');
      
      if (blob && blob.getName() === 'Test_PowerShell_Script.txt') {
        console.log('✅ TXT file created successfully');
        console.log(`   Name: ${blob.getName()}`);
        console.log(`   Type: ${blob.getContentType()}`);
        console.log(`   Size: ${blob.getBytes().length} bytes`);
        return true;
      }
      
      console.log('❌ TXT file creation failed');
      return false;
      
    } catch (error) {
      console.error(`❌ TXT test error: ${error.message}`);
      return false;
    }
  },

  testMdGeneration() {
    console.log('\n--- Testing MD Generation ---');
    try {
      const content = `# API Documentation

## Authentication
Use Bearer token in header:
\`\`\`
Authorization: Bearer YOUR_TOKEN
\`\`\`

## Endpoints

### GET /api/users
Returns list of users.

**Response:**
\`\`\`json
{
  "users": [
    {"id": 1, "name": "John"},
    {"id": 2, "name": "Jane"}
  ]
}
\`\`\`

## Rate Limits
- 100 requests per minute
- 1000 requests per hour

## Error Codes
| Code | Description |
|------|-------------|
| 400  | Bad Request |
| 401  | Unauthorized |
| 404  | Not Found |`;
      
      const blob = AttachmentHandler.createMarkdownFile(content, 'API_Documentation');
      
      if (blob && blob.getName() === 'API_Documentation.md') {
        console.log('✅ MD file created successfully');
        console.log(`   Name: ${blob.getName()}`);
        console.log(`   Type: ${blob.getContentType()}`);
        console.log(`   Size: ${blob.getBytes().length} bytes`);
        return true;
      }
      
      console.log('❌ MD file creation failed');
      return false;
      
    } catch (error) {
      console.error(`❌ MD test error: ${error.message}`);
      return false;
    }
  },

  testCsvGeneration() {
    console.log('\n--- Testing CSV Generation ---');
    try {
      const content = `Service Name,Category,Price,Unit,Description
Business Process Automation,Consulting,$15000,Per project,Custom workflow automation
SharePoint Development,Development,$150,Per hour,SPFx solutions and customization
Power Automate,Consulting,$120,Per hour,Flow design and implementation
Microsoft 365 Migration,Migration,$25000,Per project,Tenant-to-tenant migration
Training Services,Training,$1500,Per day,End-user and admin training
Support Package Basic,Support,$2000,Per month,Email support 9-5
Support Package Premium,Support,$5000,Per month,24/7 phone and email support`;
      
      const blob = AttachmentHandler.createCsvFile(content, 'Services_Price_List_2026');
      
      if (blob && blob.getName() === 'Services_Price_List_2026.csv') {
        console.log('✅ CSV file created successfully');
        console.log(`   Name: ${blob.getName()}`);
        console.log(`   Type: ${blob.getContentType()}`);
        console.log(`   Size: ${blob.getBytes().length} bytes`);
        return true;
      }
      
      console.log('❌ CSV file creation failed');
      return false;
      
    } catch (error) {
      console.error(`❌ CSV test error: ${error.message}`);
      return false;
    }
  },

  testPdfGeneration() {
    console.log('\n--- Testing PDF Generation ---');
    try {
      const content = `PROJECT PROPOSAL
Website Redesign for Modern Enterprise

EXECUTIVE SUMMARY
This proposal outlines our comprehensive approach to redesigning your company 
website with modern UX/UI principles, improved performance, and enhanced functionality.

SCOPE OF WORK

1. Discovery Phase (2 weeks)
   - Stakeholder interviews
   - Competitive analysis
   - User research and personas
   - Technical audit

2. Design Phase (4 weeks)
   - Information architecture
   - Wireframes and prototypes
   - Visual design
   - Design system creation

3. Development Phase (6 weeks)
   - Frontend development (React/Next.js)
   - Backend integration
   - CMS implementation
   - Quality assurance testing

4. Launch Phase (2 weeks)
   - Deployment strategy
   - Content migration
   - User training
   - Documentation

TIMELINE
Total duration: 14 weeks from kickoff to launch

PRICING
- Discovery: $5,000
- Design: $10,000
- Development: $15,000
- Launch & Support: $3,000
Total Investment: $33,000

PAYMENT TERMS
- 50% upfront payment upon contract signing
- 30% at design approval milestone
- 20% upon successful launch

DELIVERABLES
- Complete website redesign
- Mobile-responsive design
- CMS integration
- Documentation and training
- 30 days post-launch support`;
      
      const blob = AttachmentHandler.generatePdfReport(content, 'Website_Redesign_Proposal_2026');
      
      if (blob && blob.getName() === 'Website_Redesign_Proposal_2026.pdf') {
        console.log('✅ PDF file created successfully');
        console.log(`   Name: ${blob.getName()}`);
        console.log(`   Type: ${blob.getContentType()}`);
        console.log(`   Size: ${blob.getBytes().length} bytes`);
        return true;
      }
      
      console.log('❌ PDF file creation failed');
      return false;
      
    } catch (error) {
      console.error(`❌ PDF test error: ${error.message}`);
      return false;
    }
  },

  testDocxGeneration() {
    console.log('\n--- Testing DOCX Generation ---');
    try {
      const content = `TECHNICAL SPECIFICATION
SharePoint Online Migration Project

PROJECT OVERVIEW
Migration of 500GB of enterprise content from SharePoint 2013 
on-premises to SharePoint Online (Microsoft 365).

REQUIREMENTS

Functional Requirements:
- Zero downtime during migration
- Preserve all metadata and permissions
- Maintain document version history
- Complete within 2-week timeframe

Technical Requirements:
- Migration tools: ShareGate or Microsoft Migration Tool
- Bandwidth: Minimum 100 Mbps dedicated
- Testing environment required
- Rollback plan in place

DELIVERABLES
- Migrated content (500GB)
- Migration execution report
- Technical documentation
- User training materials
- Post-migration support (30 days)

TIMELINE
Week 1: Environment preparation and pilot migration
Week 2: Production migration and validation

PRICING
Fixed price: $25,000
Includes all migration activities, documentation, and training

RISKS AND MITIGATION
- Network bandwidth limitations → Dedicated connection
- Permission mapping issues → Comprehensive testing
- User adoption → Training and documentation

SUCCESS CRITERIA
- 100% content migrated successfully
- All permissions preserved
- Zero data loss
- User acceptance sign-off`;
      
      const blob = AttachmentHandler.generateWordDocument(content, 'SharePoint_Migration_Specification');
      
      if (blob && blob.getName() === 'SharePoint_Migration_Specification.docx') {
        console.log('✅ DOCX file created successfully');
        console.log(`   Name: ${blob.getName()}`);
        console.log(`   Type: ${blob.getContentType()}`);
        console.log(`   Size: ${blob.getBytes().length} bytes`);
        return true;
      }
      
      console.log('❌ DOCX file creation failed');
      return false;
      
    } catch (error) {
      console.error(`❌ DOCX test error: ${error.message}`);
      return false;
    }
  },

  testXlsxGeneration() {
    console.log('\n--- Testing XLSX Generation ---');
    try {
      const data = [
        ['Month', 'Revenue ($)', 'Units Sold', 'Profit Margin (%)', 'Notes'],
        ['January', 50000, 1200, 25, 'Strong start'],
        ['February', 65000, 1500, 28, 'Valentine campaign success'],
        ['March', 80000, 1850, 30, 'Best month Q1'],
        ['April', 72000, 1650, 29, 'Post-quarter dip'],
        ['May', 88000, 2100, 31, 'New product launch'],
        ['June', 95000, 2350, 32, 'Record month'],
        ['Q1 Total', 195000, 4550, 28, 'Good quarter'],
        ['Q2 Total', 255000, 6100, 31, 'Excellent growth']
      ];
      
      const blob = AttachmentHandler.generateExcelSpreadsheet(data, 'H1_Sales_Report_2026');
      
      if (blob && blob.getName() === 'H1_Sales_Report_2026.xlsx') {
        console.log('✅ XLSX file created successfully');
        console.log(`   Name: ${blob.getName()}`);
        console.log(`   Type: ${blob.getContentType()}`);
        console.log(`   Size: ${blob.getBytes().length} bytes`);
        console.log(`   Rows: ${data.length}, Columns: ${data[0].length}`);
        return true;
      }
      
      console.log('❌ XLSX file creation failed');
      return false;
      
    } catch (error) {
      console.error(`❌ XLSX test error: ${error.message}`);
      return false;
    }
  },

  testSvgGeneration() {
    console.log('\n--- Testing SVG Generation ---');
    try {
      const svgContent = `<svg width="500" height="400" xmlns="http://www.w3.org/2000/svg">
  <text x="250" y="30" text-anchor="middle" font-size="20" font-weight="bold">Company Organizational Structure</text>
  <rect x="200" y="60" width="100" height="50" fill="#4CAF50" stroke="#2E7D32" stroke-width="2" rx="5"/>
  <text x="250" y="90" text-anchor="middle" fill="white" font-size="14" font-weight="bold">CEO</text>
  <line x1="250" y1="110" x2="120" y2="180" stroke="#666" stroke-width="2"/>
  <line x1="250" y1="110" x2="250" y2="180" stroke="#666" stroke-width="2"/>
  <line x1="250" y1="110" x2="380" y2="180" stroke="#666" stroke-width="2"/>
  <rect x="70" y="180" width="100" height="50" fill="#2196F3" stroke="#1565C0" stroke-width="2" rx="5"/>
  <text x="120" y="210" text-anchor="middle" fill="white" font-size="12" font-weight="bold">CTO</text>
  <rect x="200" y="180" width="100" height="50" fill="#2196F3" stroke="#1565C0" stroke-width="2" rx="5"/>
  <text x="250" y="210" text-anchor="middle" fill="white" font-size="12" font-weight="bold">CFO</text>
  <rect x="330" y="180" width="100" height="50" fill="#2196F3" stroke="#1565C0" stroke-width="2" rx="5"/>
  <text x="380" y="210" text-anchor="middle" fill="white" font-size="12" font-weight="bold">CMO</text>
  <line x1="120" y1="230" x2="70" y2="300" stroke="#666" stroke-width="1.5"/>
  <line x1="120" y1="230" x2="170" y2="300" stroke="#666" stroke-width="1.5"/>
  <rect x="20" y="300" width="100" height="40" fill="#FFC107" stroke="#F57C00" stroke-width="2" rx="3"/>
  <text x="70" y="325" text-anchor="middle" font-size="11">Dev Team</text>
  <rect x="140" y="300" width="100" height="40" fill="#FFC107" stroke="#F57C00" stroke-width="2" rx="3"/>
  <text x="190" y="325" text-anchor="middle" font-size="11">QA Team</text>
</svg>`;
      
      const blob = AttachmentHandler.createSvgFile(svgContent, 'Company_Org_Chart');
      
      if (blob && blob.getName() === 'Company_Org_Chart.svg') {
        console.log('✅ SVG file created successfully');
        console.log(`   Name: ${blob.getName()}`);
        console.log(`   Type: ${blob.getContentType()}`);
        console.log(`   Size: ${blob.getBytes().length} bytes`);
        return true;
      }
      
      console.log('❌ SVG file creation failed');
      return false;
      
    } catch (error) {
      console.error(`❌ SVG test error: ${error.message}`);
      return false;
    }
  },

  testChartGeneration() {
    console.log('\n--- Testing PNG Chart Generation ---');
    try {
      const chartConfig = {
        type: 'bar',
        data: {
          labels: ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'],
          datasets: [{
            label: 'Revenue ($K)',
            data: [120, 145, 168, 195],
            backgroundColor: [
              'rgba(255, 99, 132, 0.6)',
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 206, 86, 0.6)',
              'rgba(75, 192, 192, 0.6)'
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)'
            ],
            borderWidth: 2
          }]
        },
        options: {
          title: {
            display: true,
            text: 'Quarterly Sales Performance 2026',
            fontSize: 18
          },
          scales: {
            yAxes: [{
              ticks: {
                beginAtZero: true
              },
              scaleLabel: {
                display: true,
                labelString: 'Revenue (Thousands $)'
              }
            }],
            xAxes: [{
              scaleLabel: {
                display: true,
                labelString: 'Quarter'
              }
            }]
          },
          legend: {
            display: true,
            position: 'bottom'
          }
        }
      };
      
      const blob = AttachmentHandler.createChartImage(chartConfig, 'Q4_Sales_Performance_Chart');
      
      if (blob && blob.getName() === 'Q4_Sales_Performance_Chart.png') {
        console.log('✅ PNG Chart created successfully');
        console.log(`   Name: ${blob.getName()}`);
        console.log(`   Type: ${blob.getContentType()}`);
        console.log(`   Size: ${blob.getBytes().length} bytes`);
        return true;
      }
      
      console.log('❌ PNG Chart creation failed');
      return false;
      
    } catch (error) {
      console.error(`❌ Chart test error: ${error.message}`);
      return false;
    }
  },

  testMarkerParsing() {
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║        TESTING MARKER PARSING LOGIC          ║');
    console.log('╚══════════════════════════════════════════════╝\n');
    
    const mockAiResponse = `I've prepared all the requested files for you.

[CREATE_TXT:PowerShell_Deploy_Script]
[TXT_CONTENT_START]
# PowerShell Deployment Script
Connect-PnPOnline -Url $siteUrl -ClientId $clientId
Add-PnPFile -Path $filePath -Folder "Documents"
Write-Host "Deployment completed successfully"
[TXT_CONTENT_END]

[CREATE_MD:Technical_Documentation]
[MD_CONTENT_START]
# Technical Documentation

## Overview
This system provides automated deployment capabilities.

## Requirements
- PowerShell 7+
- PnP PowerShell Module
- Valid credentials
[MD_CONTENT_END]

[CREATE_CSV:Project_Tasks]
[CSV_CONTENT_START]
Task,Assigned To,Status,Due Date
Setup Environment,John,Complete,2026-01-15
Development,Jane,In Progress,2026-02-01
Testing,Mike,Pending,2026-02-15
[CSV_CONTENT_END]

[CREATE_XLSX:Budget_Breakdown]
[XLSX_DATA_START]
Category|Planned|Actual|Variance
Development|50000|48000|2000
Testing|20000|22000|-2000
Deployment|15000|15000|0
Total|85000|85000|0
[XLSX_DATA_END]

[CREATE_CHART:Progress_Tracker]
[CHART_CONFIG_START]
{
  "type": "line",
  "data": {
    "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],
    "datasets": [{
      "label": "Tasks Completed",
      "data": [10, 25, 45, 60],
      "borderColor": "rgb(75, 192, 192)",
      "tension": 0.4
    }]
  },
  "options": {
    "title": {
      "display": true,
      "text": "Project Progress Tracker"
    }
  }
}
[CHART_CONFIG_END]

All files are ready for download.`;

    try {
      const attachments = GeminiAPI._generateResponseAttachments(mockAiResponse);
      
      console.log(`Parsed ${attachments.length} attachment(s):\n`);
      attachments.forEach((att, i) => {
        console.log(`${i + 1}. ${att.getName().padEnd(40)} (${att.getContentType()})`);
      });
      
      const expectedCount = 5;
      if (attachments.length === expectedCount) {
        console.log(`\n✅ Marker parsing successful (${expectedCount} files generated)`);
        return true;
      } else {
        console.log(`\n❌ Expected ${expectedCount} files, got ${attachments.length}`);
        return false;
      }
      
    } catch (error) {
      console.error(`\n❌ Marker parsing error: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
      return false;
    }
  },

  testMarkerRemoval() {
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║        TESTING MARKER REMOVAL LOGIC          ║');
    console.log('╚══════════════════════════════════════════════╝\n');
    
    const textWithMarkers = `I've created the requested files.

[CREATE_TXT:test_script]
[TXT_CONTENT_START]
echo "Hello World"
[TXT_CONTENT_END]

[CREATE_MD:documentation]
[MD_CONTENT_START]
# Documentation
Content here
[MD_CONTENT_END]

Please find them attached.`;

    try {
      const cleaned = GeminiAPI._removeFileMarkers(textWithMarkers);
      
      console.log('Original text length:', textWithMarkers.length);
      console.log('Cleaned text length:', cleaned.length);
      console.log('\nCleaned text:');
      console.log('─'.repeat(50));
      console.log(cleaned);
      console.log('─'.repeat(50));
      
      const markersRemoved = !cleaned.includes('[CREATE_') && 
                            !cleaned.includes('_CONTENT_START') && 
                            !cleaned.includes('_CONTENT_END') &&
                            !cleaned.includes('_DATA_START') &&
                            !cleaned.includes('_DATA_END') &&
                            !cleaned.includes('_CONFIG_START') &&
                            !cleaned.includes('_CONFIG_END');
      
      if (markersRemoved) {
        console.log('\n✅ All markers removed successfully');
        return true;
      } else {
        console.log('\n❌ Some markers still present in text');
        return false;
      }
      
    } catch (error) {
      console.error(`\n❌ Marker removal error: ${error.message}`);
      return false;
    }
  },

  runFullTest() {
    const startTime = new Date();
    
    console.log('\n'.repeat(2));
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║                                              ║');
    console.log('║   AI EMAIL AGENT - ATTACHMENT SYSTEM TEST    ║');
    console.log('║                                              ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log(`\nStart Time: ${startTime.toLocaleString()}\n`);
    
    const fileTests = this.testAllFileTypes();
    const parsingTest = this.testMarkerParsing();
    const removalTest = this.testMarkerRemoval();
    
    const endTime = new Date();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║           FINAL TEST SUMMARY                 ║');
    console.log('╚══════════════════════════════════════════════╝\n');
    
    const allTests = {
      ...fileTests,
      markerParsing: parsingTest,
      markerRemoval: removalTest
    };
    
    const totalTests = Object.keys(allTests).length;
    const passedTests = Object.values(allTests).filter(r => r === true).length;
    const failedTests = totalTests - passedTests;
    const successRate = Math.round((passedTests / totalTests) * 100);
    
    console.log(`Total Tests:    ${totalTests}`);
    console.log(`Passed:         ${passedTests} ✅`);
    console.log(`Failed:         ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
    console.log(`Success Rate:   ${successRate}%`);
    console.log(`Duration:       ${duration}s`);
    console.log(`End Time:       ${endTime.toLocaleString()}`);
    
    console.log('\n' + '═'.repeat(50));
    
    if (successRate === 100) {
      console.log('✅ ✅ ✅  ALL TESTS PASSED - SYSTEM READY  ✅ ✅ ✅');
    } else if (successRate >= 80) {
      console.log('⚠️  MOSTLY PASSING - REVIEW FAILED TESTS  ⚠️');
    } else {
      console.log('❌ ❌ ❌  CRITICAL FAILURES DETECTED  ❌ ❌ ❌');
    }
    
    console.log('═'.repeat(50) + '\n');
    
    return {
      totalTests,
      passedTests,
      failedTests,
      successRate,
      duration,
      details: allTests
    };
  },

  sendTestEmailWithAllFileTypes(recipientEmail) {
    console.log(`\n📧 Sending test email to: ${recipientEmail}\n`);
    
    try {
      const attachments = [
        AttachmentHandler.createTextFile('echo "Test"', 'test_script'),
        AttachmentHandler.createMarkdownFile('# Test\n## Content', 'test_doc'),
        AttachmentHandler.createCsvFile('Name,Value\nTest,123', 'test_data'),
        AttachmentHandler.generatePdfReport('Test PDF Content', 'test_pdf'),
        AttachmentHandler.generateWordDocument('Test DOCX Content', 'test_docx'),
        AttachmentHandler.generateExcelSpreadsheet([['A', 'B'], ['1', '2']], 'test_xlsx'),
        AttachmentHandler.createSvgFile('<svg><circle cx="50" cy="50" r="40"/></svg>', 'test_svg'),
        AttachmentHandler.createChartImage({
          type: 'bar',
          data: {labels: ['A', 'B'], datasets: [{data: [10, 20]}]}
        }, 'test_chart')
      ].filter(blob => blob !== null);
      
      const subject = '✅ AI Email Agent - File Generation Test';
      const body = `This is a test email from AI Email Agent.

All ${attachments.length} supported file types are attached:
1. TXT - Plain text file
2. MD - Markdown document
3. CSV - Comma-separated values
4. PDF - PDF report
5. DOCX - Word document
6. XLSX - Excel spreadsheet
7. SVG - Vector graphic
8. PNG - Chart image

If you received all files, the system is working correctly!`;
      
      GmailApp.sendEmail(recipientEmail, subject, body, {
        attachments: attachments
      });
      
      console.log(`✅ Test email sent successfully with ${attachments.length} attachments`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to send test email: ${error.message}`);
      return false;
    }
  }
};

function runAttachmentTests() {
  return AttachmentTester.runFullTest();
}

function testAllFileTypes() {
  return AttachmentTester.testAllFileTypes();
}

function sendTestEmail(email) {
  return AttachmentTester.sendTestEmailWithAllFileTypes(email);
}