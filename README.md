# 📊 Fabla Data Collation Tool

A browser-based tool for aggregating Fabla research data. Upload multiple CSV files, merge them intelligently, and remove duplicates with precision - all powered by advanced parsing technology.

## 🚀 Live Tool

**[Click here to use the tool](https://apphatchery.github.io/fabla-data-collation/)**

## ✨ Features

- **📁 Multiple File Upload**: Drag & drop or browse to select multiple CSV files
- **🔧 ResponseID Deduplication**: Automatically removes duplicates based on ResponseID (keeps first occurrence)
- **👁️ Data Preview**: Preview your merged data before downloading
- **💾 Multiple Export Formats**: Download as CSV or Excel with automatic date stamping
- **🔒 Privacy-First**: All processing happens locally in your browser - no data sent to external servers
- **📱 Mobile-Friendly**: Responsive design works on all devices
- **👻 Fabla Branding**: Authentic Fabla design with ghost cursor and professional styling
- **🛠️ Advanced CSV Parsing**: Handles multiline fields and complex CSV structures

## 🎯 How to Use

1. **Upload Files**: Drag and drop CSV files or click to browse. You can upload multiple files at once.
2. **Review Settings**: The tool automatically uses ResponseID for deduplication and keeps the first occurrence of duplicates.
3. **Process Data**: The tool processes your files and removes duplicates automatically.
4. **Download Results**: Download your collated and deduplicated data as CSV or Excel format with automatic date stamping (e.g., `fabla_data_2024-09-24.csv`).

## 🛠️ Technical Details

- **Pure JavaScript**: No server-side processing required
- **Advanced CSV Parser**: Handles quoted fields, commas, multiline fields, and special characters
- **Memory Efficient**: Processes files directly in the browser
- **Cross-Browser Compatible**: Works in all modern browsers
- **Fixed Deduplication Logic**: Always uses ResponseID for consistent results
- **Automatic File Naming**: Downloads include current date for organization

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
├── index.html          # Main HTML interface with Fabla branding
├── script.js           # JavaScript processing logic with fixed CSV parser
├── fabla-icon.png      # Fabla logo icon
├── fabla-ghost.png     # Fabla ghost image (used as cursor)
├── fabla-data-collate.py  # Original Python CLI tool
└── README.md           # This file
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
