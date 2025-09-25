# 📊 CSV Collation & Deduplication Tool

A browser-based tool for merging multiple CSV files and removing duplicates. No installation required - just open the webpage and start using it!

## 🚀 Live Demo

**[Click here to use the tool](https://your-username.github.io/fabla-data-collation/)**

## ✨ Features

- **📁 Multiple File Upload**: Drag & drop or browse to select multiple CSV files
- **🔧 Flexible Deduplication**: Choose to deduplicate on ResponseID, custom columns, or all columns
- **👁️ Data Preview**: Preview your merged data before downloading
- **💾 Multiple Export Formats**: Download as CSV or Excel
- **🔒 Privacy-First**: All processing happens in your browser - no data sent to servers
- **📱 Mobile-Friendly**: Responsive design works on all devices

## 🎯 How to Use

1. **Upload Files**: Drag and drop CSV files or click to browse
2. **Configure Settings**: 
   - Choose deduplication mode (ResponseID, custom columns, or all columns)
   - Select which duplicate to keep (first or last occurrence)
   - Set preview preferences
3. **Process**: The tool automatically merges and deduplicates your data
4. **Download**: Get your processed data as CSV or Excel file

## 🛠️ Technical Details

- **Pure JavaScript**: No server-side processing required
- **CSV Parser**: Handles quoted fields, commas, and special characters
- **Memory Efficient**: Processes files directly in the browser
- **Cross-Browser Compatible**: Works in all modern browsers

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
├── index.html          # Main HTML interface
├── script.js           # JavaScript processing logic
├── fabla-data-collate.py  # Original Python CLI tool
└── README.md           # This file
```

## 🎨 Customization

The tool is easily customizable:

- **Styling**: Modify CSS in `index.html`
- **Functionality**: Extend JavaScript in `script.js`
- **Default Settings**: Change default values in the HTML form elements

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
