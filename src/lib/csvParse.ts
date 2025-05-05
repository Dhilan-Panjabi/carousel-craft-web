
import { parse } from 'csv-parse/sync';

export interface CSVRow {
  [key: string]: string;
}

export const parseCSV = (csvString: string): CSVRow[] => {
  try {
    const records = parse(csvString, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    return records;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error('Failed to parse CSV file');
  }
};

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
