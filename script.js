// CSV Collation Tool - Client-side JavaScript
class CSVCollator {
    constructor() {
        this.files = [];
        this.mergedData = [];
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
        
        // Cleaning-specific properties
        this.cleaningRawData = [];
        this.cleanedData = [];
        this.cleaningDuplicateGroups = [];
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
        
        // Date filter event - use event delegation since there may be multiple date filters
        document.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'dateFilter') {
                this.filterByDateRange(e);
            }
        });
        
        // Tool selector events
        aggregationTab.addEventListener('click', () => this.switchTool('aggregation'));
        analysisTab.addEventListener('click', () => this.switchTool('analysis'));
        transcriptTab.addEventListener('click', () => this.switchTool('transcript'));
        
        // Cleaning tab
        const cleaningTab = document.getElementById('cleaningTab');
        cleaningTab.addEventListener('click', () => this.switchTool('cleaning'));
        
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

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
        );
        this.processFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
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
            const columns = Object.keys(this.mergedData[0] || {});

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

        const columns = Object.keys(this.mergedData[0] || {});
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
            const columns = Object.keys(this.mergedData[0] || {});
            const ws = XLSX.utils.json_to_sheet(this.mergedData);
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
        this.participationData = null;
        this.originalSummaryData = null;
        this.originalAudioSummaryData = null;
        
        document.getElementById('fileInput').value = '';
        document.getElementById('actionButtons').style.display = 'none';
        document.getElementById('results').classList.remove('show');
        document.getElementById('participationResults').style.display = 'none';
        document.getElementById('fileList').innerHTML = '';
        document.getElementById('participantSelect').innerHTML = '<option value="all">All Participants</option>';
        
        // Reset date filter
        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) {
            dateFilter.value = 'all';
        }
        
        // Show upload area and settings again
        const uploadArea = document.getElementById('uploadArea');
        const settingsSection = document.querySelector('.settings');
        uploadArea.style.display = 'block';
        settingsSection.style.display = 'block';
        
        this.clearMessages();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
            this.showParticipationResults(stats, this.participationData.summary, this.participationData.audioSummary);
            
            this.addMessage('Participation analysis completed successfully!', 'success');
            
        } catch (error) {
            this.addMessage(`Analysis error: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showParticipationResults(stats, summaryData, audioSummaryData) {
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
        
        // Populate participant filter
        this.populateParticipantFilter(summaryData);
        
        // Show chart
        this.showParticipationChart(summaryData);
        
        // Show table
        this.showParticipationTable(summaryData, audioSummaryData);
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
        // Get the dateFilter from the event target or find it
        const dateFilter = event && event.target ? event.target : document.getElementById('dateFilter');
        const selectedDays = dateFilter && dateFilter.value ? dateFilter.value : 'all';
        
        // Check which section is active - main participation or analysis
        const participationResults = document.getElementById('participationResults');
        const analysisResults = document.getElementById('analysisResults');
        
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
        }
    }

    showParticipationTable(summaryData, audioSummaryData) {
        const tableDiv = document.getElementById('participationTable');
        
        if (!summaryData || summaryData.length === 0) {
            tableDiv.innerHTML = '<p>No participation data available.</p>';
            return;
        }

        // Get the actual date range from the data (extract dates from summary data columns)
        // Only include keys that match YYYY-MM-DD date format and exclude known non-date columns
        const dateRange = Object.keys(summaryData[0] || {})
            .filter(key => {
                // Exclude known non-date columns
                if (key === 'ParticipantID' || key === 'TotalEntries' || key === 'Incentive') {
                    return false;
                }
                // Only include keys that match YYYY-MM-DD date format
                return /^\d{4}-\d{2}-\d{2}$/.test(key);
            })
            .sort()
            .reverse();
        
        let tableHTML = '<table><thead><tr>';
        tableHTML += '<th>Participant ID</th>';
        tableHTML += '<th>Total Entries</th>';
        tableHTML += '<th>Incentive</th>';
        
        // Add date columns (show all dates from data in scrollable table)
        dateRange.forEach(date => {
            const formatted = this.formatDateForTable(date);
            tableHTML += `<th><div class="table-day-of-week">${formatted.dayOfWeek}</div><div class="table-date">${formatted.dateStr}</div></th>`;
        });
        
        tableHTML += '</tr></thead><tbody>';
        
        summaryData.forEach(participant => {
            tableHTML += '<tr>';
            tableHTML += `<td class="participant-id">${participant.ParticipantID}</td>`;
            tableHTML += `<td class="total-entries">${participant.TotalEntries}</td>`;
            tableHTML += `<td class="total-entries">${participant.Incentive !== null && participant.Incentive !== undefined ? participant.Incentive : '-'}</td>`;
            
            dateRange.forEach(date => {
                const count = participant[date] || 0;
                const className = count > 0 ? 'daily-count has-entries' : 'daily-count';
                tableHTML += `<td class="${className}">${count}</td>`;
            });
            
            tableHTML += '</tr>';
        });
        
        tableHTML += '</tbody></table>';
        
        // Add audio summary if available
        if (audioSummaryData && audioSummaryData.length > 0) {
            tableHTML += '<div style="margin-top: 24px; padding: 12px 16px; background: #f8fafc; border-top: 2px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;"><h4 style="margin: 0; font-size: 1rem; color: #1e293b;">Audio/TextAudio Entries</h4></div>';
            tableHTML += '<table><thead><tr>';
            tableHTML += '<th>Participant ID</th>';
            tableHTML += '<th>Total Entries</th>';
            
            dateRange.forEach(date => {
                const formatted = this.formatDateForTable(date);
                tableHTML += `<th><div class="table-day-of-week">${formatted.dayOfWeek}</div><div class="table-date">${formatted.dateStr}</div></th>`;
            });
            
            tableHTML += '</tr></thead><tbody>';
            
            audioSummaryData.forEach(participant => {
                tableHTML += '<tr>';
                tableHTML += `<td class="participant-id">${participant.ParticipantID}</td>`;
                tableHTML += `<td class="total-entries">${participant.TotalTextAudio || 0}</td>`;
                
                dateRange.forEach(date => {
                    const count = participant[date] || 0;
                    const className = count > 0 ? 'daily-count has-entries' : 'daily-count';
                    tableHTML += `<td class="${className}">${count}</td>`;
                });
                
                tableHTML += '</tr>';
            });
            
            tableHTML += '</tbody></table>';
        }
        
        tableDiv.innerHTML = tableHTML;
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
        const dateFilter = document.getElementById('dateFilter');
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
        const aggregationCard = document.getElementById('aggregationCard');
        const analysisCard = document.getElementById('analysisCard');
        const transcriptCard = document.getElementById('transcriptCard');
        const cleaningCard = document.getElementById('cleaningCard');
        
        // Remove active class from all tabs
        aggregationTab.classList.remove('active');
        analysisTab.classList.remove('active');
        transcriptTab.classList.remove('active');
        cleaningTab.classList.remove('active');
        
        // Hide all cards
        aggregationCard.style.display = 'none';
        analysisCard.style.display = 'none';
        transcriptCard.style.display = 'none';
        cleaningCard.style.display = 'none';
        
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
        }
    }

    // Analysis-specific methods
    handleAnalysisDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
        );
        this.processAnalysisFiles(files);
    }

    handleAnalysisFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processAnalysisFiles(files);
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
            this.showAnalysisResults(stats, this.analysisParticipationData.summary, this.analysisParticipationData.audioSummary);
            
            this.addAnalysisMessage('📊 Participation analysis completed successfully!', 'success');
            
        } catch (error) {
            this.addAnalysisMessage(`Analysis error: ${error.message}`, 'error');
        }
    }

    showAnalysisResults(stats, summaryData, audioSummaryData) {
        const analysisResults = document.getElementById('analysisResults');
        analysisResults.style.display = 'block';
        
        // Store original data for filtering
        this.originalAnalysisSummaryData = JSON.parse(JSON.stringify(summaryData)); // Deep copy
        this.originalAnalysisAudioSummaryData = audioSummaryData ? JSON.parse(JSON.stringify(audioSummaryData)) : null;
        
        // Show participation statistics
        this.showAnalysisParticipationStats(stats);
        
        // Show action buttons
        const analysisActionButtons = document.getElementById('analysisActionButtons');
        analysisActionButtons.style.display = 'block';
        
        // Populate participant filter
        this.populateAnalysisParticipantFilter(summaryData);
        
        // Show chart
        this.showAnalysisParticipationChart(summaryData);
        
        // Show table
        this.showAnalysisParticipationTable(summaryData, audioSummaryData);
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

        // Get the actual date range from the data (extract dates from summary data columns)
        const dateRange = Object.keys(summaryData[0] || {})
            .filter(key => key !== 'ParticipantID' && key !== 'TotalEntries' && key !== 'Incentive')
            .sort()
            .reverse();
        
        let tableHTML = '<table><thead><tr>';
        tableHTML += '<th>Participant ID</th>';
        tableHTML += '<th>Total Entries</th>';
        tableHTML += '<th>Incentive</th>';
        
        // Add date columns (show all dates from data in scrollable table)
        dateRange.forEach(date => {
            const formatted = this.formatDateForTable(date);
            tableHTML += `<th><div class="table-day-of-week">${formatted.dayOfWeek}</div><div class="table-date">${formatted.dateStr}</div></th>`;
        });
        
        tableHTML += '</tr></thead><tbody>';
        
        summaryData.forEach(participant => {
            tableHTML += '<tr>';
            tableHTML += `<td class="participant-id">${participant.ParticipantID}</td>`;
            tableHTML += `<td class="total-entries">${participant.TotalEntries}</td>`;
            tableHTML += `<td class="total-entries">${participant.Incentive !== null && participant.Incentive !== undefined ? participant.Incentive : '-'}</td>`;
            
            dateRange.forEach(date => {
                const count = participant[date] || 0;
                const className = count > 0 ? 'daily-count has-entries' : 'daily-count';
                tableHTML += `<td class="${className}">${count}</td>`;
            });
            
            tableHTML += '</tr>';
        });
        
        tableHTML += '</tbody></table>';
        
        // Add audio summary if available
        if (audioSummaryData && audioSummaryData.length > 0) {
            tableHTML += '<div style="margin-top: 24px; padding: 12px 16px; background: #f8fafc; border-top: 2px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;"><h4 style="margin: 0; font-size: 1rem; color: #1e293b;">Audio/TextAudio Entries</h4></div>';
            tableHTML += '<table><thead><tr>';
            tableHTML += '<th>Participant ID</th>';
            tableHTML += '<th>Total Entries</th>';
            
            dateRange.forEach(date => {
                const formatted = this.formatDateForTable(date);
                tableHTML += `<th><div class="table-day-of-week">${formatted.dayOfWeek}</div><div class="table-date">${formatted.dateStr}</div></th>`;
            });
            
            tableHTML += '</tr></thead><tbody>';
            
            audioSummaryData.forEach(participant => {
                tableHTML += '<tr>';
                tableHTML += `<td class="participant-id">${participant.ParticipantID}</td>`;
                tableHTML += `<td class="total-entries">${participant.TotalTextAudio || 0}</td>`;
                
                dateRange.forEach(date => {
                    const count = participant[date] || 0;
                    const className = count > 0 ? 'daily-count has-entries' : 'daily-count';
                    tableHTML += `<td class="${className}">${count}</td>`;
                });
                
                tableHTML += '</tr>';
            });
            
            tableHTML += '</tbody></table>';
        }
        
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
        
        document.getElementById('analysisFileInput').value = '';
        document.getElementById('analysisActionButtons').style.display = 'none';
        document.getElementById('analysisResults').style.display = 'none';
        document.getElementById('analysisFileList').innerHTML = '';
        document.getElementById('analysisParticipantSelect').innerHTML = '<option value="all">All Participants</option>';
        
        // Reset date filter if it exists in analysis section
        const dateFilters = document.querySelectorAll('#dateFilter');
        dateFilters.forEach(filter => {
            if (filter.closest('#analysisResults')) {
                filter.value = 'all';
            }
        });
        
        // Show upload area again
        const analysisUploadArea = document.getElementById('analysisUploadArea');
        analysisUploadArea.style.display = 'block';
        
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
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
        );
        if (files.length > 0) {
            this.processCleaningFile(files[0]); // Only process the first file
        }
    }

    handleCleaningFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            this.processCleaningFile(files[0]);
        }
    }

    async processCleaningFile(file) {
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

            // Validate required columns exist
            const requiredCols = ['PromptID', 'ParticipantID', 'RespondedAt', 'Date'];
            const missingCols = requiredCols.filter(col => !columns.includes(col));
            if (missingCols.length > 0) {
                this.addCleaningMessage(`❌ Missing required columns: ${missingCols.join(', ')}. The file must contain PromptID, ParticipantID, RespondedAt, and Date columns.`, 'error');
                this.showCleaningLoading(false);
                return;
            }

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

        // Fixed columns for duplicate detection
        const keyCols = ['PromptID', 'ParticipantID', 'RespondedAt'];
        const dateCol = 'Date';

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

    // Transcript-specific methods
    handleTranscriptDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
        );
        this.processTranscriptFiles(files);
    }

    handleTranscriptFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processTranscriptFiles(files);
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

        try {
            this.transcriptFiles = [];
            const allData = [];

            for (const file of files) {
                const text = await file.text();
                const parsed = this.csvParser.parse(text);
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
    }

    addTranscriptMessage(message, type = 'info') {
        const messagesDiv = document.getElementById('transcriptMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messagesDiv.appendChild(messageDiv);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CSVCollator();
});
