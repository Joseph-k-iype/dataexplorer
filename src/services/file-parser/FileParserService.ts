/**
 * File Parser Service
 * Handles parsing of uploaded files (CSV, JSON, Excel) into a standard format
 */
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { RawData } from '../../models/data-types';
import { getFileExtension } from '../../utils/helpers';

export class FileParserService {
  /**
   * Parse an uploaded file into a standardized RawData format
   */
  async parseFile(file: File): Promise<RawData> {
    const fileExtension = getFileExtension(file.name);
    
    switch (fileExtension) {
      case 'csv':
        return this.parseCsv(file);
      case 'json':
        return this.parseJson(file);
      case 'xlsx':
      case 'xls':
        return this.parseExcel(file);
      default:
        throw new Error(`Unsupported file format: ${fileExtension}`);
    }
  }
  
  /**
   * Parse CSV file using PapaParse
   */
  private parseCsv(file: File): Promise<RawData> {
    return new Promise((resolve, reject) => {
    Papa.parse<Record<string, any>>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimitersToGuess: [',', '\t', '|', ';'],
      complete: (results: Papa.ParseResult<Record<string, any>>): void => {
        // Extract column names from the first row
        const columns: string[] = results.meta.fields || [];
        
        // Clean column names (trim whitespace)
        const cleanColumns: string[] = columns.map((col: string): string => col.trim());
        
        // Convert data to rows
        const rows: Record<string, any>[] = results.data as Record<string, any>[];
        
        resolve({
        columns: cleanColumns,
        rows: rows
        });
      },
      error: (error: Papa.ParseError): void => {
        reject(new Error(`Error parsing CSV: ${error.message}`));
      }
    });
    });
  }
  
  /**
   * Parse JSON file
   */
  private async parseJson(file: File): Promise<RawData> {
    try {
      const text = await this.readFileAsText(file);
      const jsonData = JSON.parse(text);
      
      // Handle different JSON formats
      if (Array.isArray(jsonData)) {
        // Array of objects format
        if (jsonData.length === 0) {
          return { columns: [], rows: [] };
        }
        
        // Extract column names from the first object
        const columns = Object.keys(jsonData[0]);
        
        return {
          columns,
          rows: jsonData
        };
      } else if (typeof jsonData === 'object') {
        // Check if it's a nested structure with data property
        if (jsonData.data && Array.isArray(jsonData.data)) {
          if (jsonData.data.length === 0) {
            return { columns: [], rows: [] };
          }
          
          const columns = Object.keys(jsonData.data[0]);
          return {
            columns,
            rows: jsonData.data
          };
        }
        
        // Check if it has a columns/rows structure
        if (jsonData.columns && jsonData.rows && Array.isArray(jsonData.rows)) {
          return {
            columns: jsonData.columns,
            rows: jsonData.rows
          };
        }
        
        // Single object format - convert to array with one element
        const columns = Object.keys(jsonData);
        return {
          columns,
          rows: [jsonData]
        };
      } else {
        throw new Error('Invalid JSON format. Expected array or object.');
      }
    } catch (error) {
      throw new Error(`Error parsing JSON: ${(error as Error).message}`);
    }
  }
  
  /**
   * Parse Excel file using SheetJS
   */
  private async parseExcel(file: File): Promise<RawData> {
    try {
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      
      // Parse workbook with full options to handle formatting
      const workbook = XLSX.read(arrayBuffer, {
        cellStyles: true,
        cellDates: true,
        cellNF: true,
        cellFormula: true,
        sheetStubs: true
      });
      
      // Use first sheet by default
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON with headers
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        return { columns: [], rows: [] };
      }
      
      // First row contains headers
      const headers = jsonData[0] as string[];
      
      // Clean headers (trim whitespace, ensure unique names)
      const cleanHeaders = this.ensureUniqueHeaders(
        headers.map(h => (h ? h.toString().trim() : `Column_${Math.random().toString(36).substring(2, 7)}` ))
      );
      
      // Convert data rows to objects with header keys
      const rows = jsonData.slice(1).map(row => {
        const rowObj: Record<string, any> = {};
        (row as any[]).forEach((cell, index) => {
          if (index < cleanHeaders.length) {
            rowObj[cleanHeaders[index]] = cell;
          }
        });
        return rowObj;
      });
      
      return {
        columns: cleanHeaders,
        rows: rows as Record<string, any>[]
      };
    } catch (error) {
      throw new Error(`Error parsing Excel: ${(error as Error).message}`);
    }
  }
  
  /**
   * Ensure column headers are unique by adding index to duplicates
   */
  private ensureUniqueHeaders(headers: string[]): string[] {
    const uniqueHeaders: string[] = [];
    const headerCounts: Record<string, number> = {};
    
    for (let header of headers) {
      if (!header) {
        header = `Column_${Math.random().toString(36).substring(2, 7)}`;
      }
      
      // Initialize counter if this is first occurrence
      if (headerCounts[header] === undefined) {
        headerCounts[header] = 0;
        uniqueHeaders.push(header);
      } else {
        // Increment counter and append to header
        headerCounts[header]++;
        uniqueHeaders.push(`${header}_${headerCounts[header]}`);
      }
    }
    
    return uniqueHeaders;
  }
  
  /**
   * Read file as text
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsText(file);
    });
  }
  
  /**
   * Read file as ArrayBuffer
   */
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as ArrayBuffer);
        } else {
          reject(new Error('Failed to read file as array buffer'));
        }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsArrayBuffer(file);
    });
  }
}