
import { parse } from 'csv-parse';

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
    const records = parse(csvString, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as CSVRow[];
    
    return records;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error('Failed to parse CSV file');
  }
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
