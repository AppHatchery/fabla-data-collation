#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * JavaScript version of json-to-analysis.py
 * Computes 30-day participation score from DynamoDB JSON export
 */

// Helper function to flatten DynamoDB items
function flatten(item) {
    const flattened = {};
    for (const [key, value] of Object.entries(item)) {
        if (typeof value === 'object' && value !== null) {
            // Extract the actual value from DynamoDB format
            const valueKeys = Object.keys(value);
            if (valueKeys.length > 0) {
                flattened[key] = value[valueKeys[0]];
            }
        } else {
            flattened[key] = value;
        }
    }
    return flattened;
}

// Helper function to parse date strings
function parseDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Helper function to get date range for last 30 days
function getDateRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29);
    
    const dates = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(formatDate(new Date(d)));
    }
    return dates.reverse(); // Most recent first
}

// Helper function to write CSV
function writeCSV(data, filePath) {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header];
            // Handle empty values
            if (value === undefined || value === null) {
                return '';
            }
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(','))
    ].join('\n');
    
    fs.writeFileSync(filePath, csvContent);
}

// Helper function to read CSV with proper parsing
function readCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return [];
    
    // Parse CSV header
    const headers = parseCSVLine(lines[0]);
    
    // Parse data rows
    return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        return row;
    });
}

// Helper function to parse a single CSV line (handles quoted fields)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // Field separator
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add the last field
    result.push(current);
    
    return result;
}

// Main processing function
function processExperimentData(items, expCode, destFolder, originalJsonPath) {
    console.log(`Processing experiment: ${expCode}`);
    
    // Step 1: Save all data as CSV
    const downloadsPath = path.join(os.homedir(), 'Downloads');
    const csvBase = path.basename(originalJsonPath, '.json');
    const finalCsvBase = expCode !== 'SINGLE' ? `${csvBase}_${expCode}` : csvBase;
    
    const allDataPath = path.join(downloadsPath, `${finalCsvBase}.csv`);
    writeCSV(items, allDataPath);
    console.log(`Raw data saved to: ${allDataPath}`);
    
    // Step 2: Filter for 'end_time' rows
    const endTimeRows = items.filter(item => item.QuestionsType === 'end_time');
    
    if (endTimeRows.length === 0) {
        console.log(`No end_time rows found for ${expCode}. Skipping analysis.`);
        return;
    }
    
    // Step 3: Extract dates from Response column
    const processedRows = endTimeRows.map(row => {
        const responseDate = parseDate(row.Response);
        return {
            ...row,
            ResponseDate: responseDate ? formatDate(responseDate) : null
        };
    }).filter(row => row.ResponseDate !== null);
    
    // Step 4: Calculate total counts per participant
    const totalCounts = {};
    processedRows.forEach(row => {
        const pid = row.ParticipantID;
        totalCounts[pid] = (totalCounts[pid] || 0) + 1;
    });
    
    // Step 5: Calculate daily counts per participant
    const dailyCounts = {};
    processedRows.forEach(row => {
        const pid = row.ParticipantID;
        const date = row.ResponseDate;
        
        if (!dailyCounts[pid]) {
            dailyCounts[pid] = {};
        }
        dailyCounts[pid][date] = (dailyCounts[pid][date] || 0) + 1;
    });
    
    // Step 6: Create 30-day window
    const dateRange = getDateRange();
    
    // Step 7: Create summary data
    const summaryData = [];
    const participantIds = Object.keys(totalCounts);
    
    participantIds.forEach(pid => {
        const row = {
            ParticipantID: pid,
            TotalEntries: totalCounts[pid]
        };
        
        // Add daily counts for each day in the 30-day range
        dateRange.forEach(date => {
            row[date] = dailyCounts[pid][date] || 0;
        });
        
        summaryData.push(row);
    });
    
    // Step 8: Save 30-day summary
    const summaryPath = path.join(downloadsPath, `30_day_summary_${finalCsvBase}.csv`);
    writeCSV(summaryData, summaryPath);
    console.log(`30-day summary saved to: ${summaryPath}`);
    
    // Step 9: Process audio/textaudio rows if present
    const audioRows = items.filter(item => 
        item.QuestionsType === 'textaudio' || item.QuestionsType === 'audio'
    );
    
    if (audioRows.length > 0) {
        console.log(`📢 Found audio/textaudio entries for ${expCode}. Generating second summary...`);
        
        // Extract dates from audio rows
        const processedAudioRows = audioRows.map(row => {
            let audioDate = null;
            
            // Try RespondedAt first, then Date
            if (row.RespondedAt) {
                audioDate = parseDate(row.RespondedAt);
            } else if (row.Date) {
                audioDate = parseDate(row.Date);
            }
            
            return {
                ...row,
                AudioDate: audioDate ? formatDate(audioDate) : null
            };
        }).filter(row => row.AudioDate !== null);
        
        if (processedAudioRows.length > 0) {
            // Calculate total audio counts per participant
            const totalAudioCounts = {};
            processedAudioRows.forEach(row => {
                const pid = row.ParticipantID;
                totalAudioCounts[pid] = (totalAudioCounts[pid] || 0) + 1;
            });
            
            // Calculate daily audio counts per participant
            const dailyAudioCounts = {};
            processedAudioRows.forEach(row => {
                const pid = row.ParticipantID;
                const date = row.AudioDate;
                
                if (!dailyAudioCounts[pid]) {
                    dailyAudioCounts[pid] = {};
                }
                dailyAudioCounts[pid][date] = (dailyAudioCounts[pid][date] || 0) + 1;
            });
            
            // Create audio summary data
            const audioSummaryData = [];
            const audioParticipantIds = Object.keys(totalAudioCounts);
            
            audioParticipantIds.forEach(pid => {
                const row = {
                    ParticipantID: pid,
                    TotalTextAudio: totalAudioCounts[pid]
                };
                
                // Add daily counts for each day in the 30-day range
                dateRange.forEach(date => {
                    row[date] = dailyAudioCounts[pid][date] || 0;
                });
                
                audioSummaryData.push(row);
            });
            
            // Append audio summary to the main summary file
            const audioCsvContent = [
                '\n\nTextAudio 30-Day Summary',
                Object.keys(audioSummaryData[0]).join(','),
                ...audioSummaryData.map(row => 
                    Object.values(row).join(',')
                )
            ].join('\n');
            
            fs.appendFileSync(summaryPath, audioCsvContent);
            console.log(`✅ Appended TextAudio summary to CSV for ${expCode}.`);
        } else {
            console.log(`⚠️ No valid datetime found in audio/textaudio rows for ${expCode}. Skipping audio summary.`);
        }
    } else {
        console.log(`ℹ️ No audio/textaudio rows found for ${expCode}. Skipping second summary.`);
    }
    
    // Step 10: Upload to OneDrive if destination specified
    if (destFolder) {
        console.log(`📂 Upload destination: ${destFolder}`);
        
        const fablaBase = path.join(os.homedir(), 'Library/CloudStorage/OneDrive-Emory/Fabla Study Data');
        const onedriveTarget = path.join(fablaBase, destFolder);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(onedriveTarget)) {
            fs.mkdirSync(onedriveTarget, { recursive: true });
        }
        
        // Copy files
        fs.copyFileSync(summaryPath, path.join(onedriveTarget, path.basename(summaryPath)));
        fs.copyFileSync(allDataPath, path.join(onedriveTarget, path.basename(allDataPath)));
        
        console.log(`✅ Uploaded both CSVs to OneDrive folder: ${onedriveTarget}`);
    }
    
    return {
        summaryPath,
        allDataPath,
        participantCount: participantIds.length,
        totalEntries: Object.values(totalCounts).reduce((sum, count) => sum + count, 0)
    };
}

// Main execution
function main() {
    const args = process.argv.slice(2);
    let csvPath;
    
    if (args.length > 0) {
        csvPath = args[0];
    } else {
        console.log('Usage: node json-to-analysis.js <path-to-csv-file>');
        console.log('Example: node json-to-analysis.js ./data-export.csv');
        process.exit(1);
    }
    
    // Check if file exists
    if (!fs.existsSync(csvPath)) {
        console.error(`Error: File not found: ${csvPath}`);
        process.exit(1);
    }
    
    try {
        // Load CSV data
        const items = readCSV(csvPath);
        
        if (items.length === 0) {
            console.log('No items found in the CSV file.');
            return;
        }
        
        console.log(`Loaded ${items.length} items from ${csvPath}`);
        
        // Get destination from environment variable
        const destFromEnv = process.env.FABLA_DEST;
        
        // Process data
        const result = processExperimentData(items, 'SINGLE', destFromEnv, csvPath);
        
        console.log('\n📊 Summary:');
        console.log(`- Participants: ${result.participantCount}`);
        console.log(`- Total entries: ${result.totalEntries}`);
        console.log(`- Summary file: ${result.summaryPath}`);
        console.log(`- Raw data file: ${result.allDataPath}`);
        
    } catch (error) {
        console.error('Error processing file:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    processExperimentData,
    flatten,
    parseDate,
    formatDate,
    getDateRange,
    writeCSV,
    readCSV,
    parseCSVLine
};
