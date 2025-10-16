# Travel Sheet Generator - Testing Instructions

## Setup for Testing

1. **Set Tech Code**: 
   - Click the ⚙️ Settings button
   - Enter a tech code (e.g., "A123", "B456") in the format C###
   - Click "Save Settings"

2. **Add Test Entries with Locations**:
   - Create a few daily entries with different dates
   - For each entry, click "Add Location" and add 1-3 land locations
   - Save the entries

## Test Cases

### Basic Functionality
- [ ] Generate travel sheet with 1-5 entries
- [ ] Verify dates appear in DD-MMM-YYYY format (e.g., 15-Oct-2025)
- [ ] Check first location appears in column B
- [ ] Check additional locations appear in column C (comma-separated)

### Edge Cases  
- [ ] Generate with no entries (should show error message)
- [ ] Generate with entries but no locations (should show error message)
- [ ] Generate with more than 22 entries (should insert additional rows)
- [ ] Generate without tech code set (should prompt for confirmation)

### Error Handling
- [ ] Disable internet and test (should still work offline)
- [ ] Test with malformed location data
- [ ] Verify user-friendly error messages

## Expected Behavior

**Success Case**: 
- Shows "Generating travel sheet..." notification
- Downloads file named: `[TechCode]_Travel_[StartDate]-[EndDate].xlsx`
- Shows success message with entry count
- Excel file opens correctly with your data

**Error Cases**:
- Clear, non-technical error messages
- No file download on error
- Specific guidance for resolution

## File Structure Test

The downloaded Excel file should have:
- **Column A (A29+)**: Dates in DD-MMM-YYYY format
- **Column B (B29+)**: First location from each entry
- **Column C (C29+)**: Additional locations joined with commas
- **Proper formatting**: Borders, headers, structured layout

## Template Testing (Advanced)

1. Create a custom Excel file named `travel-sheet-template.xlsx`
2. Place in project root directory  
3. Ensure rows 29+ are available for data
4. Generate travel sheet - should use your template formatting