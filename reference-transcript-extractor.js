/**
 * Reference & Transcript Extractor Module
 * Builds the transcripts CSV: one row per voice diary entry with a single
 * Response column (the transcript for audio, the typed answer for text) and
 * a Type column saying which it was.
 * Includes rows where Reference has data (audio), plus textaudio rows without
 * a Reference (typed answers).
 */

const TRANSCRIPT_COLUMNS = [
    'ResponseTime',
    'ExperimentCode',
    'ParticipantID',
    'QuestionTitle',
    'Type',
    'Reference',
    'Response',
    'ReviewFlag'
];

class ReferenceTranscriptExtractor {
    /**
     * Whether a row is a textaudio question answered without a reference file
     * @param {Object} row - Row object
     * @returns {boolean}
     */
    isTextAudioWithoutReference(row) {
        const questionType = String(row['QuestionsType'] || '').trim().toLowerCase();
        return questionType === 'textaudio' && !VoiceEntry.hasReference(row);
    }

    toCsvValue(value) {
        const text = String(value === null || value === undefined ? '' : value);
        if (/[",\n\r]/.test(text)) {
            return '"' + text.replace(/"/g, '""') + '"';
        }
        return text;
    }

    /**
     * Map a source row to a transcripts CSV record
     * @param {Object} row - Source row
     * @returns {Object} - Record keyed by TRANSCRIPT_COLUMNS
     */
    toTranscriptRecord(row) {
        const type = VoiceEntry.entryType(row);
        const isAudio = type === 'audio';
        const lowEffortReason = isAudio ? null : VoiceEntry.lowEffortReason(row['Response']);
        return {
            ResponseTime: VoiceEntry.submittedAt(row),
            ExperimentCode: row['ExperimentCode'] || '',
            ParticipantID: row['ParticipantID'] || '',
            QuestionTitle: row['QuestionTitle'] || '',
            Type: type,
            Reference: isAudio ? row['Reference'] : '',
            Response: isAudio ? (row['Transcript'] || '') : (row['Response'] || ''),
            ReviewFlag: lowEffortReason ? `Low effort: ${lowEffortReason}` : ''
        };
    }

    /**
     * Extract the transcripts CSV from data
     * @param {Array} data - Array of row objects to extract from
     * @param {Function} addMessage - Function to display messages (message, type)
     * @returns {Object|null} - csvContent plus row/type/flag counts if successful, null otherwise
     */
    extract(data, addMessage) {
        if (!data || data.length === 0) {
            if (addMessage) {
                addMessage('No data available for extraction.', 'warning');
            }
            return null;
        }

        // Keep rows where Reference has data, or textaudio rows answered without a reference
        const filteredData = data.filter(row => {
            return VoiceEntry.hasReference(row) || this.isTextAudioWithoutReference(row);
        });

        if (filteredData.length === 0) {
            if (addMessage) {
                addMessage('No rows found with Reference data or textaudio responses.', 'warning');
            }
            return null;
        }

        const records = filteredData.map(row => this.toTranscriptRecord(row));

        let csvContent = TRANSCRIPT_COLUMNS.join(',') + '\n';
        records.forEach(record => {
            csvContent += TRANSCRIPT_COLUMNS.map(col => this.toCsvValue(record[col])).join(',') + '\n';
        });

        return {
            csvContent: csvContent,
            rowCount: records.length,
            audioCount: records.filter(record => record.Type === 'audio').length,
            textCount: records.filter(record => record.Type === 'text').length,
            flaggedCount: records.filter(record => record.ReviewFlag).length,
            missingTimeCount: records.filter(record => !record.ResponseTime).length
        };
    }

    /**
     * Extract and download the transcripts CSV
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
                addMessage(`Downloaded ${result.rowCount} entries (${result.audioCount} audio, ${result.textCount} text).`, 'success');
                if (result.flaggedCount > 0) {
                    addMessage(`⚠️ ${result.flaggedCount} text ${result.flaggedCount === 1 ? 'entry was' : 'entries were'} flagged as short or low-effort for compensation review. See the ReviewFlag column.`, 'warning');
                }
                if (result.missingTimeCount > 0) {
                    addMessage(`${result.missingTimeCount} ${result.missingTimeCount === 1 ? 'entry has' : 'entries have'} no RespondedAt value, so ResponseTime is blank. Server receipt time is not used because it does not reflect when the participant submitted.`, 'warning');
                }
            }
        }
    }
}
