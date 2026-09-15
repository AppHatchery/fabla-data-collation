// CSV Collation Tool - Client-side JavaScript
class CSVCollator {
    constructor() {
        this.files = [];
        this.mergedData = [];
        this.mergedColumns = [];
        this.participationAnalyzer = new ParticipationAnalyzer();
        this.referenceTranscriptExtractor = new ReferenceTranscriptExtractor();
        this.participationData = null;
        this.originalSummaryData = null; // Store original data for filtering
        this.originalAudioSummaryData = null; // Store original audio data for filtering
        this.transcriptFiles = [];
        this.transcriptData = [];
        
        // Analysis-specific properties
        this.analysisFiles = [];
        this.analysisParticipationData = null;
        this.originalAnalysisSummaryData = null; // Store original analysis data for filtering
        this.originalAnalysisAudioSummaryData = null;
        this.originalAnalysisIncentiveSummaryData = null;
        this.originalIncentiveSummaryData = null;

        // Calculate Adherence tab state (per section)
        this.calculateAdherenceState = {
            participation: {
                expectedTotal: '',
                expectedAudio: '',
                lengthOfStudy: '',
                excluded: new Set(),
                forceInclude: new Set(),
                summaryData: null,
                audioSummaryData: null,
                strictDateFilter: true
            },
            analysis: {
                expectedTotal: '',
                expectedAudio: '',
                lengthOfStudy: '',
                excluded: new Set(),
                forceInclude: new Set(),
                summaryData: null,
                audioSummaryData: null,
                strictDateFilter: false
            }
        };
        
        // Cleaning-specific properties
        this.cleaningRawData = [];
        this.cleanedData = [];
        this.cleaningDuplicateGroups = [];
        this.cleaningResolvedColumns = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    // Helper function to format date string (YYYY-MM-DD) for table display without Date parsing
    formatDateForTable(dateStr) {
        // dateStr is in format 'YYYY-MM-DD' (e.g., '2025-08-14')
        const [year, month, day] = dateStr.split('-');
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Calculate day of week using UTC to avoid timezone issues
        const date = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));
        const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        
        return {
            dayOfWeek: dayNames[dayOfWeek],
            dateStr: `${monthNames[parseInt(month, 10) - 1]} ${parseInt(day, 10)}`
        };
    }

    // Earliest YYYY-MM-DD column with count > 0 on a participant summary row
    getFirstEntryDateFromRow(participant) {
        if (!participant) return null;
        const entryDates = Object.keys(participant)
            .filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key) && (participant[key] || 0) > 0)
            .sort();
        return entryDates.length > 0 ? entryDates[0] : null;
    }

    buildFirstEntryDateMap(summaryData) {
        const map = {};
        (summaryData || []).forEach(participant => {
            map[String(participant.ParticipantID)] = this.getFirstEntryDateFromRow(participant);
        });
        return map;
    }

    // Days before a participant's first entry render blank instead of 0
    renderDailyCountCell(count, date, firstEntryDate) {
        if (!firstEntryDate || date < firstEntryDate) {
            return '<td class="daily-count"></td>';
        }
        const n = count || 0;
        const className = n > 0 ? 'daily-count has-entries' : 'daily-count';
        return `<td class="${className}">${n}</td>`;
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const downloadCsvBtn = document.getElementById('downloadCsv');
        const downloadExcelBtn = document.getElementById('downloadExcel');
        const analyzeParticipationBtn = document.getElementById('analyzeParticipation');
        const downloadParticipationCsvBtn = document.getElementById('downloadParticipationCsv');
        const backToResultsBtn = document.getElementById('backToResults');
        const participantSelect = document.getElementById('participantSelect');
        const resetBtn = document.getElementById('resetBtn');
        
        // Tool selector elements
        const aggregationTab = document.getElementById('aggregationTab');
        const analysisTab = document.getElementById('analysisTab');
        const transcriptTab = document.getElementById('transcriptTab');
        const aggregationCard = document.getElementById('aggregationCard');
        const analysisCard = document.getElementById('analysisCard');
        const transcriptCard = document.getElementById('transcriptCard');
        
        // Analysis-specific elements
        const analysisFileInput = document.getElementById('analysisFileInput');
        const analysisUploadArea = document.getElementById('analysisUploadArea');
        const analysisFileList = document.getElementById('analysisFileList');
        const analysisLoading = document.getElementById('analysisLoading');
        const analysisMessages = document.getElementById('analysisMessages');
        const analysisResults = document.getElementById('analysisResults');
        const analysisParticipantSelect = document.getElementById('analysisParticipantSelect');
        const downloadAnalysisCsv = document.getElementById('downloadAnalysisCsv');
        const resetAnalysisBtn = document.getElementById('resetAnalysisBtn');
        
        // Transcript-specific elements
        const transcriptFileInput = document.getElementById('transcriptFileInput');
        const transcriptUploadArea = document.getElementById('transcriptUploadArea');
        const transcriptFileList = document.getElementById('transcriptFileList');
        const transcriptLoading = document.getElementById('transcriptLoading');
        const transcriptMessages = document.getElementById('transcriptMessages');
        const transcriptActionButtons = document.getElementById('transcriptActionButtons');
        const downloadTranscriptBtn = document.getElementById('downloadTranscriptBtn');
        const resetTranscriptBtn = document.getElementById('resetTranscriptBtn');

        // File upload events
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Button events
        downloadCsvBtn.addEventListener('click', this.downloadCSV.bind(this));
        downloadExcelBtn.addEventListener('click', this.downloadExcel.bind(this));
        analyzeParticipationBtn.addEventListener('click', this.analyzeParticipation.bind(this));
        downloadParticipationCsvBtn.addEventListener('click', this.downloadParticipationCSV.bind(this));
        backToResultsBtn.addEventListener('click', this.backToResults.bind(this));
        participantSelect.addEventListener('change', this.filterChartByParticipant.bind(this));
        resetBtn.addEventListener('click', this.reset.bind(this));
        
        // Date filter event delegation — handles both section-specific filter IDs
        document.addEventListener('change', (e) => {
            if (e.target && (e.target.id === 'participationDateFilter' || e.target.id === 'analysisDateFilter')) {
                this.filterByDateRange(e);
            }
        });

        // View tab buttons (Adherence / Calculate / Incentive)
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'participationAdherenceTab') this.switchViewTab('participation', 'adherence');
            if (e.target && e.target.id === 'participationCalculateTab')  this.switchViewTab('participation', 'calculate');
            if (e.target && e.target.id === 'participationIncentiveTab')  this.switchViewTab('participation', 'incentive');
            if (e.target && e.target.id === 'analysisAdherenceTab')       this.switchViewTab('analysis', 'adherence');
            if (e.target && e.target.id === 'analysisCalculateTab')        this.switchViewTab('analysis', 'calculate');
            if (e.target && e.target.id === 'analysisIncentiveTab')        this.switchViewTab('analysis', 'incentive');
        });

        // Calculate Adherence expected-entry / study-length inputs
        document.addEventListener('input', (e) => {
            if (!e.target) return;
            if (e.target.id === 'participationExpectedTotal' || e.target.id === 'participationExpectedAudio' || e.target.id === 'participationStudyLength') {
                this.handleCalculateAdherenceInput('participation', e.target);
            }
            if (e.target.id === 'analysisExpectedTotal' || e.target.id === 'analysisExpectedAudio' || e.target.id === 'analysisStudyLength') {
                this.handleCalculateAdherenceInput('analysis', e.target);
            }
        });

        // Calculate Adherence include/exclude checkboxes
        document.addEventListener('change', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('calc-adherence-include')) {
                const section = e.target.dataset.section;
                const participantId = e.target.dataset.participantId;
                if (section && participantId) {
                    this.handleCalculateAdherenceToggle(section, participantId, e.target.checked);
                }
            }
        });
        
        // Tool selector events
        aggregationTab.addEventListener('click', () => this.switchTool('aggregation'));
        analysisTab.addEventListener('click', () => this.switchTool('analysis'));
        transcriptTab.addEventListener('click', () => this.switchTool('transcript'));
        
        // Cleaning tab
        const cleaningTab = document.getElementById('cleaningTab');
        cleaningTab.addEventListener('click', () => this.switchTool('cleaning'));

        const issuesTab = document.getElementById('issuesTab');
        issuesTab.addEventListener('click', () => this.switchTool('issues'));
        
        // Transcript-specific events
        transcriptUploadArea.addEventListener('click', () => transcriptFileInput.click());
        transcriptUploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        transcriptUploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        transcriptUploadArea.addEventListener('drop', (e) => this.handleTranscriptDrop(e));
        transcriptFileInput.addEventListener('change', (e) => this.handleTranscriptFileSelect(e));
        downloadTranscriptBtn.addEventListener('click', this.downloadTranscript.bind(this));
        resetTranscriptBtn.addEventListener('click', this.resetTranscript.bind(this));
        
        // Analysis-specific events
        analysisUploadArea.addEventListener('click', () => analysisFileInput.click());
        analysisUploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        analysisUploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        analysisUploadArea.addEventListener('drop', this.handleAnalysisDrop.bind(this));
        analysisFileInput.addEventListener('change', this.handleAnalysisFileSelect.bind(this));
        analysisParticipantSelect.addEventListener('change', this.filterAnalysisChartByParticipant.bind(this));
        downloadAnalysisCsv.addEventListener('click', this.downloadAnalysisCSV.bind(this));
        resetAnalysisBtn.addEventListener('click', this.resetAnalysis.bind(this));
        
        // Cleaning-specific events
        const cleaningUploadArea = document.getElementById('cleaningUploadArea');
        const cleaningFileInput = document.getElementById('cleaningFileInput');
        const downloadCleanedCsv = document.getElementById('downloadCleanedCsv');
        const downloadCleanedExcel = document.getElementById('downloadCleanedExcel');
        const resetCleaningBtn = document.getElementById('resetCleaningBtn');
        
        cleaningUploadArea.addEventListener('click', () => cleaningFileInput.click());
        cleaningUploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        cleaningUploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        cleaningUploadArea.addEventListener('drop', (e) => this.handleCleaningDrop(e));
        cleaningFileInput.addEventListener('change', (e) => this.handleCleaningFileSelect(e));
        downloadCleanedCsv.addEventListener('click', () => this.downloadCleanedCSV());
        downloadCleanedExcel.addEventListener('click', () => this.downloadCleanedExcel());
        resetCleaningBtn.addEventListener('click', () => this.resetCleaning());
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }

    isCsvFile(file) {
        return file.name.toLowerCase().endsWith('.csv');
    }

    partitionCsvFiles(files) {
        const valid = [];
        const invalid = [];

        files.forEach(file => {
            if (this.isCsvFile(file)) {
                valid.push(file);
            } else {
                invalid.push(file);
            }
        });

        return { valid, invalid };
    }

    getInvalidFileTypeMessage(invalidFiles) {
        if (invalidFiles.length === 0) return null;

        if (invalidFiles.length === 1) {
            const file = invalidFiles[0];
            const parts = file.name.split('.');
            const ext = parts.length > 1 ? parts.pop().toLowerCase() : 'unknown';
            return `Invalid file type: "${file.name}" is not a CSV file (.${ext}). Please upload a .csv file.`;
        }

        const fileList = invalidFiles.map(file => `"${file.name}"`).join(', ');
        return `Invalid file type: ${fileList} are not CSV files. Please upload .csv files only.`;
    }

    getUploadErrorId(uploadAreaId) {
        return `${uploadAreaId}Error`;
    }

    showUploadFieldError(uploadAreaId, message) {
        const uploadArea = document.getElementById(uploadAreaId);
        if (uploadArea) {
            uploadArea.classList.add('upload-error');
        }

        const errorEl = document.getElementById(this.getUploadErrorId(uploadAreaId));
        if (errorEl) {
            errorEl.textContent = message.startsWith('❌') ? message : `❌ ${message}`;
            errorEl.hidden = false;
        }
    }

    clearUploadFieldError(uploadAreaId) {
        const uploadArea = document.getElementById(uploadAreaId);
        if (uploadArea) {
            uploadArea.classList.remove('upload-error');
        }

        const errorEl = document.getElementById(this.getUploadErrorId(uploadAreaId));
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.hidden = true;
        }
    }

    clearUploadInput(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = '';
        }
    }

    filterCsvUpload(files, { uploadAreaId, inputId } = {}) {
        const { valid, invalid } = this.partitionCsvFiles(files);
        const invalidMessage = this.getInvalidFileTypeMessage(invalid);

        if (invalid.length > 0) {
            if (uploadAreaId) {
                this.showUploadFieldError(uploadAreaId, invalidMessage);
            }
            if (inputId) this.clearUploadInput(inputId);
        } else if (uploadAreaId) {
            this.clearUploadFieldError(uploadAreaId);
        }

        return { valid, invalidMessage };
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const { valid, invalidMessage } = this.filterCsvUpload(Array.from(e.dataTransfer.files), {
            uploadAreaId: 'uploadArea',
            inputId: 'fileInput'
        });

        if (valid.length > 0) {
            this.processFiles(valid);
        }
    }

    handleFileSelect(e) {
        const { valid, invalidMessage } = this.filterCsvUpload(Array.from(e.target.files), {
            uploadAreaId: 'uploadArea',
            inputId: 'fileInput'
        });

        if (valid.length > 0) {
            this.processFiles(valid);
        }
    }

    async processFiles(files) {
        if (files.length === 0) return;

        this.showLoading(true);
        this.clearMessages();

        try {
            this.files = [];
            const allData = [];

            for (const file of files) {
                try {
                    const data = await this.parseCSV(file);
                    this.files.push({ name: file.name, data: data, rows: data.length });
                    allData.push(...data);
                    const columns = Object.keys(data[0] || {});
                    this.addMessage(`✅ Loaded ${file.name}: ${data.length} rows, ${columns.length} columns`, 'success');
                    
                    // Debug: Show first few rows for verification
                    if (data.length > 0 && document.getElementById('enableDebug').value === 'true') {
                        console.log(`Debug - ${file.name} first row:`, data[0]);
                        console.log(`Debug - ${file.name} columns:`, columns);
                        
                        // Check for ResponseID column specifically
                        if (columns.includes('ResponseID')) {
                            const responseIds = data.slice(0, 10).map(row => row['ResponseID'] || '');
                            console.log(`Debug - ${file.name} first 10 ResponseIDs:`, responseIds);
                            
                            // Count unique ResponseIDs in this file
                            const uniqueIds = new Set(data.map(row => row['ResponseID'] || ''));
                            console.log(`Debug - ${file.name} unique ResponseIDs: ${uniqueIds.size} out of ${data.length} rows`);
                        }
                    }
                } catch (error) {
                    this.addMessage(`❌ Failed to load ${file.name}: ${error.message}`, 'error');
                }
            }

            if (allData.length > 0) {
                const debugEnabled = document.getElementById('enableDebug').value === 'true';
                if (debugEnabled) {
                    console.log(`Debug - Total rows loaded: ${allData.length}`);
                    
                    // Check ResponseID statistics
                    if (allData.length > 0 && 'ResponseID' in allData[0]) {
                        const uniqueResponseIds = new Set(allData.map(row => row['ResponseID'] || ''));
                        console.log(`Debug - Total unique ResponseIDs: ${uniqueResponseIds.size}`);
                        console.log(`Debug - Total duplicate ResponseIDs: ${allData.length - uniqueResponseIds.size}`);
                    }
                }
                
                this.processData(allData);
            } else {
                this.addMessage('No valid CSV files could be processed.', 'error');
            }
        } catch (error) {
            this.addMessage(`Processing error: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
            this.updateFileList();
        }
    }

    async parseCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    
                    if (!text.trim()) {
                        resolve([]);
                        return;
                    }

                    // Parse CSV properly handling multiline fields
                    const rows = this.parseCSVText(text);
                    
                    if (rows.length === 0) {
                        resolve([]);
                        return;
                    }
                    
                    const headers = rows[0];
                    const data = [];

                    // Process all remaining rows
                    const debugEnabled = document.getElementById('enableDebug').value === 'true';
                    let parsingErrors = 0;
                    
                    for (let i = 1; i < rows.length; i++) {
                        try {
                            const values = rows[i];
                            const row = {};
                            
                            headers.forEach((header, index) => {
                                row[header] = values[index] || '';
                            });
                            
                            data.push(row);
                        } catch (error) {
                            parsingErrors++;
                            if (debugEnabled && parsingErrors <= 5) {
                                console.warn(`CSV parsing error on row ${i + 1}:`, error.message);
                            }
                        }
                    }
                    
                    if (debugEnabled && parsingErrors > 0) {
                        console.log(`Debug - ${file.name} parsing errors: ${parsingErrors} out of ${rows.length - 1} data rows`);
                    }

                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    parseCSVText(text) {
        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;
        let i = 0;

        while (i < text.length) {
            const char = text[i];
            
            if (char === '"') {
                if (inQuotes && text[i + 1] === '"') {
                    // Escaped quote within quoted field
                    currentField += '"';
                    i += 2;
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === ',' && !inQuotes) {
                // Field separator
                currentRow.push(currentField.trim());
                currentField = '';
                i++;
            } else if ((char === '\n' || char === '\r') && !inQuotes) {
                // Row separator (only when not in quotes)
                currentRow.push(currentField.trim());
                if (currentRow.length > 0) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentField = '';
                
                // Handle \r\n sequences
                if (char === '\r' && text[i + 1] === '\n') {
                    i += 2;
                } else {
                    i++;
                }
            } else {
                // Regular character (including newlines within quoted fields)
                currentField += char;
                i++;
            }
        }
        
        // Add the last field and row if there's content
        if (currentField.trim() || currentRow.length > 0) {
            currentRow.push(currentField.trim());
            if (currentRow.length > 0) {
                rows.push(currentRow);
            }
        }
        
        return rows;
    }

    parseCSVContent(text) {
        if (!text || !text.trim()) {
            return [];
        }

        const rows = this.parseCSVText(text);
        if (rows.length === 0) {
            return [];
        }

        const headers = rows[0];
        const data = [];

        for (let i = 1; i < rows.length; i++) {
            const values = rows[i];
            const row = {};

            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            data.push(row);
        }

        return data;
    }

    processData(allData) {
        try {
            // Always use ResponseID for deduplication
            const dedupCols = ['ResponseID'];
            const keepDuplicate = 'first'; // Always keep first occurrence

            // Collate and deduplicate
            const beforeCount = allData.length;
            const debugEnabled = document.getElementById('enableDebug').value === 'true';
            
            if (debugEnabled) {
                console.log(`Debug - Before deduplication: ${beforeCount} rows`);
                console.log(`Debug - Deduplication columns:`, dedupCols);
                console.log(`Debug - Keep duplicate: ${keepDuplicate}`);
            }
            
            this.mergedData = this.deduplicate(allData, dedupCols, keepDuplicate);
            this.mergedColumns = this.buildColumnUnion(this.mergedData);
            const afterCount = this.mergedData.length;
            const removedCount = beforeCount - afterCount;
            
            if (debugEnabled) {
                console.log(`Debug - After deduplication: ${afterCount} rows`);
                console.log(`Debug - Removed: ${removedCount} duplicates`);
            }

            this.showResults(beforeCount, removedCount, afterCount);
        } catch (error) {
            this.addMessage(`Processing error: ${error.message}`, 'error');
        }
    }

    deduplicate(data, dedupCols, keep) {
        if (!dedupCols || dedupCols.length === 0) {
            // Deduplicate on all columns (like pandas with subset=None)
            const seen = new Map();
            const result = [];
            
            data.forEach((row, index) => {
                // Create a normalized key for comparison
                const key = JSON.stringify(row);
                if (!seen.has(key)) {
                    seen.set(key, index);
                    result.push(row);
                } else if (keep === 'last') {
                    // For 'last', replace the existing entry
                    const existingIndex = result.findIndex(r => JSON.stringify(r) === key);
                    if (existingIndex !== -1) {
                        result[existingIndex] = row;
                    }
                }
                // For 'first', we do nothing - keep the first occurrence
            });
            
            return result;
        }

        // Ensure all dedup columns exist (like pandas does)
        dedupCols.forEach(col => {
            data.forEach(row => {
                if (!(col in row)) {
                    row[col] = '';
                }
            });
        });

        // Deduplicate based on specified columns
        const seen = new Map();
        const result = [];
        const debugEnabled = document.getElementById('enableDebug').value === 'true';

        data.forEach((row, index) => {
            const key = dedupCols.map(col => row[col] || '').join('|');
            
            if (debugEnabled && index < 10) {
                console.log(`Row ${index}: key="${key}", ResponseID="${row['ResponseID'] || ''}"`);
            }
            
            if (!seen.has(key)) {
                seen.set(key, row);
                result.push(row);
            } else if (keep === 'last') {
                // Replace with last occurrence
                const existingIndex = result.findIndex(r => 
                    dedupCols.every(col => (r[col] || '') === (row[col] || ''))
                );
                if (existingIndex !== -1) {
                    result[existingIndex] = row;
                }
            } else {
                // keep === 'first' - skip this duplicate
                if (debugEnabled && index < 20) {
                    console.log(`Skipping duplicate row ${index} with key: ${key}`);
                }
            }
        });

        if (debugEnabled) {
            console.log(`Deduplication complete: ${result.length} unique rows from ${data.length} total rows`);
            console.log(`Removed ${data.length - result.length} duplicates`);
        }

        return result;
    }

    showResults(beforeCount, removedCount, afterCount) {
        const resultsDiv = document.getElementById('results');
        const statsDiv = document.getElementById('stats');
        const previewDiv = document.getElementById('preview');

        // Show stats
        statsDiv.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${beforeCount.toLocaleString()}</div>
                <div class="stat-label">Original Rows</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${removedCount.toLocaleString()}</div>
                <div class="stat-label">Duplicates Removed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${afterCount.toLocaleString()}</div>
                <div class="stat-label">Final Rows</div>
            </div>
        `;

        // Show preview if enabled
        const showPreview = document.getElementById('showPreview').value === 'true';
        if (showPreview && this.mergedData.length > 0) {
            const maxRows = parseInt(document.getElementById('maxPreviewRows').value);
            const previewData = this.mergedData.slice(0, maxRows);
            const columns = this.getMergedColumns();

            let tableHTML = '<div class="table-container"><div class="table-wrapper"><table><thead><tr>';
            columns.forEach(col => {
                tableHTML += `<th>${this.escapeHtml(col)}</th>`;
            });
            tableHTML += '</tr></thead><tbody>';

            previewData.forEach(row => {
                tableHTML += '<tr>';
                columns.forEach(col => {
                    tableHTML += `<td>${this.escapeHtml(row[col] || '')}</td>`;
                });
                tableHTML += '</tr>';
            });

            tableHTML += '</tbody></table></div></div>';
            previewDiv.innerHTML = tableHTML;
        } else {
            previewDiv.innerHTML = '';
        }

        // Hide upload area and settings, show success state
        const uploadArea = document.getElementById('uploadArea');
        const settingsSection = document.querySelector('.settings');
        uploadArea.style.display = 'none';
        settingsSection.style.display = 'none';
        
        // Show action buttons and results
        const actionButtons = document.getElementById('actionButtons');
        actionButtons.style.display = 'block';
        
        resultsDiv.classList.add('show');
    }

    downloadCSV() {
        if (this.mergedData.length === 0) return;

        const columns = this.getMergedColumns();
        let csvContent = columns.join(',') + '\n';

        this.mergedData.forEach(row => {
            const values = columns.map(col => {
                const value = row[col] || '';
                // Escape quotes and wrap in quotes if contains comma, quote, or newline
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    return '"' + value.replace(/"/g, '""') + '"';
                }
                return value;
            });
            csvContent += values.join(',') + '\n';
        });

        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        this.downloadFile(csvContent, `fabla_data_${today}.csv`, 'text/csv');
    }

    downloadExcel() {
        if (this.mergedData.length === 0) return;

        try {
            const columns = this.getMergedColumns();
            const normalizedData = this.mergedData.map(row => {
                const normalizedRow = {};
                columns.forEach(col => {
                    normalizedRow[col] = row[col] || '';
                });
                return normalizedRow;
            });
            const ws = XLSX.utils.json_to_sheet(normalizedData, { header: columns });
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Collated_Data');
            
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            this.downloadBlob(blob, `fabla_data_${today}.xlsx`);
        } catch (error) {
            this.addMessage(`Excel export error: ${error.message}`, 'error');
        }
    }

    downloadReferenceTranscript() {
        this.referenceTranscriptExtractor.extractAndDownload(
            this.mergedData,
            this.downloadFile.bind(this),
            this.addMessage.bind(this)
        );
    }


    getResponseIdStats() {
        if (this.mergedData.length === 0 || !('ResponseID' in this.mergedData[0])) {
            return null;
        }

        const responseIds = this.mergedData.map(row => row['ResponseID'] || '');
        const uniqueIds = new Set(responseIds);
        
        return {
            totalRows: this.mergedData.length,
            uniqueResponseIds: uniqueIds.size,
            duplicateResponseIds: this.mergedData.length - uniqueIds.size,
            emptyResponseIds: responseIds.filter(id => id === '').length,
            sampleResponseIds: Array.from(uniqueIds).slice(0, 10)
        };
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        this.downloadBlob(blob, filename);
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }


    updateFileList() {
        const fileListDiv = document.getElementById('fileList');
        
        if (this.files.length === 0) {
            fileListDiv.innerHTML = '';
            return;
        }

        // Calculate total rows
        const totalRows = this.files.reduce((sum, file) => sum + file.rows, 0);
        
        // Show collapsible summary instead of full file list
        fileListDiv.innerHTML = `
            <div class="file-summary collapsible" onclick="this.classList.toggle('expanded')">
                <div class="file-summary-header">
                    <span class="file-icon">📁</span>
                    <span class="file-count">${this.files.length} file${this.files.length > 1 ? 's' : ''} processed</span>
                    <span class="file-rows">(${totalRows.toLocaleString()} total rows)</span>
                    <span class="chevron">▼</span>
                </div>
                <div class="file-summary-details">
                    ${this.files.map(file => `
                        <div class="file-detail">
                            <span class="file-icon">📄</span>
                            <span class="file-name">${this.escapeHtml(file.name)}</span>
                            <span class="file-rows">${file.rows} rows</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    showLoading(show) {
        const loadingDiv = document.getElementById('loading');
        loadingDiv.classList.toggle('show', show);
    }

    addMessage(message, type = 'info') {
        const messagesDiv = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = type;
        messageDiv.textContent = message;
        messagesDiv.appendChild(messageDiv);
    }

    clearMessages() {
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = '';
    }

    reset() {
        this.files = [];
        this.mergedData = [];
        this.mergedColumns = [];
        this.participationData = null;
        this.originalSummaryData = null;
        this.originalAudioSummaryData = null;
        this.originalIncentiveSummaryData = null;
        this.resetCalculateAdherenceState('participation');
        
        document.getElementById('fileInput').value = '';
        document.getElementById('actionButtons').style.display = 'none';
        document.getElementById('results').classList.remove('show');
        document.getElementById('participationResults').style.display = 'none';
        document.getElementById('participationIncentiveSection').style.display = 'none';
        const participationCalculateSection = document.getElementById('participationCalculateSection');
        if (participationCalculateSection) participationCalculateSection.style.display = 'none';
        document.getElementById('fileList').innerHTML = '';
        document.getElementById('participantSelect').innerHTML = '<option value="all">All Participants</option>';
        
        // Reset date filter
        const dateFilter = document.getElementById('participationDateFilter');
        if (dateFilter) dateFilter.value = 'all';

        // Reset calculate adherence inputs
        const expectedTotal = document.getElementById('participationExpectedTotal');
        const expectedAudio = document.getElementById('participationExpectedAudio');
        const studyLength = document.getElementById('participationStudyLength');
        if (expectedTotal) expectedTotal.value = '';
        if (expectedAudio) expectedAudio.value = '';
        if (studyLength) studyLength.value = '';
        const calcTable = document.getElementById('participationCalculateTable');
        if (calcTable) calcTable.innerHTML = '';
        
        // Show upload area and settings again
        const uploadArea = document.getElementById('uploadArea');
        const settingsSection = document.querySelector('.settings');
        uploadArea.style.display = 'block';
        settingsSection.style.display = 'block';
        this.clearUploadFieldError('uploadArea');
        
        this.clearMessages();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    buildColumnUnion(rows) {
        const seen = new Set();
        const orderedColumns = [];

        rows.forEach(row => {
            Object.keys(row || {}).forEach(col => {
                if (!seen.has(col)) {
                    seen.add(col);
                    orderedColumns.push(col);
                }
            });
        });

        return orderedColumns;
    }

    getMergedColumns() {
        if (this.mergedColumns && this.mergedColumns.length > 0) {
            return this.mergedColumns;
        }
        return this.buildColumnUnion(this.mergedData);
    }

    formatFileSize(bytes) {
        if (!Number.isFinite(bytes) || bytes <= 0) {
            return '0 B';
        }

        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        const value = bytes / Math.pow(1024, unitIndex);
        const decimals = unitIndex === 0 ? 0 : 1;

        return `${value.toFixed(decimals)} ${units[unitIndex]}`;
    }

    // Participation Analysis Methods
    analyzeParticipation() {
        if (this.mergedData.length === 0) {
            this.addMessage('No data available for analysis. Please process files first.', 'error');
            return;
        }

        this.showLoading(true);
        this.clearMessages();

        try {
            // Process the data for participation analysis
            this.participationData = this.participationAnalyzer.processParticipationData(this.mergedData);
            
            if (this.participationData.summary === null) {
                this.addMessage(this.participationData.message, 'error');
                this.showLoading(false);
                return;
            }

            // Generate statistics
            const stats = this.participationAnalyzer.generateStats(this.participationData.summary);
            
            // Display the analysis results
            this.showParticipationResults(stats, this.participationData.summary, this.participationData.audioSummary, this.participationData.incentiveSummary);
            
            this.addMessage('Participation analysis completed successfully!', 'success');
            
        } catch (error) {
            this.addMessage(`Analysis error: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showParticipationResults(stats, summaryData, audioSummaryData, incentiveSummaryData = null) {
        const resultsDiv = document.getElementById('results');
        const participationDiv = document.getElementById('participationResults');
        
        // Hide main results, show participation results
        resultsDiv.classList.remove('show');
        participationDiv.style.display = 'block';
        
        // Show participation statistics
        this.showParticipationStats(stats);
        
        // Show action buttons
        const participationActionButtons = document.getElementById('participationActionButtons');
        participationActionButtons.style.display = 'block';
        
        // Store original data for filtering
        this.originalSummaryData = JSON.parse(JSON.stringify(summaryData)); // Deep copy
        this.originalAudioSummaryData = audioSummaryData ? JSON.parse(JSON.stringify(audioSummaryData)) : null;
        this.originalIncentiveSummaryData = incentiveSummaryData ? JSON.parse(JSON.stringify(incentiveSummaryData)) : null;
        
        // Populate participant filter
        this.populateParticipantFilter(summaryData);
        
        // Show chart
        this.showParticipationChart(summaryData);
        
        // Show adherence table
        this.showParticipationTable(summaryData, audioSummaryData);

        // Show calculate adherence table
        this.showCalculateAdherenceTable('participation', summaryData, audioSummaryData);

        // Populate incentive table and reset to adherence tab
        if (incentiveSummaryData) {
            this.showIncentiveTable(incentiveSummaryData, summaryData, 'participationIncentiveTable');
        }
        this.switchViewTab('participation', 'adherence');
    }

    showParticipationStats(stats) {
        const statsDiv = document.getElementById('participationStats');
        
        statsDiv.innerHTML = `
            <div class="participation-stat-card">
                <div class="participation-stat-number">${stats.totalParticipants}</div>
                <div class="participation-stat-label">Total Participants</div>
            </div>
            <div class="participation-stat-card">
                <div class="participation-stat-number">${stats.totalEntries}</div>
                <div class="participation-stat-label">Total Entries</div>
            </div>
            <div class="participation-stat-card">
                <div class="participation-stat-number">${stats.avgEntriesPerParticipant}</div>
                <div class="participation-stat-label">Avg Entries per Participant</div>
            </div>
            <div class="participation-stat-card">
                <div class="participation-stat-number">${stats.avgDailyParticipation}</div>
                <div class="participation-stat-label">Avg Daily Participation</div>
            </div>
            <div class="participation-stat-card">
                <div class="participation-stat-number">${stats.mostActiveParticipant.id}</div>
                <div class="participation-stat-label">Most Active Participant (${stats.mostActiveParticipant.entries} entries)</div>
            </div>
            <div class="participation-stat-card">
                <div class="participation-stat-number">${stats.leastActiveParticipant.id}</div>
                <div class="participation-stat-label">Least Active Participant (${stats.leastActiveParticipant.entries} entries)</div>
            </div>
        `;
    }

    showParticipationChart(summaryData) {
        const chartData = this.participationAnalyzer.createChartData(summaryData);
        const chartContainer = document.getElementById('chartContainer');
        
        if (!chartData || chartData.length === 0) {
            chartContainer.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">No participation data available for chart.</p>';
            return;
        }

        // Find max value for scaling
        const maxEntries = Math.max(...chartData.map(d => d.entries));
        
        if (maxEntries === 0) {
            chartContainer.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">No participation entries found in the data.</p>';
            return;
        }
        
        let chartHTML = '<div class="chart-bars">';
        
        chartData.forEach(dataPoint => {
            const height = maxEntries > 0 ? Math.max((dataPoint.entries / maxEntries) * 200, 2) : 2; // Minimum 2px height
            const displayValue = dataPoint.entries > 0 ? dataPoint.entries : '';
            
            chartHTML += `
                <div class="chart-bar" style="height: ${height}px;" title="${dataPoint.formattedDate}: ${dataPoint.entries} entries">
                    ${displayValue ? `<div class="chart-bar-value">${displayValue}</div>` : ''}
                    <div class="chart-bar-label">
                        <div class="chart-bar-day">${dataPoint.dayNumber}</div>
                        <div class="chart-bar-month">${dataPoint.monthName}</div>
                    </div>
                </div>
            `;
        });
        
        chartHTML += '</div>';
        chartContainer.innerHTML = chartHTML;
    }

    // Get filtered date range based on selection
    getFilteredDateRange(allDates, days) {
        if (days === 'all') {
            return allDates;
        }
        
        const numDays = parseInt(days, 10);
        if (isNaN(numDays) || numDays <= 0) {
            return allDates;
        }
        
        // Get the most recent date (first in sorted descending order)
        if (allDates.length === 0) {
            return [];
        }
        
        const mostRecentDate = allDates[0]; // Already sorted descending
        const [year, month, day] = mostRecentDate.split('-').map(Number);
        const cutoffDate = new Date(Date.UTC(year, month - 1, day));
        // Subtract (numDays - 1) to get exactly numDays including the most recent date
        cutoffDate.setUTCDate(cutoffDate.getUTCDate() - (numDays - 1));
        
        // Filter dates that are within the range (inclusive of cutoff date)
        return allDates.filter(dateStr => {
            const [y, m, d] = dateStr.split('-').map(Number);
            const date = new Date(Date.UTC(y, m - 1, d));
            return date >= cutoffDate;
        });
    }

    // Filter summary data by date range and remove participants with no data
    filterDataByDateRange(summaryData, audioSummaryData, dateRange) {
        // Filter summary data
        const filteredSummary = summaryData.map(participant => {
            const filtered = {
                ParticipantID: participant.ParticipantID,
                TotalEntries: participant.TotalEntries,
                Incentive: participant.Incentive
            };
            
            // Only include dates in the filtered range
            dateRange.forEach(date => {
                filtered[date] = participant[date] || 0;
            });
            
            return filtered;
        }).filter(participant => {
            // Remove participants with no data in the filtered date range
            return dateRange.some(date => (participant[date] || 0) > 0);
        });
        
        // Filter audio summary data if available
        let filteredAudio = null;
        if (audioSummaryData && audioSummaryData.length > 0) {
            filteredAudio = audioSummaryData.map(participant => {
                const filtered = {
                    ParticipantID: participant.ParticipantID,
                    TotalTextAudio: participant.TotalTextAudio
                };
                
                // Only include dates in the filtered range
                dateRange.forEach(date => {
                    filtered[date] = participant[date] || 0;
                });
                
                return filtered;
            }).filter(participant => {
                // Remove participants with no data in the filtered date range
                return dateRange.some(date => (participant[date] || 0) > 0);
            });
        }
        
        return { filteredSummary, filteredAudio };
    }

    // Apply date filter and update display
    filterByDateRange(event) {
        // Check which section is active - main participation or analysis
        const participationResults = document.getElementById('participationResults');
        const analysisResults = document.getElementById('analysisResults');
        
        // Get the dateFilter from the event target, or fall back to the active section's filter
        const isAnalysisFallback = analysisResults && analysisResults.style.display !== 'none';
        const dateFilter = (event && event.target)
            ? event.target
            : document.getElementById(isAnalysisFallback ? 'analysisDateFilter' : 'participationDateFilter');
        const selectedDays = dateFilter && dateFilter.value ? dateFilter.value : 'all';
        
        // Determine which section is active based on visibility
        const isMainParticipation = participationResults && participationResults.style.display !== 'none';
        const isAnalysis = analysisResults && analysisResults.style.display !== 'none';
        
        if (isMainParticipation && this.originalSummaryData && this.originalSummaryData.length > 0) {
            // Main participation section
            // Get all available dates from original data
            const allDates = Object.keys(this.originalSummaryData[0] || {})
                .filter(key => {
                    if (key === 'ParticipantID' || key === 'TotalEntries' || key === 'Incentive') {
                        return false;
                    }
                    return /^\d{4}-\d{2}-\d{2}$/.test(key);
                })
                .sort()
                .reverse();
            
            // Get filtered date range
            const filteredDateRange = this.getFilteredDateRange(allDates, selectedDays);
            
            // Filter the data
            const { filteredSummary, filteredAudio } = this.filterDataByDateRange(
                this.originalSummaryData,
                this.originalAudioSummaryData,
                filteredDateRange
            );
            
            // Update participant filter dropdown
            this.populateParticipantFilter(filteredSummary);
            
            // Get current participant selection
            const participantSelect = document.getElementById('participantSelect');
            const selectedParticipant = participantSelect ? participantSelect.value : 'all';
            
            // Update chart and table
            if (selectedParticipant === 'all') {
                this.showParticipationChart(filteredSummary);
            } else {
                const chartData = this.participationAnalyzer.createParticipantChartData(filteredSummary, selectedParticipant);
                this.updateChartDisplay(chartData);
            }
            
            this.showParticipationTable(filteredSummary, filteredAudio);

            // Update calculate adherence table with filtered date range
            this.showCalculateAdherenceTable('participation', filteredSummary, filteredAudio);

            // Update incentive table with filtered date range (and participant if selected)
            if (this.originalIncentiveSummaryData) {
                let filteredIncentive = this.filterIncentiveByDateRange(this.originalIncentiveSummaryData, filteredDateRange);
                if (selectedParticipant !== 'all') {
                    filteredIncentive = filteredIncentive.filter(p => p.ParticipantID === selectedParticipant);
                }
                this.showIncentiveTable(filteredIncentive, filteredSummary, 'participationIncentiveTable');
            }
        } else if (isAnalysis && this.originalAnalysisSummaryData && this.originalAnalysisSummaryData.length > 0) {
            // Analysis section
            const summaryData = this.originalAnalysisSummaryData;
            
            // Get all available dates from data
            const allDates = Object.keys(summaryData[0] || {})
                .filter(key => {
                    if (key === 'ParticipantID' || key === 'TotalEntries' || key === 'Incentive') {
                        return false;
                    }
                    return /^\d{4}-\d{2}-\d{2}$/.test(key);
                })
                .sort()
                .reverse();
            
            // Get filtered date range
            const filteredDateRange = this.getFilteredDateRange(allDates, selectedDays);
            
            // Filter the data
            const { filteredSummary, filteredAudio } = this.filterDataByDateRange(
                summaryData,
                this.originalAnalysisAudioSummaryData,
                filteredDateRange
            );
            
            // Update participant filter dropdown
            this.populateAnalysisParticipantFilter(filteredSummary);
            
            // Get current participant selection
            const participantSelect = document.getElementById('analysisParticipantSelect');
            const selectedParticipant = participantSelect ? participantSelect.value : 'all';
            
            // Update chart and table
            if (selectedParticipant === 'all') {
                const chartData = this.participationAnalyzer.createChartData(filteredSummary);
                this.updateAnalysisChartDisplay(chartData);
            } else {
                const chartData = this.participationAnalyzer.createParticipantChartData(filteredSummary, selectedParticipant);
                this.updateAnalysisChartDisplay(chartData);
            }
            
            this.showAnalysisParticipationTable(filteredSummary, filteredAudio);

            // Update calculate adherence table with filtered date range
            this.showCalculateAdherenceTable('analysis', filteredSummary, filteredAudio);

            // Update incentive table with filtered date range (and participant if selected)
            if (this.originalAnalysisIncentiveSummaryData) {
                let filteredIncentive = this.filterIncentiveByDateRange(this.originalAnalysisIncentiveSummaryData, filteredDateRange);
                if (selectedParticipant !== 'all') {
                    filteredIncentive = filteredIncentive.filter(p => p.ParticipantID === selectedParticipant);
                }
                this.showIncentiveTable(filteredIncentive, filteredSummary, 'analysisIncentiveTable');
            }
        }
    }

    buildAdherenceTableHTML(summaryData, audioSummaryData, {
        strictDateFilter = false,
        firstEntryMap = null,
        audioFirstEntryMap = null
    } = {}) {
        const dateRange = Object.keys(summaryData[0] || {})
            .filter(key => {
                if (key === 'ParticipantID' || key === 'TotalEntries' || key === 'Incentive') {
                    return false;
                }
                if (strictDateFilter) {
                    return /^\d{4}-\d{2}-\d{2}$/.test(key);
                }
                return true;
            })
            .sort()
            .reverse();

        const audioByParticipant = {};
        if (audioSummaryData) {
            audioSummaryData.forEach(participant => {
                audioByParticipant[participant.ParticipantID] = participant;
            });
        }

        const resolvedFirstEntryMap = firstEntryMap || this.buildFirstEntryDateMap(summaryData);
        const resolvedAudioFirstEntryMap = audioFirstEntryMap || this.buildFirstEntryDateMap(audioSummaryData);

        let tableHTML = '<table><thead><tr>';
        tableHTML += '<th>Participant ID</th>';
        tableHTML += '<th>Total Entries</th>';
        tableHTML += '<th>Voice Diaries</th>';
        tableHTML += '<th>Total Compensation</th>';

        dateRange.forEach(date => {
            const formatted = this.formatDateForTable(date);
            tableHTML += `<th><div class="table-day-of-week">${formatted.dayOfWeek}</div><div class="table-date">${formatted.dateStr}</div></th>`;
        });

        tableHTML += '</tr></thead><tbody>';

        summaryData.forEach(participant => {
            const audioParticipant = audioByParticipant[participant.ParticipantID];
            const voiceDiaries = audioParticipant ? (audioParticipant.TotalTextAudio || 0) : 0;
            const compensation = participant.Incentive !== null && participant.Incentive !== undefined
                ? participant.Incentive
                : '-';
            const firstEntryDate = resolvedFirstEntryMap[String(participant.ParticipantID)]
                || this.getFirstEntryDateFromRow(participant);

            tableHTML += '<tr>';
            tableHTML += `<td class="participant-id">${participant.ParticipantID}</td>`;
            tableHTML += `<td class="entry-count">${participant.TotalEntries}</td>`;
            tableHTML += `<td class="voice-diaries-count">${voiceDiaries}</td>`;
            tableHTML += `<td class="total-compensation">${compensation}</td>`;

            dateRange.forEach(date => {
                tableHTML += this.renderDailyCountCell(participant[date] || 0, date, firstEntryDate);
            });

            tableHTML += '</tr>';
        });

        tableHTML += '</tbody></table>';

        if (audioSummaryData && audioSummaryData.length > 0) {
            tableHTML += '<div style="margin-top: 24px; padding: 12px 16px; background: #f8fafc; border-top: 2px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;"><h4 style="margin: 0; font-size: 1rem; color: #1e293b;">Voice Diaries</h4></div>';
            tableHTML += '<table><thead><tr>';
            tableHTML += '<th>Participant ID</th>';
            tableHTML += '<th>Voice Diaries</th>';

            dateRange.forEach(date => {
                const formatted = this.formatDateForTable(date);
                tableHTML += `<th><div class="table-day-of-week">${formatted.dayOfWeek}</div><div class="table-date">${formatted.dateStr}</div></th>`;
            });

            tableHTML += '</tr></thead><tbody>';

            audioSummaryData.forEach(participant => {
                const firstAudioDate = resolvedAudioFirstEntryMap[String(participant.ParticipantID)]
                    || this.getFirstEntryDateFromRow(participant);

                tableHTML += '<tr>';
                tableHTML += `<td class="participant-id">${participant.ParticipantID}</td>`;
                tableHTML += `<td class="voice-diaries-count">${participant.TotalTextAudio || 0}</td>`;

                dateRange.forEach(date => {
                    tableHTML += this.renderDailyCountCell(participant[date] || 0, date, firstAudioDate);
                });

                tableHTML += '</tr>';
            });

            tableHTML += '</tbody></table>';
        }

        return tableHTML;
    }

    showParticipationTable(summaryData, audioSummaryData) {
        const tableDiv = document.getElementById('participationTable');

        if (!summaryData || summaryData.length === 0) {
            tableDiv.innerHTML = '<p>No participation data available.</p>';
            return;
        }

        const firstEntryMap = this.buildFirstEntryDateMap(this.originalSummaryData || summaryData);
        const audioFirstEntryMap = this.buildFirstEntryDateMap(this.originalAudioSummaryData || audioSummaryData);
        tableDiv.innerHTML = this.buildAdherenceTableHTML(summaryData, audioSummaryData, {
            strictDateFilter: true,
            firstEntryMap,
            audioFirstEntryMap
        });
    }

    downloadParticipationCSV() {
        if (!this.participationData || !this.participationData.summary) {
            this.addMessage('No participation data available for download.', 'error');
            return;
        }

        const csvContent = this.participationAnalyzer.generateCSVContent(
            this.participationData.summary, 
            this.participationData.audioSummary
        );
        
        const today = new Date().toISOString().split('T')[0];
        this.downloadFile(csvContent, `fabla_participation_analysis_${today}.csv`, 'text/csv');
    }

    populateParticipantFilter(summaryData) {
        const participantSelect = document.getElementById('participantSelect');
        
        // Clear existing options except "All Participants"
        participantSelect.innerHTML = '<option value="all">All Participants</option>';
        
        // Add participant options
        summaryData.forEach(participant => {
            const option = document.createElement('option');
            option.value = participant.ParticipantID;
            option.textContent = `Participant ${participant.ParticipantID} (${participant.TotalEntries} entries)`;
            participantSelect.appendChild(option);
        });
    }

    filterChartByParticipant() {
        const participantSelect = document.getElementById('participantSelect');
        const selectedParticipant = participantSelect.value;
        
        if (!this.originalSummaryData || this.originalSummaryData.length === 0) {
            return;
        }
        
        // Get current date filter
        const dateFilter = document.getElementById('participationDateFilter');
        const selectedDays = dateFilter ? dateFilter.value : 'all';
        
        // Get all available dates from original data
        const allDates = Object.keys(this.originalSummaryData[0] || {})
            .filter(key => {
                if (key === 'ParticipantID' || key === 'TotalEntries' || key === 'Incentive') {
                    return false;
                }
                return /^\d{4}-\d{2}-\d{2}$/.test(key);
            })
            .sort()
            .reverse();
        
        // Get filtered date range
        const filteredDateRange = this.getFilteredDateRange(allDates, selectedDays);
        
        // Filter the data by date range
        const { filteredSummary, filteredAudio } = this.filterDataByDateRange(
            this.originalSummaryData,
            this.originalAudioSummaryData,
            filteredDateRange
        );
        
        // Now apply participant filter on date-filtered data
        let finalSummary = filteredSummary;
        let finalAudio = filteredAudio;
        
        if (selectedParticipant !== 'all') {
            finalSummary = filteredSummary.filter(p => p.ParticipantID === selectedParticipant);
            finalAudio = filteredAudio ? 
                filteredAudio.filter(p => p.ParticipantID === selectedParticipant) : null;
        }
        
        // Filter chart
        let chartData;
        if (selectedParticipant === 'all') {
            chartData = this.participationAnalyzer.createChartData(finalSummary);
        } else {
            chartData = this.participationAnalyzer.createParticipantChartData(finalSummary, selectedParticipant);
        }
        
        if (chartData) {
            this.updateChartDisplay(chartData);
        }
        
        // Show table with both filters applied
        this.showParticipationTable(finalSummary, finalAudio);

        // Update calculate adherence table with same participant + date filters
        this.showCalculateAdherenceTable('participation', finalSummary, finalAudio);

        // Update incentive table with same participant + date filters
        if (this.originalIncentiveSummaryData) {
            let filteredIncentive = this.filterIncentiveByDateRange(this.originalIncentiveSummaryData, filteredDateRange);
            if (selectedParticipant !== 'all') {
                filteredIncentive = filteredIncentive.filter(p => p.ParticipantID === selectedParticipant);
            }
            this.showIncentiveTable(filteredIncentive, finalSummary, 'participationIncentiveTable');
        }
    }

    updateChartDisplay(chartData) {
        const chartContainer = document.getElementById('chartContainer');
        
        if (!chartData || chartData.length === 0) {
            chartContainer.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">No chart data available.</p>';
            return;
        }

        // Find max value for scaling
        const maxEntries = Math.max(...chartData.map(d => d.entries));
        
        if (maxEntries === 0) {
            chartContainer.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">No participation entries found in the data.</p>';
            return;
        }
        
        let chartHTML = '<div class="chart-bars">';
        
        chartData.forEach(dataPoint => {
            const height = maxEntries > 0 ? Math.max((dataPoint.entries / maxEntries) * 200, 2) : 2; // Minimum 2px height
            const displayValue = dataPoint.entries > 0 ? dataPoint.entries : '';
            
            chartHTML += `
                <div class="chart-bar" style="height: ${height}px;" title="${dataPoint.formattedDate}: ${dataPoint.entries} entries">
                    ${displayValue ? `<div class="chart-bar-value">${displayValue}</div>` : ''}
                    <div class="chart-bar-label">
                        <div class="chart-bar-day">${dataPoint.dayNumber}</div>
                        <div class="chart-bar-month">${dataPoint.monthName}</div>
                    </div>
                </div>
            `;
        });
        
        chartHTML += '</div>';
        chartContainer.innerHTML = chartHTML;
    }

    backToResults() {
        const resultsDiv = document.getElementById('results');
        const participationDiv = document.getElementById('participationResults');
        const participationActionButtons = document.getElementById('participationActionButtons');
        
        participationDiv.style.display = 'none';
        participationActionButtons.style.display = 'none';
        resultsDiv.classList.add('show');
    }

    // Tool switching functionality
    switchTool(tool) {
        const aggregationTab = document.getElementById('aggregationTab');
        const analysisTab = document.getElementById('analysisTab');
        const transcriptTab = document.getElementById('transcriptTab');
        const cleaningTab = document.getElementById('cleaningTab');
        const issuesTab = document.getElementById('issuesTab');
        const aggregationCard = document.getElementById('aggregationCard');
        const analysisCard = document.getElementById('analysisCard');
        const transcriptCard = document.getElementById('transcriptCard');
        const cleaningCard = document.getElementById('cleaningCard');
        const issuesCard = document.getElementById('issuesCard');
        
        // Remove active class from all tabs
        aggregationTab.classList.remove('active');
        analysisTab.classList.remove('active');
        transcriptTab.classList.remove('active');
        cleaningTab.classList.remove('active');
        issuesTab.classList.remove('active');
        
        // Hide all cards
        aggregationCard.style.display = 'none';
        analysisCard.style.display = 'none';
        transcriptCard.style.display = 'none';
        cleaningCard.style.display = 'none';
        issuesCard.style.display = 'none';
        
        if (tool === 'aggregation') {
            aggregationTab.classList.add('active');
            aggregationCard.style.display = 'block';
        } else if (tool === 'analysis') {
            analysisTab.classList.add('active');
            analysisCard.style.display = 'block';
        } else if (tool === 'transcript') {
            transcriptTab.classList.add('active');
            transcriptCard.style.display = 'block';
        } else if (tool === 'cleaning') {
            cleaningTab.classList.add('active');
            cleaningCard.style.display = 'block';
        } else if (tool === 'issues') {
            issuesTab.classList.add('active');
            issuesCard.style.display = 'block';
        }
    }

    // Analysis-specific methods
    handleAnalysisDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const { valid, invalidMessage } = this.filterCsvUpload(Array.from(e.dataTransfer.files), {
            uploadAreaId: 'analysisUploadArea',
            inputId: 'analysisFileInput'
        });

        if (valid.length > 0) {
            this.processAnalysisFiles(valid);
        }
    }

    handleAnalysisFileSelect(e) {
        const { valid, invalidMessage } = this.filterCsvUpload(Array.from(e.target.files), {
            uploadAreaId: 'analysisUploadArea',
            inputId: 'analysisFileInput'
        });

        if (valid.length > 0) {
            this.processAnalysisFiles(valid);
        }
    }

    async processAnalysisFiles(files) {
        if (files.length === 0) return;

        this.showAnalysisLoading(true);
        this.clearAnalysisMessages();

        try {
            this.analysisFiles = [];
            const allData = [];

            for (const file of files) {
                try {
                    const data = await this.parseCSV(file);
                    this.analysisFiles.push({ name: file.name, data: data, rows: data.length });
                    allData.push(...data);
                    this.addAnalysisMessage(`✅ Loaded ${file.name}: ${data.length} rows`, 'success');
                } catch (error) {
                    this.addAnalysisMessage(`❌ Failed to load ${file.name}: ${error.message}`, 'error');
                }
            }

            if (allData.length > 0) {
                this.processAnalysisData(allData);
            } else {
                this.addAnalysisMessage('No valid CSV files could be processed.', 'error');
            }
        } catch (error) {
            this.addAnalysisMessage(`Processing error: ${error.message}`, 'error');
        } finally {
            this.showAnalysisLoading(false);
            this.updateAnalysisFileList();
        }
    }

    processAnalysisData(allData) {
        try {
            // Process the data for participation analysis
            this.analysisParticipationData = this.participationAnalyzer.processParticipationData(allData);
            
            if (this.analysisParticipationData.summary === null) {
                this.addAnalysisMessage(this.analysisParticipationData.message, 'error');
                return;
            }

            // Generate statistics
            const stats = this.participationAnalyzer.generateStats(this.analysisParticipationData.summary);
            
            // Hide upload area and show success state
            const analysisUploadArea = document.getElementById('analysisUploadArea');
            analysisUploadArea.style.display = 'none';
            
            // Display the analysis results
            this.showAnalysisResults(stats, this.analysisParticipationData.summary, this.analysisParticipationData.audioSummary, this.analysisParticipationData.incentiveSummary);
            
            this.addAnalysisMessage('📊 Participation analysis completed successfully!', 'success');
            
        } catch (error) {
            this.addAnalysisMessage(`Analysis error: ${error.message}`, 'error');
        }
    }

    showAnalysisResults(stats, summaryData, audioSummaryData, incentiveSummaryData = null) {
        const analysisResults = document.getElementById('analysisResults');
        analysisResults.style.display = 'block';
        
        // Store original data for filtering
        this.originalAnalysisSummaryData = JSON.parse(JSON.stringify(summaryData)); // Deep copy
        this.originalAnalysisAudioSummaryData = audioSummaryData ? JSON.parse(JSON.stringify(audioSummaryData)) : null;
        this.originalAnalysisIncentiveSummaryData = incentiveSummaryData ? JSON.parse(JSON.stringify(incentiveSummaryData)) : null;
        
        // Show participation statistics
        this.showAnalysisParticipationStats(stats);
        
        // Show action buttons
        const analysisActionButtons = document.getElementById('analysisActionButtons');
        analysisActionButtons.style.display = 'block';
        
        // Populate participant filter
        this.populateAnalysisParticipantFilter(summaryData);
        
        // Show chart
        this.showAnalysisParticipationChart(summaryData);
        
        // Show adherence table
        this.showAnalysisParticipationTable(summaryData, audioSummaryData);

        // Show calculate adherence table
        this.showCalculateAdherenceTable('analysis', summaryData, audioSummaryData);

        // Populate incentive table and reset to adherence tab
        if (incentiveSummaryData) {
            this.showIncentiveTable(incentiveSummaryData, summaryData, 'analysisIncentiveTable');
        }
        this.switchViewTab('analysis', 'adherence');
    }

    showAnalysisParticipationStats(stats) {
        const statsDiv = document.getElementById('analysisParticipationStats');
        
        statsDiv.innerHTML = `
            <div class="participation-stat-card">
                <div class="participation-stat-number">${stats.totalParticipants}</div>
                <div class="participation-stat-label">Total Participants</div>
            </div>
            <div class="participation-stat-card">
                <div class="participation-stat-number">${stats.totalEntries}</div>
                <div class="participation-stat-label">Total Entries</div>
            </div>
            <div class="participation-stat-card">
                <div class="participation-stat-number">${stats.avgEntriesPerParticipant}</div>
                <div class="participation-stat-label">Avg Entries per Participant</div>
            </div>
            <div class="participation-stat-card">
                <div class="participation-stat-number">${stats.avgDailyParticipation}</div>
                <div class="participation-stat-label">Avg Daily Participation</div>
            </div>
            <div class="participation-stat-card">
                <div class="participation-stat-number">${stats.mostActiveParticipant.id}</div>
                <div class="participation-stat-label">Most Active (${stats.mostActiveParticipant.entries} entries)</div>
            </div>
            <div class="participation-stat-card">
                <div class="participation-stat-number">${stats.leastActiveParticipant.id}</div>
                <div class="participation-stat-label">Least Active (${stats.leastActiveParticipant.entries} entries)</div>
            </div>
        `;
    }

    populateAnalysisParticipantFilter(summaryData) {
        const participantSelect = document.getElementById('analysisParticipantSelect');
        
        // Clear existing options except "All Participants"
        participantSelect.innerHTML = '<option value="all">All Participants</option>';
        
        // Add participant options
        summaryData.forEach(participant => {
            const option = document.createElement('option');
            option.value = participant.ParticipantID;
            option.textContent = `Participant ${participant.ParticipantID} (${participant.TotalEntries} entries)`;
            participantSelect.appendChild(option);
        });
    }

    showAnalysisParticipationChart(summaryData) {
        const chartData = this.participationAnalyzer.createChartData(summaryData);
        const chartContainer = document.getElementById('analysisChartContainer');
        
        if (!chartData || chartData.length === 0) {
            chartContainer.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">No participation data available for chart.</p>';
            return;
        }

        // Find max value for scaling
        const maxEntries = Math.max(...chartData.map(d => d.entries));
        
        if (maxEntries === 0) {
            chartContainer.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">No participation entries found in the data.</p>';
            return;
        }
        
        let chartHTML = '<div class="chart-bars">';
        
        chartData.forEach(dataPoint => {
            const height = maxEntries > 0 ? Math.max((dataPoint.entries / maxEntries) * 200, 2) : 2; // Minimum 2px height
            const displayValue = dataPoint.entries > 0 ? dataPoint.entries : '';
            
            chartHTML += `
                <div class="chart-bar" style="height: ${height}px;" title="${dataPoint.formattedDate}: ${dataPoint.entries} entries">
                    ${displayValue ? `<div class="chart-bar-value">${displayValue}</div>` : ''}
                    <div class="chart-bar-label">
                        <div class="chart-bar-day">${dataPoint.dayNumber}</div>
                        <div class="chart-bar-month">${dataPoint.monthName}</div>
                    </div>
                </div>
            `;
        });
        
        chartHTML += '</div>';
        chartContainer.innerHTML = chartHTML;
    }

    showAnalysisParticipationTable(summaryData, audioSummaryData) {
        const tableDiv = document.getElementById('analysisParticipationTable');

        if (!summaryData || summaryData.length === 0) {
            tableDiv.innerHTML = '<p>No participation data available.</p>';
            return;
        }

        const firstEntryMap = this.buildFirstEntryDateMap(this.originalAnalysisSummaryData || summaryData);
        const audioFirstEntryMap = this.buildFirstEntryDateMap(this.originalAnalysisAudioSummaryData || audioSummaryData);
        tableDiv.innerHTML = this.buildAdherenceTableHTML(summaryData, audioSummaryData, {
            firstEntryMap,
            audioFirstEntryMap
        });
    }

    // Switch between the Adherence, Calculate Adherence, and Incentive table views for a given section.
    // section: 'participation' | 'analysis'
    // tab:     'adherence' | 'calculate' | 'incentive'
    switchViewTab(section, tab) {
        const adherenceViewId  = section === 'analysis' ? 'analysisAdherenceView'       : 'participationAdherenceView';
        const calculateSectId  = section === 'analysis' ? 'analysisCalculateSection'   : 'participationCalculateSection';
        const incentiveSectId  = section === 'analysis' ? 'analysisIncentiveSection'    : 'participationIncentiveSection';
        const adherenceTabId   = section === 'analysis' ? 'analysisAdherenceTab'        : 'participationAdherenceTab';
        const calculateTabId   = section === 'analysis' ? 'analysisCalculateTab'        : 'participationCalculateTab';
        const incentiveTabId   = section === 'analysis' ? 'analysisIncentiveTab'        : 'participationIncentiveTab';

        const adherenceView = document.getElementById(adherenceViewId);
        const calculateSect = document.getElementById(calculateSectId);
        const incentiveSect = document.getElementById(incentiveSectId);
        const adherenceBtn  = document.getElementById(adherenceTabId);
        const calculateBtn  = document.getElementById(calculateTabId);
        const incentiveBtn  = document.getElementById(incentiveTabId);

        if (adherenceView) adherenceView.style.display = 'none';
        if (calculateSect) calculateSect.style.display = 'none';
        if (incentiveSect) incentiveSect.style.display = 'none';
        if (adherenceBtn)  adherenceBtn.classList.remove('active');
        if (calculateBtn)  calculateBtn.classList.remove('active');
        if (incentiveBtn)  incentiveBtn.classList.remove('active');

        if (tab === 'adherence') {
            if (adherenceView) adherenceView.style.display = 'block';
            if (adherenceBtn)  adherenceBtn.classList.add('active');
        } else if (tab === 'calculate') {
            if (calculateSect) calculateSect.style.display = 'block';
            if (calculateBtn)  calculateBtn.classList.add('active');
        } else {
            if (incentiveSect) incentiveSect.style.display = 'block';
            if (incentiveBtn)  incentiveBtn.classList.add('active');
        }
    }

    formatAdherencePercent(actual, expected) {
        if (!expected || expected <= 0) return null;
        return (actual / expected) * 100;
    }

    adherencePercentClass(pct) {
        if (pct === null || pct === undefined || isNaN(pct)) return '';
        if (pct >= 80) return 'is-high';
        if (pct >= 50) return 'is-mid';
        return 'is-low';
    }

    formatAdherencePercentDisplay(pct) {
        if (pct === null || pct === undefined || isNaN(pct)) return '—';
        return `${pct.toFixed(1)}%`;
    }

    handleCalculateAdherenceInput(section, inputEl) {
        const state = this.calculateAdherenceState[section];
        if (!state) return;

        if (inputEl.id.endsWith('ExpectedTotal')) {
            state.expectedTotal = inputEl.value;
        } else if (inputEl.id.endsWith('ExpectedAudio')) {
            state.expectedAudio = inputEl.value;
        } else if (inputEl.id.endsWith('StudyLength')) {
            state.lengthOfStudy = inputEl.value;
            // Changing study length re-applies auto-exclusion; drop forced includes
            state.forceInclude = new Set();
        }

        this.renderCalculateAdherenceTable(section);
    }

    resetCalculateAdherenceState(section) {
        const state = this.calculateAdherenceState[section];
        if (!state) return;
        state.expectedTotal = '';
        state.expectedAudio = '';
        state.lengthOfStudy = '';
        state.excluded = new Set();
        state.forceInclude = new Set();
        state.summaryData = null;
        state.audioSummaryData = null;
    }

    getParticipantFirstEntryDate(section, participantId) {
        const original = section === 'analysis'
            ? this.originalAnalysisSummaryData
            : this.originalSummaryData;
        const state = this.calculateAdherenceState[section];
        const source = original || (state && state.summaryData);
        if (!source) return null;

        const participant = source.find(p => String(p.ParticipantID) === String(participantId));
        return this.getFirstEntryDateFromRow(participant);
    }

    getStudyDaysElapsed(firstDateStr) {
        if (!firstDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(firstDateStr)) return null;

        const [year, month, day] = firstDateStr.split('-').map(Number);
        const firstUtc = Date.UTC(year, month - 1, day);
        const now = new Date();
        const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
        return Math.floor((todayUtc - firstUtc) / 86400000) + 1;
    }

    isParticipantStudyIncomplete(section, participantId) {
        const state = this.calculateAdherenceState[section];
        if (!state) return false;

        const length = parseFloat(state.lengthOfStudy);
        if (isNaN(length) || length <= 0) return false;

        const firstDate = this.getParticipantFirstEntryDate(section, participantId);
        if (!firstDate) return true;

        const daysElapsed = this.getStudyDaysElapsed(firstDate);
        if (daysElapsed === null) return true;

        return daysElapsed < length;
    }

    isParticipantIncludedInAdherence(section, participantId) {
        const state = this.calculateAdherenceState[section];
        if (!state) return true;

        const pid = String(participantId);
        if (state.forceInclude.has(pid)) return true;
        if (state.excluded.has(pid)) return false;
        if (this.isParticipantStudyIncomplete(section, pid)) return false;
        return true;
    }

    handleCalculateAdherenceToggle(section, participantId, included) {
        const state = this.calculateAdherenceState[section];
        if (!state) return;

        const pid = String(participantId);
        const incomplete = this.isParticipantStudyIncomplete(section, pid);

        if (included) {
            state.excluded.delete(pid);
            if (incomplete) {
                state.forceInclude.add(pid);
            } else {
                state.forceInclude.delete(pid);
            }
        } else {
            state.forceInclude.delete(pid);
            state.excluded.add(pid);
        }

        this.renderCalculateAdherenceTable(section);
    }

    showCalculateAdherenceTable(section, summaryData, audioSummaryData) {
        const state = this.calculateAdherenceState[section];
        if (!state) return;

        state.summaryData = summaryData;
        state.audioSummaryData = audioSummaryData;

        // Sync input fields with stored values
        const prefix = section === 'analysis' ? 'analysis' : 'participation';
        const expectedTotalInput = document.getElementById(`${prefix}ExpectedTotal`);
        const expectedAudioInput = document.getElementById(`${prefix}ExpectedAudio`);
        const studyLengthInput = document.getElementById(`${prefix}StudyLength`);
        if (expectedTotalInput && expectedTotalInput.value !== state.expectedTotal) {
            expectedTotalInput.value = state.expectedTotal;
        }
        if (expectedAudioInput && expectedAudioInput.value !== state.expectedAudio) {
            expectedAudioInput.value = state.expectedAudio;
        }
        if (studyLengthInput && studyLengthInput.value !== state.lengthOfStudy) {
            studyLengthInput.value = state.lengthOfStudy;
        }

        this.renderCalculateAdherenceTable(section);
    }

    renderCalculateAdherenceTable(section) {
        const state = this.calculateAdherenceState[section];
        const tableId = section === 'analysis' ? 'analysisCalculateTable' : 'participationCalculateTable';
        const tableDiv = document.getElementById(tableId);
        if (!state || !tableDiv) return;

        const summaryData = state.summaryData;
        const audioSummaryData = state.audioSummaryData;

        if (!summaryData || summaryData.length === 0) {
            tableDiv.innerHTML = '<p>No participation data available.</p>';
            return;
        }

        const expectedTotal = parseFloat(state.expectedTotal);
        const expectedAudio = parseFloat(state.expectedAudio);
        const studyLength = parseFloat(state.lengthOfStudy);
        const hasExpectedTotal = !isNaN(expectedTotal) && expectedTotal > 0;
        const hasExpectedAudio = !isNaN(expectedAudio) && expectedAudio > 0;
        const hasStudyLength = !isNaN(studyLength) && studyLength > 0;

        const dateRange = Object.keys(summaryData[0] || {})
            .filter(key => {
                if (key === 'ParticipantID' || key === 'TotalEntries' || key === 'Incentive') {
                    return false;
                }
                if (state.strictDateFilter) {
                    return /^\d{4}-\d{2}-\d{2}$/.test(key);
                }
                return true;
            })
            .sort()
            .reverse();

        const audioByParticipant = {};
        if (audioSummaryData) {
            audioSummaryData.forEach(participant => {
                audioByParticipant[participant.ParticipantID] = participant;
            });
        }

        let tableHTML = '<table><thead><tr>';
        tableHTML += '<th title="Include in overall study adherence">Include</th>';
        tableHTML += '<th>Participant ID</th>';
        tableHTML += '<th>Total Entries</th>';
        tableHTML += '<th>Total Adherence</th>';
        tableHTML += '<th>Voice Diaries</th>';
        tableHTML += '<th>Audio Adherence</th>';
        tableHTML += '<th>Total Compensation</th>';

        dateRange.forEach(date => {
            const formatted = this.formatDateForTable(date);
            tableHTML += `<th><div class="table-day-of-week">${formatted.dayOfWeek}</div><div class="table-date">${formatted.dateStr}</div></th>`;
        });

        tableHTML += '</tr></thead><tbody>';

        let includedCount = 0;
        let sumActualTotal = 0;
        let sumActualAudio = 0;
        let incompleteCount = 0;

        summaryData.forEach(participant => {
            const pid = String(participant.ParticipantID);
            const incomplete = this.isParticipantStudyIncomplete(section, pid);
            const included = this.isParticipantIncludedInAdherence(section, pid);
            const firstEntryDate = this.getParticipantFirstEntryDate(section, pid);
            const daysElapsed = firstEntryDate ? this.getStudyDaysElapsed(firstEntryDate) : null;
            const audioParticipant = audioByParticipant[participant.ParticipantID];
            const voiceDiaries = audioParticipant ? (audioParticipant.TotalTextAudio || 0) : 0;
            const totalEntries = participant.TotalEntries || 0;
            const compensation = participant.Incentive !== null && participant.Incentive !== undefined
                ? participant.Incentive
                : '-';

            const totalPct = hasExpectedTotal ? this.formatAdherencePercent(totalEntries, expectedTotal) : null;
            const audioPct = hasExpectedAudio ? this.formatAdherencePercent(voiceDiaries, expectedAudio) : null;

            if (incomplete && !included) incompleteCount += 1;

            if (included) {
                includedCount += 1;
                sumActualTotal += totalEntries;
                sumActualAudio += voiceDiaries;
            }

            let includeTitle = 'Include in overall study adherence';
            if (hasStudyLength) {
                if (!firstEntryDate) {
                    includeTitle = 'No submissions yet — study not started';
                } else if (incomplete) {
                    includeTitle = `Study in progress: day ${daysElapsed} of ${studyLength} (started ${firstEntryDate})`;
                } else {
                    includeTitle = `Study complete: day ${daysElapsed} of ${studyLength} (started ${firstEntryDate})`;
                }
            }

            const rowClass = included ? '' : ' class="calc-excluded"';
            tableHTML += `<tr${rowClass}>`;
            tableHTML += `<td class="calc-include-cell"><input type="checkbox" class="calc-adherence-include" data-section="${section}" data-participant-id="${pid}" title="${includeTitle}" ${included ? 'checked' : ''} /></td>`;
            tableHTML += `<td class="participant-id">${participant.ParticipantID}</td>`;
            tableHTML += `<td class="entry-count">${totalEntries}</td>`;
            tableHTML += `<td class="adherence-pct ${this.adherencePercentClass(totalPct)}">${this.formatAdherencePercentDisplay(totalPct)}</td>`;
            tableHTML += `<td class="voice-diaries-count">${voiceDiaries}</td>`;
            tableHTML += `<td class="adherence-pct ${this.adherencePercentClass(audioPct)}">${this.formatAdherencePercentDisplay(audioPct)}</td>`;
            tableHTML += `<td class="total-compensation">${compensation}</td>`;

            dateRange.forEach(date => {
                tableHTML += this.renderDailyCountCell(participant[date] || 0, date, firstEntryDate);
            });

            tableHTML += '</tr>';
        });

        tableHTML += '</tbody></table>';

        const overallTotalPct = hasExpectedTotal && includedCount > 0
            ? this.formatAdherencePercent(sumActualTotal, expectedTotal * includedCount)
            : null;
        const overallAudioPct = hasExpectedAudio && includedCount > 0
            ? this.formatAdherencePercent(sumActualAudio, expectedAudio * includedCount)
            : null;
        const excludedCount = summaryData.length - includedCount;

        let summaryNote = 'All visible participants included in overall calculation.';
        if (!hasExpectedTotal && !hasExpectedAudio) {
            summaryNote = 'Enter expected entry counts above to calculate adherence.';
        } else if (excludedCount > 0) {
            const incompleteNote = hasStudyLength && incompleteCount > 0
                ? ` ${incompleteCount} still mid-study (auto-unchecked).`
                : '';
            summaryNote = `${excludedCount} participant${excludedCount === 1 ? '' : 's'} excluded from overall calculation.${incompleteNote}`;
        } else if (hasStudyLength) {
            summaryNote = 'All visible participants have completed the study period and are included.';
        }

        tableHTML += `
            <div class="calc-adherence-summary">
                <div class="calc-adherence-summary-item">
                    <span class="calc-adherence-summary-label">Overall Total Adherence</span>
                    <span class="calc-adherence-summary-value">${this.formatAdherencePercentDisplay(overallTotalPct)}</span>
                </div>
                <div class="calc-adherence-summary-item">
                    <span class="calc-adherence-summary-label">Overall Audio Adherence</span>
                    <span class="calc-adherence-summary-value">${this.formatAdherencePercentDisplay(overallAudioPct)}</span>
                </div>
                <div class="calc-adherence-summary-item">
                    <span class="calc-adherence-summary-label">Included Participants</span>
                    <span class="calc-adherence-summary-value">${includedCount} / ${summaryData.length}</span>
                </div>
                <p class="calc-adherence-summary-note">${summaryNote}</p>
            </div>
        `;

        tableDiv.innerHTML = tableHTML;
    }

    // Filter incentive summary data to a subset of date columns
    filterIncentiveByDateRange(incentiveSummaryData, dateRange) {
        if (!incentiveSummaryData) return null;
        return incentiveSummaryData.map(participant => {
            const filtered = { ParticipantID: participant.ParticipantID };
            dateRange.forEach(date => {
                filtered[date] = participant[date] !== undefined ? participant[date] : null;
            });
            return filtered;
        });
    }

    // Render the incentive progression table.
    // incentiveSummaryData: array of { ParticipantID, "YYYY-MM-DD": rawValue|null, ... }
    // summaryData: the adherence summary (same shape), used to read diary counts for tooltip
    // containerId: the <div> id to inject into
    showIncentiveTable(incentiveSummaryData, summaryData, containerId) {
        const tableDiv = document.getElementById(containerId);
        if (!tableDiv) return;

        if (!incentiveSummaryData || incentiveSummaryData.length === 0) {
            tableDiv.innerHTML = '<p style="text-align:center;color:#64748b;padding:40px;">No incentive data available for the selected period.</p>';
            return;
        }

        const dateRange = Object.keys(incentiveSummaryData[0] || {})
            .filter(key => key !== 'ParticipantID' && /^\d{4}-\d{2}-\d{2}$/.test(key))
            .sort()
            .reverse();

        // Show "no data" message when there are no incentive values in the current date range
        const hasAny = incentiveSummaryData.some(p =>
            dateRange.some(d => p[d] !== null && p[d] !== undefined && p[d] !== '')
        );
        if (!hasAny) {
            tableDiv.innerHTML = '<p style="text-align:center;color:#64748b;padding:40px;">No incentive data available for the selected period.</p>';
            return;
        }

        // Only show participants that have at least one incentive value in the current date range
        const visibleParticipants = incentiveSummaryData.filter(p =>
            dateRange.some(d => p[d] !== null && p[d] !== undefined && p[d] !== '')
        );

        if (visibleParticipants.length === 0) {
            tableDiv.innerHTML = '<p style="text-align:center;color:#64748b;padding:40px;">No incentive data available for the selected period.</p>';
            return;
        }

        // Build lookup maps from adherence summaryData:
        //   diaryMap[pid][date]  → diary count (for tooltip)
        //   incentiveMap[pid]    → final (most-recent) incentive string (for header column)
        const diaryMap = {};
        const incentiveMap = {};
        if (summaryData) {
            summaryData.forEach(p => {
                diaryMap[p.ParticipantID] = {};
                dateRange.forEach(date => {
                    diaryMap[p.ParticipantID][date] = p[date] || 0;
                });
                if (p.Incentive !== null && p.Incentive !== undefined) {
                    incentiveMap[p.ParticipantID] = p.Incentive;
                }
            });
        }

        const originalForFirstEntry = containerId && containerId.includes('analysis')
            ? this.originalAnalysisSummaryData
            : this.originalSummaryData;
        const firstEntryMap = this.buildFirstEntryDateMap(originalForFirstEntry || summaryData);

        // Compute global min/max across visible participants for colour scaling
        const allNums = visibleParticipants.flatMap(p =>
            dateRange.map(d => {
                const v = p[d];
                if (v === null || v === undefined || v === '') return null;
                const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
                return isNaN(n) ? null : n;
            }).filter(n => n !== null)
        );
        const minVal = allNums.length > 0 ? Math.min(...allNums) : 0;
        const maxVal = allNums.length > 0 ? Math.max(...allNums) : 1;

        // Returns inline style string for a given raw incentive value.
        // Interpolates background from pale green (#dcfce7) to rich green (#16a34a)
        // and text from dark green (#14532d) to white, based on relative value.
        const cellStyle = (rawValue) => {
            if (rawValue === null || rawValue === undefined || rawValue === '') return '';
            const num = parseFloat(String(rawValue).replace(/[^0-9.-]/g, ''));
            if (isNaN(num)) return '';
            const t = maxVal > minVal ? (num - minVal) / (maxVal - minVal) : 0.5;
            const lerp = (a, b) => Math.round(a + (b - a) * t);
            const bg = `rgb(${lerp(220,22)},${lerp(252,163)},${lerp(231,74)})`;
            const fg = t > 0.55 ? '#ffffff' : '#14532d';
            return `background:${bg};color:${fg};`;
        };

        let tableHTML = '<table><thead><tr>';
        tableHTML += '<th>Participant ID</th>';
        tableHTML += '<th>Final Incentive</th>';
        dateRange.forEach(date => {
            const fmt = this.formatDateForTable(date);
            tableHTML += `<th><div class="table-day-of-week">${fmt.dayOfWeek}</div><div class="table-date">${fmt.dateStr}</div></th>`;
        });
        tableHTML += '</tr></thead><tbody>';

        visibleParticipants.forEach(participant => {
            const firstEntryDate = firstEntryMap[String(participant.ParticipantID)]
                || this.getFirstEntryDateFromRow(
                    (summaryData || []).find(p => String(p.ParticipantID) === String(participant.ParticipantID))
                );

            tableHTML += '<tr>';
            tableHTML += `<td class="participant-id">${participant.ParticipantID}</td>`;
            const finalIncentive = incentiveMap[participant.ParticipantID];
            tableHTML += `<td class="total-compensation">${finalIncentive !== null && finalIncentive !== undefined ? finalIncentive : '-'}</td>`;

            dateRange.forEach(date => {
                if (!firstEntryDate || date < firstEntryDate) {
                    tableHTML += `<td class="incentive-cell"></td>`;
                    return;
                }

                const val = participant[date];
                const diaryCount = (diaryMap[participant.ParticipantID] || {})[date] || 0;
                const tooltip = `${diaryCount} ${diaryCount === 1 ? 'diary' : 'diaries'} completed`;
                const style = cellStyle(val);
                const display = (val !== null && val !== undefined && val !== '') ? val : '';

                if (display) {
                    tableHTML += `<td class="incentive-cell has-tooltip" style="${style}" data-tooltip="${tooltip}">${display}</td>`;
                } else {
                    tableHTML += `<td class="incentive-cell"></td>`;
                }
            });

            tableHTML += '</tr>';
        });

        tableHTML += '</tbody></table>';
        tableDiv.innerHTML = tableHTML;
    }

    filterAnalysisChartByParticipant() {
        const participantSelect = document.getElementById('analysisParticipantSelect');
        const selectedParticipant = participantSelect.value;
        
        if (!this.analysisParticipationData || !this.analysisParticipationData.summary) {
            return;
        }
        
        // Filter chart
        let chartData;
        if (selectedParticipant === 'all') {
            chartData = this.participationAnalyzer.createChartData(this.analysisParticipationData.summary);
        } else {
            chartData = this.participationAnalyzer.createParticipantChartData(this.analysisParticipationData.summary, selectedParticipant);
        }
        
        if (chartData) {
            this.updateAnalysisChartDisplay(chartData);
        }
        
        // Filter table
        let filteredSummary = this.analysisParticipationData.summary;
        let filteredAudioSummary = this.analysisParticipationData.audioSummary;
        
        if (selectedParticipant !== 'all') {
            filteredSummary = this.analysisParticipationData.summary.filter(p => p.ParticipantID === selectedParticipant);
            filteredAudioSummary = this.analysisParticipationData.audioSummary ? 
                this.analysisParticipationData.audioSummary.filter(p => p.ParticipantID === selectedParticipant) : null;
        }
        
        this.showAnalysisParticipationTable(filteredSummary, filteredAudioSummary);

        // Update calculate adherence table with same participant filter
        this.showCalculateAdherenceTable('analysis', filteredSummary, filteredAudioSummary);

        // Update incentive table with same participant filter
        if (this.originalAnalysisIncentiveSummaryData) {
            let filteredIncentive = this.originalAnalysisIncentiveSummaryData;
            if (selectedParticipant !== 'all') {
                filteredIncentive = filteredIncentive.filter(p => p.ParticipantID === selectedParticipant);
            }
            this.showIncentiveTable(filteredIncentive, filteredSummary, 'analysisIncentiveTable');
        }
    }

    updateAnalysisChartDisplay(chartData) {
        const chartContainer = document.getElementById('analysisChartContainer');
        
        if (!chartData || chartData.length === 0) {
            chartContainer.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">No chart data available.</p>';
            return;
        }

        // Find max value for scaling
        const maxEntries = Math.max(...chartData.map(d => d.entries));
        
        if (maxEntries === 0) {
            chartContainer.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">No participation entries found in the data.</p>';
            return;
        }
        
        let chartHTML = '<div class="chart-bars">';
        
        chartData.forEach(dataPoint => {
            const height = maxEntries > 0 ? Math.max((dataPoint.entries / maxEntries) * 200, 2) : 2; // Minimum 2px height
            const displayValue = dataPoint.entries > 0 ? dataPoint.entries : '';
            
            chartHTML += `
                <div class="chart-bar" style="height: ${height}px;" title="${dataPoint.formattedDate}: ${dataPoint.entries} entries">
                    ${displayValue ? `<div class="chart-bar-value">${displayValue}</div>` : ''}
                    <div class="chart-bar-label">
                        <div class="chart-bar-day">${dataPoint.dayNumber}</div>
                        <div class="chart-bar-month">${dataPoint.monthName}</div>
                    </div>
                </div>
            `;
        });
        
        chartHTML += '</div>';
        chartContainer.innerHTML = chartHTML;
    }

    downloadAnalysisCSV() {
        if (!this.analysisParticipationData || !this.analysisParticipationData.summary) {
            this.addAnalysisMessage('No participation data available for download.', 'error');
            return;
        }

        const csvContent = this.participationAnalyzer.generateCSVContent(
            this.analysisParticipationData.summary, 
            this.analysisParticipationData.audioSummary
        );
        
        const today = new Date().toISOString().split('T')[0];
        this.downloadFile(csvContent, `fabla_participation_analysis_${today}.csv`, 'text/csv');
    }

    resetAnalysis() {
        this.analysisFiles = [];
        this.analysisParticipationData = null;
        this.originalAnalysisSummaryData = null;
        this.originalAnalysisAudioSummaryData = null;
        this.originalAnalysisIncentiveSummaryData = null;
        this.resetCalculateAdherenceState('analysis');
        
        document.getElementById('analysisFileInput').value = '';
        document.getElementById('analysisActionButtons').style.display = 'none';
        document.getElementById('analysisResults').style.display = 'none';
        document.getElementById('analysisIncentiveSection').style.display = 'none';
        const analysisCalculateSection = document.getElementById('analysisCalculateSection');
        if (analysisCalculateSection) analysisCalculateSection.style.display = 'none';
        document.getElementById('analysisFileList').innerHTML = '';
        document.getElementById('analysisParticipantSelect').innerHTML = '<option value="all">All Participants</option>';
        
        // Reset date filter
        const analysisDateFilter = document.getElementById('analysisDateFilter');
        if (analysisDateFilter) analysisDateFilter.value = 'all';

        // Reset calculate adherence inputs
        const expectedTotal = document.getElementById('analysisExpectedTotal');
        const expectedAudio = document.getElementById('analysisExpectedAudio');
        const studyLength = document.getElementById('analysisStudyLength');
        if (expectedTotal) expectedTotal.value = '';
        if (expectedAudio) expectedAudio.value = '';
        if (studyLength) studyLength.value = '';
        const calcTable = document.getElementById('analysisCalculateTable');
        if (calcTable) calcTable.innerHTML = '';
        
        // Show upload area again
        const analysisUploadArea = document.getElementById('analysisUploadArea');
        analysisUploadArea.style.display = 'block';
        this.clearUploadFieldError('analysisUploadArea');
        
        this.clearAnalysisMessages();
    }

    // Analysis helper methods
    showAnalysisLoading(show) {
        const loadingDiv = document.getElementById('analysisLoading');
        loadingDiv.classList.toggle('show', show);
    }

    addAnalysisMessage(message, type = 'info') {
        const messagesDiv = document.getElementById('analysisMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = type;
        messageDiv.textContent = message;
        messagesDiv.appendChild(messageDiv);
    }

    clearAnalysisMessages() {
        const messagesDiv = document.getElementById('analysisMessages');
        messagesDiv.innerHTML = '';
    }

    updateAnalysisFileList() {
        const fileListDiv = document.getElementById('analysisFileList');
        
        if (!this.analysisFiles || this.analysisFiles.length === 0) {
            fileListDiv.innerHTML = '';
            return;
        }

        // Calculate total rows
        const totalRows = this.analysisFiles.reduce((sum, file) => sum + file.rows, 0);
        
        // Show collapsible summary instead of full file list
        fileListDiv.innerHTML = `
            <div class="file-summary collapsible" onclick="this.classList.toggle('expanded')">
                <div class="file-summary-header">
                    <span class="file-icon">📁</span>
                    <span class="file-count">${this.analysisFiles.length} file${this.analysisFiles.length > 1 ? 's' : ''} processed</span>
                    <span class="file-rows">(${totalRows.toLocaleString()} total rows)</span>
                    <span class="chevron">▼</span>
                </div>
                <div class="file-summary-details">
                    ${this.analysisFiles.map(file => `
                        <div class="file-detail">
                            <span class="file-icon">📄</span>
                            <span class="file-name">${this.escapeHtml(file.name)}</span>
                            <span class="file-rows">${file.rows} rows</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // ==========================================
    // Duplicate Cleaning Methods
    // ==========================================

    handleCleaningDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const { valid, invalidMessage } = this.filterCsvUpload(Array.from(e.dataTransfer.files), {
            uploadAreaId: 'cleaningUploadArea',
            inputId: 'cleaningFileInput'
        });

        if (valid.length > 0) {
            this.processCleaningFile(valid[0]);
        }
    }

    handleCleaningFileSelect(e) {
        const { valid, invalidMessage } = this.filterCsvUpload(Array.from(e.target.files), {
            uploadAreaId: 'cleaningUploadArea',
            inputId: 'cleaningFileInput'
        });

        if (valid.length > 0) {
            this.processCleaningFile(valid[0]);
        }
    }

    async processCleaningFile(file) {
        if (!this.isCsvFile(file)) {
            this.showUploadFieldError('cleaningUploadArea', this.getInvalidFileTypeMessage([file]));
            this.clearUploadInput('cleaningFileInput');
            return;
        }

        this.showCleaningLoading(true);
        this.clearCleaningMessages();

        try {
            const data = await this.parseCSV(file);
            this.cleaningRawData = data;
            
            if (data.length === 0) {
                this.addCleaningMessage('The file contains no data rows.', 'error');
                this.showCleaningLoading(false);
                return;
            }

            const columns = Object.keys(data[0]);
            this.addCleaningMessage(`✅ Loaded ${file.name}: ${data.length} rows, ${columns.length} columns`, 'success');
            
            // Update file list
            this.updateCleaningFileList(file.name, data.length);

            // Validate required columns exist (robust to case, spaces, underscores, and BOM)
            const requiredCols = ['PromptID', 'ParticipantID', 'RespondedAt', 'Date'];
            const { resolvedColumns, missingCols } = this.resolveCleaningColumns(columns);
            if (missingCols.length > 0) {
                this.addCleaningMessage(`❌ Missing required columns: ${missingCols.join(', ')}. The file must contain PromptID, ParticipantID, RespondedAt, and Date columns.`, 'error');
                this.showCleaningLoading(false);
                return;
            }
            this.cleaningResolvedColumns = resolvedColumns;

            // Auto-run duplicate cleaning with fixed parameters
            this.runDuplicateCleaning();

        } catch (error) {
            this.addCleaningMessage(`❌ Failed to load ${file.name}: ${error.message}`, 'error');
            this.showCleaningLoading(false);
        }
    }

    runDuplicateCleaning() {
        if (this.cleaningRawData.length === 0) {
            this.addCleaningMessage('No data loaded. Please upload a file first.', 'error');
            return;
        }

        // Fixed columns for duplicate detection (resolved from uploaded header names)
        const resolved = this.cleaningResolvedColumns || {
            PromptID: 'PromptID',
            ParticipantID: 'ParticipantID',
            RespondedAt: 'RespondedAt',
            Date: 'Date'
        };
        const keyCols = [resolved.PromptID, resolved.ParticipantID, resolved.RespondedAt];
        const dateCol = resolved.Date;

        this.showCleaningLoading(true);

        try {
            const data = this.cleaningRawData;
            const totalBefore = data.length;

            // Helper to check if a value is empty/None/null
            const isEmpty = (val) => {
                if (val === undefined || val === null) return true;
                const s = String(val).trim().toLowerCase();
                return s === '' || s === 'none' || s === 'null' || s === 'undefined';
            };

            // Group rows by the composite key, but ONLY if all key column values
            // are non-empty. Rows with any empty key value are never considered duplicates.
            const groups = new Map();
            const ungroupedIndices = new Set(); // rows that can't be grouped (empty key values)

            data.forEach((row, index) => {
                const keyValues = keyCols.map(col => row[col] || '');

                // If any key value is empty/None, this row cannot be a duplicate
                if (keyValues.some(v => isEmpty(v))) {
                    ungroupedIndices.add(index);
                    return;
                }

                const key = keyValues.join('|||');

                if (!groups.has(key)) {
                    groups.set(key, []);
                }
                groups.get(key).push({ row, index });
            });

            // Find duplicate groups (groups with more than one entry AND different Date values)
            const duplicateGroups = [];
            const removedIndices = new Set();

            groups.forEach((entries, key) => {
                if (entries.length > 1) {
                    // Check that dates actually differ (true duplicates from failed uploads)
                    const uniqueDates = new Set(entries.map(e => e.row[dateCol] || ''));
                    if (uniqueDates.size <= 1) {
                        // Same date too — these are exact duplicates, not upload-retry duplicates.
                        // Still deduplicate them (keep first).
                    }

                    // Sort by datetime column (earliest first)
                    entries.sort((a, b) => {
                        const dateA = a.row[dateCol] || '';
                        const dateB = b.row[dateCol] || '';
                        return dateA.localeCompare(dateB);
                    });

                    // Keep the first (earliest), mark rest as removed
                    const kept = entries[0];
                    const removed = entries.slice(1);

                    removed.forEach(r => removedIndices.add(r.index));

                    duplicateGroups.push({
                        key: key,
                        kept: kept,
                        removed: removed,
                        all: entries
                    });
                }
            });

            // Build cleaned data - preserve original order, keep ungrouped rows and non-duplicates
            this.cleanedData = data.filter((row, index) => !removedIndices.has(index));
            this.cleaningDuplicateGroups = duplicateGroups;

            const totalAfter = this.cleanedData.length;
            const totalRemoved = totalBefore - totalAfter;

            this.addCleaningMessage(
                `🧹 Cleaning complete: Found ${duplicateGroups.length} duplicate group${duplicateGroups.length !== 1 ? 's' : ''}, removed ${totalRemoved} duplicate row${totalRemoved !== 1 ? 's' : ''}.`,
                'success'
            );

            // Show results
            this.showCleaningResults(totalBefore, duplicateGroups.length, totalRemoved, totalAfter, duplicateGroups);

        } catch (error) {
            this.addCleaningMessage(`Cleaning error: ${error.message}`, 'error');
        } finally {
            this.showCleaningLoading(false);
        }
    }

    showCleaningResults(totalBefore, groupCount, removedCount, totalAfter, duplicateGroups) {
        const resultsDiv = document.getElementById('cleaningResults');
        const statsDiv = document.getElementById('cleaningStats');
        const previewDiv = document.getElementById('cleaningDuplicatePreview');

        // Show stats
        statsDiv.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${totalBefore.toLocaleString()}</div>
                <div class="stat-label">Original Rows</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${groupCount.toLocaleString()}</div>
                <div class="stat-label">Duplicate Groups Found</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${removedCount.toLocaleString()}</div>
                <div class="stat-label">Rows Removed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalAfter.toLocaleString()}</div>
                <div class="stat-label">Final Rows</div>
            </div>
        `;

        // Show duplicate groups preview (first 10 groups) with ALL columns
        if (duplicateGroups.length > 0) {
            const maxGroups = Math.min(duplicateGroups.length, 10);
            // Use all columns from the data
            const allCols = Object.keys(this.cleaningRawData[0] || {});

            let html = '<div class="duplicate-groups-container">';
            html += `<h4>Detected Duplicate Groups (showing ${maxGroups} of ${duplicateGroups.length})</h4>`;

            for (let i = 0; i < maxGroups; i++) {
                const group = duplicateGroups[i];
                const keyParts = group.key.split('|||');
                const headerLabel = `PromptID: ${keyParts[0]}, ParticipantID: ${keyParts[1]}, RespondedAt: ${keyParts[2]}`;

                html += `<div class="duplicate-group">`;
                html += `<div class="duplicate-group-header">Group ${i + 1}: ${this.escapeHtml(headerLabel)}</div>`;
                html += '<div class="table-wrapper"><table><thead><tr>';
                html += '<th>Status</th>';
                allCols.forEach(col => {
                    html += `<th>${this.escapeHtml(col)}</th>`;
                });
                html += '</tr></thead><tbody>';

                // Show kept row
                const keptRow = group.kept.row;
                html += '<tr class="duplicate-row-kept">';
                html += '<td>Kept (earliest)</td>';
                allCols.forEach(col => {
                    html += `<td>${this.escapeHtml(keptRow[col] || '')}</td>`;
                });
                html += '</tr>';

                // Show removed rows
                group.removed.forEach(removed => {
                    html += '<tr class="duplicate-row-removed">';
                    html += '<td>Removed</td>';
                    allCols.forEach(col => {
                        html += `<td>${this.escapeHtml(removed.row[col] || '')}</td>`;
                    });
                    html += '</tr>';
                });

                html += '</tbody></table></div></div>';
            }

            if (duplicateGroups.length > maxGroups) {
                html += `<div class="show-more-duplicates">... and ${duplicateGroups.length - maxGroups} more duplicate group${duplicateGroups.length - maxGroups !== 1 ? 's' : ''}</div>`;
            }

            html += '</div>';
            previewDiv.innerHTML = html;
        } else {
            previewDiv.innerHTML = '<p style="text-align: center; color: #64748b; padding: 20px;">No duplicates found in the data.</p>';
        }

        // Hide upload area, show results
        document.getElementById('cleaningUploadArea').style.display = 'none';
        document.getElementById('cleaningActionButtons').style.display = 'block';
        resultsDiv.style.display = 'block';
    }

    downloadCleanedCSV() {
        if (this.cleanedData.length === 0) {
            this.addCleaningMessage('No cleaned data available for download.', 'error');
            return;
        }

        const columns = Object.keys(this.cleanedData[0] || {});
        let csvContent = columns.join(',') + '\n';

        this.cleanedData.forEach(row => {
            const values = columns.map(col => {
                const value = row[col] || '';
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    return '"' + value.replace(/"/g, '""') + '"';
                }
                return value;
            });
            csvContent += values.join(',') + '\n';
        });

        const today = new Date().toISOString().split('T')[0];
        this.downloadFile(csvContent, `fabla_cleaned_data_${today}.csv`, 'text/csv');
    }

    downloadCleanedExcel() {
        if (this.cleanedData.length === 0) {
            this.addCleaningMessage('No cleaned data available for download.', 'error');
            return;
        }

        try {
            const ws = XLSX.utils.json_to_sheet(this.cleanedData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Cleaned_Data');
            
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            const today = new Date().toISOString().split('T')[0];
            this.downloadBlob(blob, `fabla_cleaned_data_${today}.xlsx`);
        } catch (error) {
            this.addCleaningMessage(`Excel export error: ${error.message}`, 'error');
        }
    }

    resetCleaning() {
        this.cleaningRawData = [];
        this.cleanedData = [];
        this.cleaningDuplicateGroups = [];

        document.getElementById('cleaningFileInput').value = '';
        document.getElementById('cleaningActionButtons').style.display = 'none';
        document.getElementById('cleaningResults').style.display = 'none';
        document.getElementById('cleaningFileList').innerHTML = '';
        document.getElementById('cleaningStats').innerHTML = '';
        document.getElementById('cleaningDuplicatePreview').innerHTML = '';
        document.getElementById('cleaningPreview').innerHTML = '';

        // Show upload area again
        document.getElementById('cleaningUploadArea').style.display = 'block';
        this.clearUploadFieldError('cleaningUploadArea');

        this.clearCleaningMessages();
    }

    showCleaningLoading(show) {
        const loadingDiv = document.getElementById('cleaningLoading');
        loadingDiv.classList.toggle('show', show);
    }

    addCleaningMessage(message, type = 'info') {
        const messagesDiv = document.getElementById('cleaningMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = type;
        messageDiv.textContent = message;
        messagesDiv.appendChild(messageDiv);
    }

    clearCleaningMessages() {
        const messagesDiv = document.getElementById('cleaningMessages');
        messagesDiv.innerHTML = '';
    }

    updateCleaningFileList(fileName, rowCount) {
        const fileListDiv = document.getElementById('cleaningFileList');
        fileListDiv.innerHTML = `
            <div class="file-summary">
                <div class="file-summary-header">
                    <span class="file-icon">📄</span>
                    <span class="file-count">${this.escapeHtml(fileName)}</span>
                    <span class="file-rows">(${rowCount.toLocaleString()} rows)</span>
                </div>
            </div>
        `;
    }

    normalizeCleaningColumnName(name) {
        return String(name || '')
            .replace(/^\uFEFF/, '')
            .trim()
            .toLowerCase()
            .replace(/[\s_-]/g, '');
    }

    resolveCleaningColumns(columns) {
        const byNormalized = new Map();
        columns.forEach(col => {
            const normalized = this.normalizeCleaningColumnName(col);
            // Keep first seen header for a normalized key
            if (normalized && !byNormalized.has(normalized)) {
                byNormalized.set(normalized, col);
            }
        });

        const aliases = {
            PromptID: ['promptid'],
            ParticipantID: ['participantid'],
            RespondedAt: ['respondedat'],
            Date: ['date']
        };

        const resolvedColumns = {};
        const missingCols = [];

        Object.entries(aliases).forEach(([required, candidates]) => {
            const found = candidates.find(candidate => byNormalized.has(candidate));
            if (found) {
                resolvedColumns[required] = byNormalized.get(found);
            } else {
                missingCols.push(required);
            }
        });

        return { resolvedColumns, missingCols };
    }

    // Transcript-specific methods
    handleTranscriptDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const { valid, invalidMessage } = this.filterCsvUpload(Array.from(e.dataTransfer.files), {
            uploadAreaId: 'transcriptUploadArea',
            inputId: 'transcriptFileInput'
        });

        if (valid.length > 0) {
            this.processTranscriptFiles(valid);
        }
    }

    handleTranscriptFileSelect(e) {
        const { valid, invalidMessage } = this.filterCsvUpload(Array.from(e.target.files), {
            uploadAreaId: 'transcriptUploadArea',
            inputId: 'transcriptFileInput'
        });

        if (valid.length > 0) {
            this.processTranscriptFiles(valid);
        }
    }

    async processTranscriptFiles(files) {
        if (files.length === 0) return;

        const transcriptLoading = document.getElementById('transcriptLoading');
        const transcriptMessages = document.getElementById('transcriptMessages');
        const transcriptActionButtons = document.getElementById('transcriptActionButtons');
        const transcriptFileList = document.getElementById('transcriptFileList');

        transcriptLoading.style.display = 'flex';
        transcriptMessages.innerHTML = '';
        transcriptActionButtons.style.display = 'none';
        this.clearUploadFieldError('transcriptUploadArea');

        try {
            this.transcriptFiles = [];
            const allData = [];

            for (const file of files) {
                const text = await file.text();
                const parsed = this.parseCSVContent(text);
                allData.push(...parsed);
                this.transcriptFiles.push({
                    name: file.name,
                    size: file.size,
                    rows: parsed.length
                });
            }

            // Store merged data for transcript extraction
            this.transcriptData = allData;

            // Update file list
            this.updateTranscriptFileList();

            // Show success message
            this.addTranscriptMessage(`Successfully processed ${files.length} file(s) with ${allData.length} total rows.`, 'success');
            
            // Show action buttons
            transcriptActionButtons.style.display = 'flex';
        } catch (error) {
            console.error('Error processing transcript files:', error);
            this.addTranscriptMessage(`Error processing files: ${error.message}`, 'error');
        } finally {
            transcriptLoading.style.display = 'none';
        }
    }

    updateTranscriptFileList() {
        const fileListDiv = document.getElementById('transcriptFileList');
        
        if (!this.transcriptFiles || this.transcriptFiles.length === 0) {
            fileListDiv.innerHTML = '';
            return;
        }

        fileListDiv.innerHTML = `
            <div class="file-list-header">
                <h4>Uploaded Files (${this.transcriptFiles.length})</h4>
            </div>
            <div class="file-items">
                ${this.transcriptFiles.map((file, index) => `
                    <div class="file-item">
                        <span class="file-icon">📄</span>
                        <span class="file-name">${this.escapeHtml(file.name)}</span>
                        <span class="file-size">${this.formatFileSize(file.size)}</span>
                        <span class="file-rows">${file.rows} rows</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    downloadTranscript() {
        if (!this.transcriptData || this.transcriptData.length === 0) {
            this.addTranscriptMessage('No data available for extraction.', 'warning');
            return;
        }

        this.referenceTranscriptExtractor.extractAndDownload(
            this.transcriptData,
            this.downloadFile.bind(this),
            this.addTranscriptMessage.bind(this)
        );
    }

    resetTranscript() {
        this.transcriptFiles = [];
        this.transcriptData = [];
        
        const transcriptFileInput = document.getElementById('transcriptFileInput');
        const transcriptFileList = document.getElementById('transcriptFileList');
        const transcriptMessages = document.getElementById('transcriptMessages');
        const transcriptActionButtons = document.getElementById('transcriptActionButtons');
        
        transcriptFileInput.value = '';
        transcriptFileList.innerHTML = '';
        transcriptMessages.innerHTML = '';
        transcriptActionButtons.style.display = 'none';
        this.clearUploadFieldError('transcriptUploadArea');
    }

    addTranscriptMessage(message, type = 'info') {
        const messagesDiv = document.getElementById('transcriptMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = type;
        messageDiv.textContent = message;
        messagesDiv.appendChild(messageDiv);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CSVCollator();
});
