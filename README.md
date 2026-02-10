# 📊 Fabla Data Collation Tool

A browser-based tool for aggregating Fabla research data. Upload multiple CSV files, merge them intelligently, and remove duplicates with precision - all powered by advanced parsing technology.

## 🚀 Live Tool

**[Click here to use the tool](https://apphatchery.github.io/fabla-data-collation/)**

## ✨ Features

### Data Aggregation
- **📁 Multiple File Upload**: Drag & drop or browse to select multiple CSV files
- **🔧 ResponseID Deduplication**: Automatically removes duplicates based on ResponseID (keeps first occurrence)
- **👁️ Data Preview**: Preview your merged data before downloading
- **💾 Multiple Export Formats**: Download as CSV or Excel with automatic date stamping
- **📝 Transcript Extraction**: Extract Date, Reference, and Transcript columns for rows with Reference data
- **🛠️ Advanced CSV Parsing**: Handles multiline fields and complex CSV structures

### Participation Analysis
- **📊 Participation Dashboard**: Analyze participation patterns with detailed statistics
- **📈 Interactive Charts**: Visualize daily participation over time with scrollable bar charts
- **📋 Detailed Tables**: View participation data in scrollable tables with all dates
- **🔍 Participant Filtering**: Filter charts and tables by specific participants or view all
- **📅 Date Range Filtering**: Filter data by time periods (last 7 days, 15 days, 1-3 months, or all)
- **📊 Key Metrics**: Total participants, entries, averages, most/least active participants
- **🎯 End Time Analysis**: Focuses on end_time entries for accurate participation tracking
- **💰 Incentive Tracking**: Displays the most recent incentive value for each participant from Incentives entries

### Duplicate Cleaning
- **🧹 Upload Glitch Detection**: Automatically detects duplicate entries caused by data upload glitches
- **🔑 Smart Identification**: Identifies duplicates by matching PromptID, ParticipantID, and RespondedAt columns
- **📅 Earliest Entry Preserved**: Keeps the entry with the earliest upload timestamp (Date) for each duplicate group
- **🔍 Full Row Preview**: Review detected duplicate groups with all columns displayed for validation
- **⚡ Automatic Processing**: No configuration needed — upload a file and cleaning runs immediately
- **💾 Export Options**: Download cleaned data as CSV or Excel

### General
- **🔒 Privacy-First**: All processing happens locally in your browser - no data sent to external servers
- **📱 Mobile-Friendly**: Responsive design works on all devices
- **👻 Fabla Branding**: Authentic Fabla design with ghost cursor and professional styling

## 🎯 How to Use

### Data Aggregation Tool

1. **Upload Files**: Drag and drop CSV files or click to browse. You can upload multiple files at once.
2. **Review Settings**: The tool automatically uses ResponseID for deduplication and keeps the first occurrence of duplicates.
3. **Process Data**: The tool processes your files and removes duplicates automatically.
4. **Download Results**: 
   - **Download CSV/Excel**: Download your collated and deduplicated data as CSV or Excel format with automatic date stamping (e.g., `fabla_data_2024-09-24.csv`)
   - **Download Transcripts**: Extract and download only the Date, Reference, and Transcript columns for rows that have Reference data. This creates a focused CSV file (e.g., `fabla_reference_transcript_2024-09-24.csv`) containing only relevant transcript entries.

### Participation Analysis Tool

1. **Upload CSV Files**: Upload one or more CSV files containing participation data with `end_time` entries.
2. **View Analysis**: The tool automatically processes the data and displays:
   - **Statistics**: Total participants, entries, averages, and most/least active participants
   - **Daily Participation Chart**: Interactive bar chart showing participation over time
   - **Participation Table**: Detailed table with daily counts for each participant, including:
     - **Participant ID**: Unique identifier for each participant
     - **Total Entries**: Total number of participation entries
     - **Incentive**: Most recent incentive value from Incentives entries (if available)
     - **Daily Counts**: Participation counts for each date in the dataset
3. **Filter by Date Range**: Use the "Filter by Date" dropdown below the chart to view data for specific time periods:
   - **All**: Shows all available dates
   - **Last 7 days**: Shows only the most recent week
   - **Last 15 days**: Shows the last two weeks
   - **1 month**: Shows the last 30 days
   - **2 months**: Shows the last 60 days
   - **3 months**: Shows the last 90 days
   - Participants with no data in the selected range are automatically hidden
4. **Filter by Participant**: Use the dropdown selector to filter both the chart and table by a specific participant or view all participants. Date and participant filters work together.
5. **Download Results**: Download the participation summary as CSV for further analysis.

### Duplicate Cleaning Tool

1. **Upload File**: Upload a CSV file containing data with potential duplicates from upload glitches.
2. **Automatic Detection**: The tool automatically identifies duplicate entries where PromptID, ParticipantID, and RespondedAt all match but the Date (upload timestamp) differs.
3. **Review Duplicates**: Review the detected duplicate groups with full row details — all columns are displayed so you can validate each removal.
4. **Download Cleaned Data**: Download the cleaned dataset as CSV or Excel. The earliest upload timestamp is preserved for each duplicate group.

> **Note**: The file must contain `PromptID`, `ParticipantID`, `RespondedAt`, and `Date` columns. Rows where any of these values are empty or missing are never flagged as duplicates.

## 🛠️ Technical Details

- **Pure JavaScript**: No server-side processing required
- **Advanced CSV Parser**: Handles quoted fields, commas, multiline fields, and special characters
- **Memory Efficient**: Processes files directly in the browser
- **Cross-Browser Compatible**: Works in all modern browsers
- **Fixed Deduplication Logic**: Always uses ResponseID for consistent results
- **Automatic File Naming**: Downloads include current date for organization
- **Timezone-Safe Date Parsing**: Direct string parsing prevents date shift issues
- **Dynamic Date Ranges**: Automatically detects and displays all dates present in the data
- **Synchronized Filtering**: Participant and date filters apply to both charts and tables simultaneously
- **Smart Participant Filtering**: Automatically hides participants with no data in the selected date range
- **Modular Architecture**: Extraction and analysis logic separated into reusable modules

## 📋 Supported File Formats

- **Input**: CSV files (`.csv`)
- **Output**: CSV (`.csv`) and Excel (`.xlsx`)

## 🔧 Deployment to GitHub Pages

To deploy this tool to your own GitHub Pages site:

1. **Fork this repository** or create a new one
2. **Enable GitHub Pages**:
   - Go to your repository settings
   - Scroll to "Pages" section
   - Select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click "Save"
3. **Access your site**: `https://your-username.github.io/repository-name/`

## 📁 File Structure

```
fabla-data-collation/
├── index.html                      # Main HTML interface with Fabla branding
├── script.js                       # JavaScript processing logic with CSV parser and participation analysis
├── participation-analysis.js       # Core participation analysis logic
├── reference-transcript-extractor.js # Reference and transcript extraction module
├── fabla-icon.png                  # Fabla logo icon
├── fabla-ghost.png                 # Fabla ghost image (used as cursor)
├── fabla-ghost-cursor.png          # Fabla ghost cursor image
├── fabla-data-collate.py           # Original Python CLI tool
└── README.md                       # This file
```

## 🐍 Python CLI Tool

For users who prefer command-line processing or need to process large datasets, this repository also includes a Python CLI tool (`fabla-data-collate.py`) that provides the same functionality.

### Installation & Usage

1. **Clone the repository**:
   ```bash
   git clone https://github.com/apphatchery/fabla-data-collation.git
   cd fabla-data-collation
   ```

2. **Install Python dependencies**:
   ```bash
   pip install pandas
   ```

3. **Run the Python tool**:
   ```bash
   # Process all CSV files in a directory
   python3 fabla-data-collate.py -i ./your_csv_folder -o merged_data.csv
   
   # Process specific files
   python3 fabla-data-collate.py -i file1.csv file2.csv file3.csv -o merged_data.csv
   
   # Process recursively through subdirectories
   python3 fabla-data-collate.py -i ./your_csv_folder --recursive -o merged_data.csv
   ```

### Python Tool Features

- **Same deduplication logic**: Uses ResponseID and keeps first occurrence
- **Batch processing**: Handle multiple files or entire directories
- **Recursive processing**: Process subdirectories automatically
- **Flexible input**: Accept files, directories, or glob patterns
- **Memory efficient**: Processes large datasets without browser limitations

## 🔒 Privacy & Security

All data processing happens locally in your browser (web tool) or on your computer (Python tool). No data is sent to external servers, ensuring complete privacy and compliance with research data protection requirements.

## 🎨 Customization

The tool is easily customizable:

- **Styling**: Modify CSS in `index.html` (includes Fabla branding)
- **Functionality**: Extend JavaScript in `script.js`
- **Deduplication**: Currently fixed to ResponseID (can be modified in code)

## 🔍 Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📞 Support

If you encounter any issues or have questions, please open an issue on GitHub.
