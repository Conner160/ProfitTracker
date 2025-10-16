# ProfitTracker

A Progressive Web App (PWA) for tracking piece-rate earnings, kilometers driven, and per diem payments.

## Features

- Track daily points earned with customizable rate ($7.00/point default)
- Record kilometers driven with mileage rate ($0.84/km default)
- Track per diem payments ($171 default)
- Pay period tracking (bi-weekly starting July 5, 2025)
- GST calculation (5%)
- **Travel Sheet Generation**: Export entries to Excel format with customizable tech codes
- Land location tracking with multiple locations per day
- All data stored locally on the user's device
- Works offline (PWA)
- Editable entries with delete confirmation
- Duplicate date prevention

## Setup

1. Clone this repository
2. Open `index.html` in a browser
3. For GitHub Pages deployment:
   - Push to a GitHub repository
   - Enable GitHub Pages in repository settings

## Technologies

- HTML5
- CSS3
- JavaScript
- IndexedDB for local storage
- Service Workers for offline functionality
- Web App Manifest for PWA installation

## Travel Sheet Generation

The app now includes Excel travel sheet generation with the following features:

- **Format**: Generates `.xlsx` files compatible with Excel
- **Tech Code Support**: Set your tech code in settings (format: C###, e.g., A123, B456)
- **File Naming**: `[TechCode]_Travel_[StartDate]-[EndDate].xlsx`
- **Date Format**: Dates exported as DD-MMM-YYYY (e.g., 15-Oct-2025)
- **Location Mapping**:
  - Column A (A29:A50): Entry dates
  - Column B (B29:B50): Primary location from each entry
  - Column C (C29:C50): Additional locations (comma-separated)
- **Smart Row Insertion**: Automatically adds rows if more than 22 entries
- **Template Support**: Place your own `travel-sheet-template.xlsx` in the root directory
- **Validation**: Only includes entries with location data

### Using Custom Templates

1. Create your Excel template with your company formatting
2. Save as `travel-sheet-template.xlsx` in the project root
3. Ensure rows 29+ are available for data entry
4. The system will preserve all your formatting and formulas

## Future Enhancements

- Additional export formats (PDF, CSV)
- Detailed reports and summaries  
- Charts and visualizations
- Cloud backup option
