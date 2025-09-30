/**
 * Participation Analysis Module
 * Browser-compatible version of json-to-analysis.js functionality
 * Computes 30-day participation score from CSV data
 */

class ParticipationAnalyzer {
    constructor() {
        // Date range will be determined dynamically from data
    }

    // Helper function to parse date strings
    parseDate(dateStr) {
        if (!dateStr) return null;
        // Extract date part directly from timestamp string (e.g., "2025-08-14T22:04:21.678396" -> "2025-08-14")
        if (dateStr.includes('T')) {
            return dateStr.split('T')[0];
        }
        // If no 'T' found, try to parse as date
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    }

    // Helper function to format date as YYYY-MM-DD (extract date directly from timestamp)
    formatDate(date) {
        // If date is already a string (from parseDate), return it directly
        if (typeof date === 'string') {
            return date;
        }
        // Otherwise convert to ISO string and extract date part
        return date.toISOString().split('T')[0];
    }

    // Helper function to format date string (YYYY-MM-DD) without Date parsing
    formatDateForChart(dateStr) {
        // dateStr is in format 'YYYY-MM-DD' (e.g., '2025-08-14')
        const [year, month, day] = dateStr.split('-');
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        return {
            dayNumber: parseInt(day, 10),
            monthName: monthNames[parseInt(month, 10) - 1],
            formattedDate: `${monthNames[parseInt(month, 10) - 1]} ${parseInt(day, 10)}`
        };
    }

    // Helper function to get date range from actual data
    getDateRangeFromData(processedRows) {
        const uniqueDates = new Set();
        processedRows.forEach(row => {
            if (row.ResponseDate) {
                uniqueDates.add(row.ResponseDate);
            }
        });
        
        // Convert to array and sort (most recent first)
        const dates = Array.from(uniqueDates).sort().reverse();
        return dates;
    }

    // Main processing function
    processParticipationData(csvData) {
        console.log('Processing participation data...', csvData.length, 'rows');
        
        // Step 1: Filter for 'end_time' rows (like original json-to-analysis.js)
        const endTimeRows = csvData.filter(item => item.QuestionsType === 'end_time');
        
        console.log('End time rows found:', endTimeRows.length);
        
        if (endTimeRows.length === 0) {
            console.log('No end_time rows found. Skipping analysis.');
            return {
                summary: null,
                audioSummary: null,
                participantCount: 0,
                totalEntries: 0,
                message: 'No end_time rows found in the data.'
            };
        }
        
        // Step 2: Extract dates from Response column (like original)
        const processedRows = endTimeRows.map(row => {
            const responseDate = this.parseDate(row.Response);
            return {
                ...row,
                ResponseDate: responseDate ? this.formatDate(responseDate) : null
            };
        }).filter(row => row.ResponseDate !== null);
        
        console.log('Processed end_time rows with valid dates:', processedRows.length);
        
        // Step 3: Calculate total counts per participant
        const totalCounts = {};
        processedRows.forEach(row => {
            const pid = row.ParticipantID;
            totalCounts[pid] = (totalCounts[pid] || 0) + 1;
        });
        
        // Step 4: Calculate daily counts per participant
        const dailyCounts = {};
        processedRows.forEach(row => {
            const pid = row.ParticipantID;
            const date = row.ResponseDate;
            
            if (!dailyCounts[pid]) {
                dailyCounts[pid] = {};
            }
            dailyCounts[pid][date] = (dailyCounts[pid][date] || 0) + 1;
        });
        
        // Step 5: Create date range from actual data
        const dateRange = this.getDateRangeFromData(processedRows);
        
        // Step 6: Create summary data
        const summaryData = [];
        const participantIds = Object.keys(totalCounts);
        
        participantIds.forEach(pid => {
            const row = {
                ParticipantID: pid,
                TotalEntries: totalCounts[pid]
            };
            
            // Add daily counts for each day in the actual date range
            dateRange.forEach(date => {
                row[date] = dailyCounts[pid][date] || 0;
            });
            
            summaryData.push(row);
        });
        
        // Step 6: Process audio/textaudio rows if present
        const audioRows = csvData.filter(item => 
            item.QuestionsType === 'textaudio' || item.QuestionsType === 'audio'
        );
        
        let audioSummaryData = null;
        
        if (audioRows.length > 0) {
            console.log(`Found audio/textaudio entries. Generating second summary...`);
            
            // Extract dates from audio rows
            const processedAudioRows = audioRows.map(row => {
                let audioDate = null;
                
                // Try RespondedAt first, then Date
                if (row.RespondedAt) {
                    audioDate = this.parseDate(row.RespondedAt);
                } else if (row.Date) {
                    audioDate = this.parseDate(row.Date);
                }
                
                return {
                    ...row,
                    AudioDate: audioDate ? this.formatDate(audioDate) : null
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
                audioSummaryData = [];
                const audioParticipantIds = Object.keys(totalAudioCounts);
                
                audioParticipantIds.forEach(pid => {
                    const row = {
                        ParticipantID: pid,
                        TotalTextAudio: totalAudioCounts[pid]
                    };
                    
                    // Add daily counts for each day in the actual date range
                    dateRange.forEach(date => {
                        row[date] = dailyAudioCounts[pid][date] || 0;
                    });
                    
                    audioSummaryData.push(row);
                });
            }
        }
        
        return {
            summary: summaryData,
            audioSummary: audioSummaryData,
            participantCount: participantIds.length,
            totalEntries: Object.values(totalCounts).reduce((sum, count) => sum + count, 0),
            message: 'Analysis completed successfully.'
        };
    }

    // Generate participation statistics
    generateStats(summaryData) {
        if (!summaryData || summaryData.length === 0) {
            return {
                totalParticipants: 0,
                avgEntriesPerParticipant: 0,
                totalEntries: 0,
                mostActiveParticipant: null,
                leastActiveParticipant: null,
                avgDailyParticipation: 0,
                totalActiveDays: 0
            };
        }

        const totalParticipants = summaryData.length;
        const totalEntries = summaryData.reduce((sum, row) => sum + row.TotalEntries, 0);
        const avgEntriesPerParticipant = totalEntries / totalParticipants;

        // Find most and least active participants
        const sortedByActivity = [...summaryData].sort((a, b) => b.TotalEntries - a.TotalEntries);
        const mostActiveParticipant = sortedByActivity[0];
        const leastActiveParticipant = sortedByActivity[sortedByActivity.length - 1];

        // Calculate daily participation metrics
        let totalActiveDays = 0;
        const dailyTotals = {};
        
        // Get the actual date range from the data (extract dates from summary data columns)
        const dateRange = Object.keys(summaryData[0] || {})
            .filter(key => key !== 'ParticipantID' && key !== 'TotalEntries')
            .sort()
            .reverse();
        
        // Initialize daily totals
        dateRange.forEach(date => {
            dailyTotals[date] = 0;
        });
        
        summaryData.forEach(participant => {
            dateRange.forEach(date => {
                const count = participant[date] || 0;
                dailyTotals[date] += count;
                if (count > 0) {
                    totalActiveDays++;
                }
            });
        });

        // Calculate average daily participation
        const avgDailyParticipation = dateRange.length > 0 ? totalActiveDays / dateRange.length : 0;

        return {
            totalParticipants,
            avgEntriesPerParticipant: Math.round(avgEntriesPerParticipant * 100) / 100,
            totalEntries,
            mostActiveParticipant: {
                id: mostActiveParticipant.ParticipantID,
                entries: mostActiveParticipant.TotalEntries
            },
            leastActiveParticipant: {
                id: leastActiveParticipant.ParticipantID,
                entries: leastActiveParticipant.TotalEntries
            },
            avgDailyParticipation: Math.round(avgDailyParticipation * 100) / 100,
            totalActiveDays
        };
    }

    // Generate CSV content for download
    generateCSVContent(summaryData, audioSummaryData = null) {
        if (!summaryData || summaryData.length === 0) {
            return '';
        }

        // Get the actual date range from the data (extract dates from summary data columns)
        const dateRange = Object.keys(summaryData[0] || {})
            .filter(key => key !== 'ParticipantID' && key !== 'TotalEntries')
            .sort()
            .reverse();

        const headers = ['ParticipantID', 'TotalEntries', ...dateRange];
        let csvContent = headers.join(',') + '\n';

        // Add main summary data
        summaryData.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] || 0;
                return value;
            });
            csvContent += values.join(',') + '\n';
        });

        // Add audio summary if available
        if (audioSummaryData && audioSummaryData.length > 0) {
            csvContent += '\n\nTextAudio 30-Day Summary\n';
            const audioHeaders = ['ParticipantID', 'TotalTextAudio', ...dateRange];
            csvContent += audioHeaders.join(',') + '\n';
            
            audioSummaryData.forEach(row => {
                const values = audioHeaders.map(header => {
                    const value = row[header] || 0;
                    return value;
                });
                csvContent += values.join(',') + '\n';
            });
        }

        return csvContent;
    }

    // Create a participation chart data structure
    createChartData(summaryData) {
        if (!summaryData || summaryData.length === 0) {
            return null;
        }

        // Get the actual date range from the data (extract dates from summary data columns)
        const dateRange = Object.keys(summaryData[0] || {})
            .filter(key => key !== 'ParticipantID' && key !== 'TotalEntries')
            .sort()
            .reverse();

        // Calculate daily totals across all participants
        const dailyTotals = {};
        dateRange.forEach(date => {
            dailyTotals[date] = 0;
        });

        summaryData.forEach(participant => {
            dateRange.forEach(date => {
                dailyTotals[date] += participant[date] || 0;
            });
        });

        // Convert to chart format
        const chartData = dateRange.map(date => {
            const formatted = this.formatDateForChart(date);
            return {
                date: date,
                entries: dailyTotals[date],
                formattedDate: formatted.formattedDate,
                dayNumber: formatted.dayNumber,
                monthName: formatted.monthName
            };
        });

        return chartData;
    }

    // Create chart data for a specific participant
    createParticipantChartData(summaryData, participantId) {
        if (!summaryData || summaryData.length === 0) {
            return null;
        }

        // Find the specific participant
        const participant = summaryData.find(p => p.ParticipantID === participantId);
        if (!participant) {
            return null;
        }

        // Get the actual date range from the data (extract dates from summary data columns)
        const dateRange = Object.keys(summaryData[0] || {})
            .filter(key => key !== 'ParticipantID' && key !== 'TotalEntries')
            .sort()
            .reverse();

        // Convert to chart format for this participant
        const chartData = dateRange.map(date => {
            const formatted = this.formatDateForChart(date);
            return {
                date: date,
                entries: participant[date] || 0,
                formattedDate: formatted.formattedDate,
                dayNumber: formatted.dayNumber,
                monthName: formatted.monthName
            };
        });

        return chartData;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParticipationAnalyzer;
}
