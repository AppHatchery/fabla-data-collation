// CSV Collation Tool - Client-side JavaScript
class CSVCollator {
    constructor() {
        this.files = [];
        this.mergedData = [];
        this.participationAnalyzer = new ParticipationAnalyzer();
        this.participationData = null;
        
        // Analysis-specific properties
        this.analysisFiles = [];
        this.analysisParticipationData = null;
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
        
        return `${monthNames[parseInt(month, 10) - 1]} ${parseInt(day, 10)}`;
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
        const aggregationCard = document.getElementById('aggregationCard');
        const analysisCard = document.getElementById('analysisCard');
        
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
        
        // Tool selector events
        aggregationTab.addEventListener('click', () => this.switchTool('aggregation'));
        analysisTab.addEventListener('click', () => this.switchTool('analysis'));
        
        // Analysis-specific events
        analysisUploadArea.addEventListener('click', () => analysisFileInput.click());
        analysisUploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        analysisUploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        analysisUploadArea.addEventListener('drop', this.handleAnalysisDrop.bind(this));
        analysisFileInput.addEventListener('change', this.handleAnalysisFileSelect.bind(this));
        analysisParticipantSelect.addEventListener('change', this.filterAnalysisChartByParticipant.bind(this));
        downloadAnalysisCsv.addEventListener('click', this.downloadAnalysisCSV.bind(this));
        resetAnalysisBtn.addEventListener('click', this.resetAnalysis.bind(this));
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
        
        document.getElementById('fileInput').value = '';
        document.getElementById('actionButtons').style.display = 'none';
        document.getElementById('results').classList.remove('show');
        document.getElementById('participationResults').style.display = 'none';
        document.getElementById('fileList').innerHTML = '';
        document.getElementById('participantSelect').innerHTML = '<option value="all">All Participants</option>';
        
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

    showParticipationTable(summaryData, audioSummaryData) {
        const tableDiv = document.getElementById('participationTable');
        
        if (!summaryData || summaryData.length === 0) {
            tableDiv.innerHTML = '<p>No participation data available.</p>';
            return;
        }

        // Get the actual date range from the data (extract dates from summary data columns)
        const dateRange = Object.keys(summaryData[0] || {})
            .filter(key => key !== 'ParticipantID' && key !== 'TotalEntries')
            .sort()
            .reverse();
        
        let tableHTML = '<table><thead><tr>';
        tableHTML += '<th>Participant ID</th>';
        tableHTML += '<th>Total Entries</th>';
        
        // Add date columns (show all dates from data in scrollable table)
        dateRange.forEach(date => {
            const formattedDate = this.formatDateForTable(date);
            tableHTML += `<th>${formattedDate}</th>`;
        });
        
        tableHTML += '</tr></thead><tbody>';
        
        summaryData.forEach(participant => {
            tableHTML += '<tr>';
            tableHTML += `<td class="participant-id">${participant.ParticipantID}</td>`;
            tableHTML += `<td class="total-entries">${participant.TotalEntries}</td>`;
            
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
            tableHTML += '<h4 style="margin-top: 32px; margin-bottom: 16px;">Audio/TextAudio Entries</h4>';
            tableHTML += '<table><thead><tr>';
            tableHTML += '<th>Participant ID</th>';
            tableHTML += '<th>Total Entries</th>';
            
            dateRange.forEach(date => {
                const formattedDate = this.formatDateForTable(date);
                tableHTML += `<th>${formattedDate}</th>`;
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
        
        if (!this.participationData || !this.participationData.summary) {
            return;
        }
        
        let chartData;
        if (selectedParticipant === 'all') {
            chartData = this.participationAnalyzer.createChartData(this.participationData.summary);
        } else {
            chartData = this.participationAnalyzer.createParticipantChartData(this.participationData.summary, selectedParticipant);
        }
        
        if (chartData) {
            this.updateChartDisplay(chartData);
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
        const aggregationCard = document.getElementById('aggregationCard');
        const analysisCard = document.getElementById('analysisCard');
        
        if (tool === 'aggregation') {
            aggregationTab.classList.add('active');
            analysisTab.classList.remove('active');
            aggregationCard.style.display = 'block';
            analysisCard.style.display = 'none';
        } else if (tool === 'analysis') {
            analysisTab.classList.add('active');
            aggregationTab.classList.remove('active');
            aggregationCard.style.display = 'none';
            analysisCard.style.display = 'block';
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
            .filter(key => key !== 'ParticipantID' && key !== 'TotalEntries')
            .sort()
            .reverse();
        
        let tableHTML = '<table><thead><tr>';
        tableHTML += '<th>Participant ID</th>';
        tableHTML += '<th>Total Entries</th>';
        
        // Add date columns (show all dates from data in scrollable table)
        dateRange.forEach(date => {
            const formattedDate = this.formatDateForTable(date);
            tableHTML += `<th>${formattedDate}</th>`;
        });
        
        tableHTML += '</tr></thead><tbody>';
        
        summaryData.forEach(participant => {
            tableHTML += '<tr>';
            tableHTML += `<td class="participant-id">${participant.ParticipantID}</td>`;
            tableHTML += `<td class="total-entries">${participant.TotalEntries}</td>`;
            
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
            tableHTML += '<h4 style="margin-top: 32px; margin-bottom: 16px;">Audio/TextAudio Entries</h4>';
            tableHTML += '<table><thead><tr>';
            tableHTML += '<th>Participant ID</th>';
            tableHTML += '<th>Total Entries</th>';
            
            dateRange.forEach(date => {
                const formattedDate = this.formatDateForTable(date);
                tableHTML += `<th>${formattedDate}</th>`;
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
        
        let chartData;
        if (selectedParticipant === 'all') {
            chartData = this.participationAnalyzer.createChartData(this.analysisParticipationData.summary);
        } else {
            chartData = this.participationAnalyzer.createParticipantChartData(this.analysisParticipationData.summary, selectedParticipant);
        }
        
        if (chartData) {
            this.updateAnalysisChartDisplay(chartData);
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
        
        document.getElementById('analysisFileInput').value = '';
        document.getElementById('analysisActionButtons').style.display = 'none';
        document.getElementById('analysisResults').style.display = 'none';
        document.getElementById('analysisFileList').innerHTML = '';
        document.getElementById('analysisParticipantSelect').innerHTML = '<option value="all">All Participants</option>';
        
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
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CSVCollator();
});
