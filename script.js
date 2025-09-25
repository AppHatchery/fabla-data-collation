// CSV Collation Tool - Client-side JavaScript
class CSVCollator {
    constructor() {
        this.files = [];
        this.mergedData = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const downloadCsvBtn = document.getElementById('downloadCsv');
        const downloadExcelBtn = document.getElementById('downloadExcel');
        const resetBtn = document.getElementById('resetBtn');

        // File upload events
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Button events
        downloadCsvBtn.addEventListener('click', this.downloadCSV.bind(this));
        downloadExcelBtn.addEventListener('click', this.downloadExcel.bind(this));
        resetBtn.addEventListener('click', this.reset.bind(this));
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

            let tableHTML = '<table><thead><tr>';
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

            tableHTML += '</tbody></table>';
            previewDiv.innerHTML = tableHTML;
        } else {
            previewDiv.innerHTML = '';
        }

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

        let html = '<h3>📁 Uploaded Files</h3>';
        this.files.forEach(file => {
            html += `
                <div class="file-item">
                    <div class="file-info">
                        <span class="file-icon">📄</span>
                        <span><strong>${this.escapeHtml(file.name)}</strong> - ${file.rows} rows</span>
                    </div>
                </div>
            `;
        });

        fileListDiv.innerHTML = html;
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
        
        document.getElementById('fileInput').value = '';
        document.getElementById('results').classList.remove('show');
        document.getElementById('fileList').innerHTML = '';
        this.clearMessages();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CSVCollator();
});
