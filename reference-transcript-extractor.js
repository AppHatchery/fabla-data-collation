/**
 * Reference & Transcript Extractor Module
 * Extracts Date, Reference, and Transcript columns from data where Reference has data
 */

class ReferenceTranscriptExtractor {
    /**
     * Extract Date, Reference, and Transcript columns from data
     * @param {Array} data - Array of row objects to extract from
     * @param {Function} addMessage - Function to display messages (message, type)
     * @returns {Object|null} - Object with csvContent and rowCount if successful, null otherwise
     */
    extract(data, addMessage) {
        if (!data || data.length === 0) {
            if (addMessage) {
                addMessage('No data available for extraction.', 'warning');
            }
            return null;
        }

        // Filter rows where Reference has data (not empty, null, or whitespace)
        const filteredData = data.filter(row => {
            const reference = row['Reference'] || '';
            return reference.trim().length > 0;
        });

        if (filteredData.length === 0) {
            if (addMessage) {
                addMessage('No rows found with Reference data.', 'warning');
            }
            return null;
        }

        // Extract Date, Reference, and Transcript columns
        const columns = ['Date', 'Reference', 'Transcript'];
        let csvContent = columns.join(',') + '\n';

        filteredData.forEach(row => {
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

        return {
            csvContent: csvContent,
            rowCount: filteredData.length
        };
    }

    /**
     * Extract and download the Reference & Transcript CSV
     * @param {Array} data - Array of row objects to extract from
     * @param {Function} downloadFile - Function to download the CSV file (content, filename, mimeType)
     * @param {Function} addMessage - Function to display messages (message, type)
     */
    extractAndDownload(data, downloadFile, addMessage) {
        const result = this.extract(data, addMessage);
        
        if (result) {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            const filename = `fabla_reference_transcript_${today}.csv`;
            
            if (downloadFile) {
                downloadFile(result.csvContent, filename, 'text/csv');
            }
            
            if (addMessage) {
                addMessage(`Downloaded ${result.rowCount} rows with Reference data.`, 'success');
            }
        }
    }
}
