
/**
 * CSV Row interface
 */
export interface CSVRow {
  [key: string]: string;
}

/**
 * Parses a CSV string into an array of objects
 * @param csvString The CSV string to parse
 * @returns Array of objects where each object represents a row with column names as keys
 */
export const parseCSV = (csvString: string): CSVRow[] => {
  try {
    // Split the CSV string into lines
    const lines = csvString.split(/\r?\n/).filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      return [];
    }
    
    // Parse the header row
    const headers = parseCSVLine(lines[0]);
    
    // Parse each data row
    const records: CSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      // Skip empty lines
      if (values.length === 0) continue;
      
      // Create object using headers as keys
      const record: CSVRow = {};
      headers.forEach((header, index) => {
        if (index < values.length) {
          record[header] = values[index];
        } else {
          record[header] = '';
        }
      });
      
      records.push(record);
    }
    
    return records;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error('Failed to parse CSV file');
  }
};

/**
 * Parse a CSV line into an array of values, handling quoted values
 * @param line A single line from a CSV file
 * @returns Array of values from the line
 */
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Handle quoted text
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Double quotes inside quoted text - add a single quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      // Add character to current field
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
};

/**
 * Validates that the CSV data contains the required columns
 * @param data Array of CSV row objects
 * @param requiredColumns Array of column names that must exist
 * @returns boolean indicating if the CSV structure is valid
 */
export const validateCSVSchema = (
  data: CSVRow[],
  requiredColumns: string[]
): boolean => {
  if (!data.length) return false;
  
  const firstRow = data[0];
  return requiredColumns.every(column => 
    Object.keys(firstRow).includes(column)
  );
};
