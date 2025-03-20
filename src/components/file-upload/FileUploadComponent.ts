/**
 * File Upload Component
 * Handles file selection, upload, and preview
 */
import { FileParserService } from '../../services/file-parser/FileParserService';
import { RawData } from '../../models/data-types';
import { formatFileSize } from '../../utils/helpers';

export class FileUploadComponent {
  private container: HTMLElement;
  private componentElement: HTMLElement;
  private fileParserService: FileParserService;
  private onDataLoadedCallback: ((data: RawData) => void) | null = null;
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.componentElement = document.createElement('div');
    this.fileParserService = new FileParserService();
    
    // Initialize the UI
    this.render();
  }
  
  /**
   * Get the component element
   */
  getElement(): HTMLElement {
    return this.componentElement;
  }
  
  /**
   * Register callback for when data is loaded
   */
  onDataLoaded(callback: (data: RawData) => void): void {
    this.onDataLoadedCallback = callback;
  }
  
  /**
   * Render the file upload component
   */
  private render(): void {
    // Clear component element
    this.componentElement.innerHTML = '';
    
    // Create glassmorphism UI
    const uploadContainer = document.createElement('div');
    uploadContainer.className = 'file-upload-container';
    
    // Header
    const header = document.createElement('div');
    header.className = 'upload-header';
    header.innerHTML = `
      <h2>Upload Your Data</h2>
      <p>Drag and drop your file or click to browse</p>
    `;
    
    // Supported formats
    const formatInfo = document.createElement('div');
    formatInfo.className = 'format-info';
    formatInfo.innerHTML = `
      <p>Supported formats:</p>
      <div class="format-badges">
        <span class="format-badge">CSV</span>
        <span class="format-badge">JSON</span>
        <span class="format-badge">Excel</span>
      </div>
    `;
    
    // Upload area
    const uploadArea = document.createElement('div');
    uploadArea.className = 'upload-area';
    uploadArea.innerHTML = `
      <div class="upload-icon">
        <i class="fas fa-cloud-upload-alt"></i>
      </div>
      <p>Drag & drop file here or <span class="browse-link">Browse files</span></p>
    `;
    
    // File input (hidden)
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.className = 'file-input';
    fileInput.accept = '.csv,.json,.xlsx,.xls';
    fileInput.style.display = 'none';
    
    // Add event listeners
    uploadArea.addEventListener('click', () => {
      fileInput.click();
    });
    
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      
      if (e.dataTransfer?.files.length) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });
    
    fileInput.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        this.handleFileUpload(files[0]);
      }
    });
    
    // Assemble container
    uploadContainer.appendChild(header);
    uploadContainer.appendChild(formatInfo);
    uploadContainer.appendChild(uploadArea);
    uploadContainer.appendChild(fileInput);
    
    // Add file status area
    const statusArea = document.createElement('div');
    statusArea.className = 'file-status-area';
    uploadContainer.appendChild(statusArea);
    
    this.componentElement.appendChild(uploadContainer);
  }
  
  /**
   * Handle file upload
   */
  private async handleFileUpload(file: File): Promise<void> {
    const statusArea = this.componentElement.querySelector('.file-status-area');
    if (!statusArea) return;
    
    // Update status
    statusArea.innerHTML = `
      <div class="file-status loading">
        <div class="spinner"></div>
        <div class="status-details">
          <p><strong>Processing:</strong> ${file.name}</p>
          <p class="file-meta">Size: ${formatFileSize(file.size)} | Type: ${file.type || 'unknown'}</p>
        </div>
      </div>
    `;
    
    try {
      // Parse the file
      const data = await this.fileParserService.parseFile(file);
      
      // Update status to success
      statusArea.innerHTML = `
        <div class="file-status success">
          <i class="fas fa-check-circle"></i>
          <div class="status-details">
            <p><strong>Loaded:</strong> ${file.name}</p>
            <p class="file-meta">${data.rows.length} rows | ${data.columns.length} columns</p>
          </div>
        </div>
      `;
      
      // Show preview
      this.showDataPreview(data);
      
      // Notify about data loaded
      if (this.onDataLoadedCallback) {
        this.onDataLoadedCallback(data);
      }
      
    } catch (error) {
      // Update status to error
      statusArea.innerHTML = `
        <div class="file-status error">
          <i class="fas fa-exclamation-circle"></i>
          <div class="status-details">
            <p><strong>Error:</strong> Failed to parse file</p>
            <p class="file-meta">${(error as Error).message}</p>
          </div>
        </div>
      `;
    }
  }
  
  /**
   * Show data preview
   */
  private showDataPreview(data: RawData): void {
    // Only show preview if we have data
    if (!data.rows.length) return;
    
    const container = document.createElement('div');
    container.className = 'data-preview';
    
    const header = document.createElement('div');
    header.className = 'preview-header';
    header.innerHTML = `
      <h3>Data Preview</h3>
      <p>Showing first ${Math.min(5, data.rows.length)} of ${data.rows.length} rows</p>
    `;
    
    const table = document.createElement('table');
    table.className = 'preview-table';
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    for (const column of data.columns) {
      const th = document.createElement('th');
      th.textContent = column;
      headerRow.appendChild(th);
    }
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body with sample rows
    const tbody = document.createElement('tbody');
    const sampleRows = data.rows.slice(0, 5);
    
    for (const row of sampleRows) {
      const tr = document.createElement('tr');
      
      for (const column of data.columns) {
        const td = document.createElement('td');
        const value = row[column];
        
        // Display null or complex objects appropriately
        if (value === null || value === undefined) {
          td.innerHTML = '<span class="null-value">null</span>';
        } else if (typeof value === 'object') {
          td.innerHTML = '<span class="object-value">{...}</span>';
        } else {
          td.textContent = String(value);
        }
        
        tr.appendChild(td);
      }
      
      tbody.appendChild(tr);
    }
    
    table.appendChild(tbody);
    
    // Add to container
    container.appendChild(header);
    container.appendChild(table);
    
    // Add to status area
    const statusArea = this.componentElement.querySelector('.file-status-area');
    if (statusArea) {
      statusArea.appendChild(container);
    }
  }
}