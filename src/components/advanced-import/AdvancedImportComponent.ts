/**
 * Advanced Import Component
 * Handles direct import of nodes and edges files for advanced analysis
 */
import { FileParserService } from '../../services/file-parser/FileParserService';
import { Dataset, DataEntity, Relationship } from '../../models/data-types';
import { formatFileSize } from '../../utils/helpers';

export class AdvancedImportComponent {
  private container: HTMLElement;
  private componentElement: HTMLElement;
  private fileParserService: FileParserService;
  private onDatasetLoadedCallback: ((dataset: Dataset) => void) | null = null;
  
  // Files and data storage
  private nodesFile: File | null = null;
  private edgesFile: File | null = null;
  private nodesData: any[] = [];
  private edgesData: any[] = [];
  private dataset: Dataset | null = null;
  
  // Filtering controls
  private sourceSelector: HTMLElement | null = null;
  private targetSelector: HTMLElement | null = null;
  private selectedSourceIds: string[] = [];
  private selectedTargetIds: string[] = [];
  private onFilterChangeCallback: ((sourceIds: string[], targetIds: string[]) => void) | null = null;
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.fileParserService = new FileParserService();
    this.componentElement = document.createElement('div');
    
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
   * Register callback for when dataset is loaded
   */
  onDatasetLoaded(callback: (dataset: Dataset) => void): void {
    this.onDatasetLoadedCallback = callback;
  }
  
  /**
   * Register callback for when filters change
   */
  onFilterChange(callback: (sourceIds: string[], targetIds: string[]) => void): void {
    this.onFilterChangeCallback = callback;
  }
  
  /**
   * Get the current dataset
   */
  getDataset(): Dataset | null {
    return this.dataset;
  }
  
  /**
   * Get selected source and target IDs
   */
  getFilters(): { sourceIds: string[], targetIds: string[] } {
    return {
      sourceIds: this.selectedSourceIds,
      targetIds: this.selectedTargetIds
    };
  }
  
  /**
   * Render the advanced import component
   */
  private render(): void {
    // Clear component element
    this.componentElement.innerHTML = '';
    
    // Create component wrapper
    const componentWrapper = document.createElement('div');
    componentWrapper.className = 'advanced-import-container';
    
    // Header
    const header = document.createElement('div');
    header.className = 'advanced-header';
    header.innerHTML = `
      <h2>Advanced Data Import</h2>
      <p>Import node and edge files directly for advanced analysis</p>
    `;
    
    // Create file upload section
    const fileUploadSection = document.createElement('div');
    fileUploadSection.className = 'advanced-file-section';
    
    // Nodes file upload
    const nodesUploadContainer = this.createFileUploadArea(
      'nodes-upload',
      'Node File (CSV/JSON)',
      'Upload a file with node data (required columns: id, label, type)',
      (file) => this.handleNodesFileUpload(file)
    );
    
    // Edges file upload
    const edgesUploadContainer = this.createFileUploadArea(
      'edges-upload',
      'Edge File (CSV/JSON)',
      'Upload a file with edge data (required columns: source, target, type)',
      (file) => this.handleEdgesFileUpload(file)
    );
    
    fileUploadSection.appendChild(nodesUploadContainer);
    fileUploadSection.appendChild(edgesUploadContainer);
    
    // Build graph button (initially disabled)
    const buildButtonContainer = document.createElement('div');
    buildButtonContainer.className = 'build-button-container';
    
    const buildButton = document.createElement('button');
    buildButton.id = 'advanced-build-button';
    buildButton.className = 'btn btn-primary';
    buildButton.textContent = 'Build Graph';
    buildButton.disabled = true;
    buildButton.addEventListener('click', () => this.buildGraph());
    
    buildButtonContainer.appendChild(buildButton);
    
    // Add file status area
    const statusArea = document.createElement('div');
    statusArea.className = 'advanced-status-area';
    
    // Create filter controls section (initially hidden)
    const filterSection = document.createElement('div');
    filterSection.className = 'filter-section';
    filterSection.style.display = 'none';
    filterSection.innerHTML = `
      <div class="filter-header">
        <h3>Graph Filtering</h3>
        <p>Select source and target nodes to filter the graph</p>
      </div>
    `;
    
    // Source selector
    const sourceContainer = document.createElement('div');
    sourceContainer.className = 'filter-container';
    sourceContainer.innerHTML = `
      <h4>Source Nodes</h4>
      <p class="filter-description">Select starting nodes for impact analysis</p>
    `;
    
    this.sourceSelector = document.createElement('div');
    this.sourceSelector.className = 'node-selector source-selector';
    sourceContainer.appendChild(this.sourceSelector);
    
    // Target selector
    const targetContainer = document.createElement('div');
    targetContainer.className = 'filter-container';
    targetContainer.innerHTML = `
      <h4>Target Nodes/Classes</h4>
      <p class="filter-description">Optionally select target nodes or classes to filter paths</p>
    `;
    
    this.targetSelector = document.createElement('div');
    this.targetSelector.className = 'node-selector target-selector';
    targetContainer.appendChild(this.targetSelector);
    
    // Apply filter button
    const applyFilterButton = document.createElement('button');
    applyFilterButton.className = 'btn btn-primary';
    applyFilterButton.textContent = 'Apply Filter';
    applyFilterButton.addEventListener('click', () => this.applyFilters());
    
    const clearFilterButton = document.createElement('button');
    clearFilterButton.className = 'btn btn-secondary';
    clearFilterButton.textContent = 'Clear Filters';
    clearFilterButton.addEventListener('click', () => this.clearFilters());
    
    const filterButtonContainer = document.createElement('div');
    filterButtonContainer.className = 'filter-button-container';
    filterButtonContainer.appendChild(applyFilterButton);
    filterButtonContainer.appendChild(clearFilterButton);
    
    filterSection.appendChild(sourceContainer);
    filterSection.appendChild(targetContainer);
    filterSection.appendChild(filterButtonContainer);
    
    // Assemble the component
    componentWrapper.appendChild(header);
    componentWrapper.appendChild(fileUploadSection);
    componentWrapper.appendChild(buildButtonContainer);
    componentWrapper.appendChild(statusArea);
    componentWrapper.appendChild(filterSection);
    
    this.componentElement.appendChild(componentWrapper);
  }
  
  /**
   * Create a file upload area
   */
  private createFileUploadArea(
    id: string,
    title: string,
    description: string,
    onFileSelect: (file: File) => void
  ): HTMLElement {
    const uploadContainer = document.createElement('div');
    uploadContainer.className = 'advanced-upload-area';
    
    const header = document.createElement('h3');
    header.textContent = title;
    
    const descriptionElement = document.createElement('p');
    descriptionElement.className = 'upload-description';
    descriptionElement.textContent = description;
    
    // Upload area
    const uploadArea = document.createElement('div');
    uploadArea.className = 'upload-box';
    uploadArea.innerHTML = `
      <div class="upload-icon">
        <i class="fas fa-file-upload"></i>
      </div>
      <p>Drag & drop file here or <span class="browse-link">Browse files</span></p>
    `;
    
    // File input (hidden)
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = id;
    fileInput.className = 'file-input';
    fileInput.accept = '.csv,.json';
    fileInput.style.display = 'none';
    
    // Status element
    const statusElement = document.createElement('div');
    statusElement.className = 'file-status-indicator';
    
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
        onFileSelect(e.dataTransfer.files[0]);
      }
    });
    
    fileInput.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    });
    
    // Assemble the upload area
    uploadContainer.appendChild(header);
    uploadContainer.appendChild(descriptionElement);
    uploadContainer.appendChild(uploadArea);
    uploadContainer.appendChild(fileInput);
    uploadContainer.appendChild(statusElement);
    
    return uploadContainer;
  }
  
  /**
   * Handle nodes file upload
   */
  private async handleNodesFileUpload(file: File): Promise<void> {
    this.nodesFile = file;
    
    // Update status indicator
    const statusIndicator = this.container.querySelector('#nodes-upload')?.parentElement?.querySelector('.file-status-indicator');
    if (statusIndicator) {
      statusIndicator.innerHTML = `
        <div class="file-status loading">
          <div class="spinner"></div>
          <div class="status-details">
            <p><strong>Processing:</strong> ${file.name}</p>
            <p class="file-meta">Size: ${formatFileSize(file.size)} | Type: ${file.type || 'unknown'}</p>
          </div>
        </div>
      `;
    }
    
    try {
      // Parse the file
      const rawData = await this.fileParserService.parseFile(file);
      this.nodesData = rawData.rows;
      
      // Validate required columns
      const hasRequiredColumns = this.validateNodeColumns(rawData.columns);
      
      if (statusIndicator) {
        if (hasRequiredColumns) {
          statusIndicator.innerHTML = `
            <div class="file-status success">
              <i class="fas fa-check-circle"></i>
              <div class="status-details">
                <p><strong>Loaded:</strong> ${file.name}</p>
                <p class="file-meta">${rawData.rows.length} nodes | ${rawData.columns.length} columns</p>
              </div>
            </div>
          `;
        } else {
          statusIndicator.innerHTML = `
            <div class="file-status error">
              <i class="fas fa-exclamation-circle"></i>
              <div class="status-details">
                <p><strong>Error:</strong> Missing required columns</p>
                <p class="file-meta">Node file must have 'id', 'label', and 'type' columns</p>
              </div>
            </div>
          `;
          this.nodesData = [];
        }
      }
      
      // Update build button state
      this.updateBuildButtonState();
      
    } catch (error) {
      if (statusIndicator) {
        statusIndicator.innerHTML = `
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
  }
  
  /**
   * Handle edges file upload
   */
  private async handleEdgesFileUpload(file: File): Promise<void> {
    this.edgesFile = file;
    
    // Update status indicator
    const statusIndicator = this.container.querySelector('#edges-upload')?.parentElement?.querySelector('.file-status-indicator');
    if (statusIndicator) {
      statusIndicator.innerHTML = `
        <div class="file-status loading">
          <div class="spinner"></div>
          <div class="status-details">
            <p><strong>Processing:</strong> ${file.name}</p>
            <p class="file-meta">Size: ${formatFileSize(file.size)} | Type: ${file.type || 'unknown'}</p>
          </div>
        </div>
      `;
    }
    
    try {
      // Parse the file
      const rawData = await this.fileParserService.parseFile(file);
      this.edgesData = rawData.rows;
      
      // Validate required columns
      const hasRequiredColumns = this.validateEdgeColumns(rawData.columns);
      
      if (statusIndicator) {
        if (hasRequiredColumns) {
          statusIndicator.innerHTML = `
            <div class="file-status success">
              <i class="fas fa-check-circle"></i>
              <div class="status-details">
                <p><strong>Loaded:</strong> ${file.name}</p>
                <p class="file-meta">${rawData.rows.length} edges | ${rawData.columns.length} columns</p>
              </div>
            </div>
          `;
        } else {
          statusIndicator.innerHTML = `
            <div class="file-status error">
              <i class="fas fa-exclamation-circle"></i>
              <div class="status-details">
                <p><strong>Error:</strong> Missing required columns</p>
                <p class="file-meta">Edge file must have 'source', 'target', and 'type' columns</p>
              </div>
            </div>
          `;
          this.edgesData = [];
        }
      }
      
      // Update build button state
      this.updateBuildButtonState();
      
    } catch (error) {
      if (statusIndicator) {
        statusIndicator.innerHTML = `
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
  }
  
  /**
   * Validate node file columns
   */
  private validateNodeColumns(columns: string[]): boolean {
    const requiredColumns = ['id', 'label', 'type'];
    const lowerColumns = columns.map(col => col.toLowerCase());
    
    return requiredColumns.every(col => 
      lowerColumns.includes(col) || lowerColumns.includes(col + 'id')
    );
  }
  
  /**
   * Validate edge file columns
   */
  private validateEdgeColumns(columns: string[]): boolean {
    const requiredColumns = ['source', 'target'];
    const lowerColumns = columns.map(col => col.toLowerCase());
    
    return requiredColumns.every(col => 
      lowerColumns.includes(col) || lowerColumns.includes(col + 'id') || 
      lowerColumns.includes('from') || lowerColumns.includes('to')
    );
  }
  
  /**
   * Update build button state
   */
  private updateBuildButtonState(): void {
    const buildButton = document.getElementById('advanced-build-button') as HTMLButtonElement;
    if (buildButton) {
      buildButton.disabled = this.nodesData.length === 0 || this.edgesData.length === 0;
    }
  }
  
  /**
   * Build the graph from nodes and edges data
   */
  private buildGraph(): void {
    // Create a status update
    const statusArea = this.container.querySelector('.advanced-status-area');
    if (statusArea) {
      statusArea.innerHTML = `
        <div class="file-status loading">
          <div class="spinner"></div>
          <div class="status-details">
            <p><strong>Building graph:</strong> Processing node and edge data</p>
          </div>
        </div>
      `;
    }
    
    try {
      // Build entities from nodes data
      const entities: DataEntity[] = this.nodesData.map(nodeRow => {
        // Normalize column names
        const id = this.getColumnValue(nodeRow, ['id', 'nodeid', 'node_id']);
        const label = this.getColumnValue(nodeRow, ['label', 'name', 'title']);
        const type = this.getColumnValue(nodeRow, ['type', 'class', 'category']);
        
        // Extract all other columns as metadata
        const metadata: Record<string, any> = {};
        for (const key in nodeRow) {
          if (!['id', 'nodeid', 'node_id', 'label', 'name', 'title', 'type', 'class', 'category'].includes(key.toLowerCase())) {
            metadata[key] = nodeRow[key];
          }
        }
        
        return {
          id: String(id),
          type: String(type || 'node'),
          label: String(label || id),
          metadata
        };
      });
      
      // Build relationships from edges data
      const relationships: Relationship[] = this.edgesData.map((edgeRow, index) => {
        // Normalize column names
        const source = this.getColumnValue(edgeRow, ['source', 'sourceid', 'source_id', 'from', 'fromid', 'from_id']);
        const target = this.getColumnValue(edgeRow, ['target', 'targetid', 'target_id', 'to', 'toid', 'to_id']);
        const type = this.getColumnValue(edgeRow, ['type', 'relationship', 'rel_type']);
        const id = this.getColumnValue(edgeRow, ['id', 'edgeid', 'edge_id']) || `edge_${index}`;
        
        // Extract all other columns as metadata
        const metadata: Record<string, any> = {};
        for (const key in edgeRow) {
          if (!['source', 'sourceid', 'source_id', 'from', 'fromid', 'from_id', 
                'target', 'targetid', 'target_id', 'to', 'toid', 'to_id',
                'type', 'relationship', 'rel_type', 'id', 'edgeid', 'edge_id'].includes(key.toLowerCase())) {
            metadata[key] = edgeRow[key];
          }
        }
        
        return {
          id: String(id),
          source: String(source),
          target: String(target),
          type: String(type || 'default'),
          metadata
        };
      });
      
      // Create the dataset
      this.dataset = {
        entities,
        relationships
      };
      
      if (statusArea) {
        statusArea.innerHTML = `
          <div class="file-status success">
            <i class="fas fa-check-circle"></i>
            <div class="status-details">
              <p><strong>Graph built successfully!</strong></p>
              <p class="file-meta">${entities.length} nodes | ${relationships.length} edges</p>
            </div>
          </div>
        `;
      }
      
      // Show filter section
      const filterSection = this.container.querySelector('.filter-section') as HTMLElement;
      if (filterSection) {
        filterSection.style.display = 'block';
      }
      
      // Populate selectors
      this.populateNodeSelectors();
      
      // Notify dataset loaded
      if (this.onDatasetLoadedCallback && this.dataset) {
        this.onDatasetLoadedCallback(this.dataset);
      }
      
    } catch (error) {
      if (statusArea) {
        statusArea.innerHTML = `
          <div class="file-status error">
            <i class="fas fa-exclamation-circle"></i>
            <div class="status-details">
              <p><strong>Error:</strong> Failed to build graph</p>
              <p class="file-meta">${(error as Error).message}</p>
            </div>
          </div>
        `;
      }
    }
  }
  
  /**
   * Get a value from a row using various possible column names
   */
  private getColumnValue(row: any, possibleNames: string[]): any {
    for (const name of possibleNames) {
      // Check for exact match
      if (row[name] !== undefined) {
        return row[name];
      }
      
      // Check for case-insensitive match
      const lowerName = name.toLowerCase();
      for (const key in row) {
        if (key.toLowerCase() === lowerName) {
          return row[key];
        }
      }
    }
    return null;
  }
  
  /**
   * Populate source and target selectors with nodes
   */
  private populateNodeSelectors(): void {
    if (!this.dataset || !this.sourceSelector || !this.targetSelector) {
      return;
    }
    
    this.sourceSelector.innerHTML = '';
    this.targetSelector.innerHTML = '';
    
    // Group nodes by type
    const nodesByType: Record<string, DataEntity[]> = {};
    
    for (const entity of this.dataset.entities) {
      if (!nodesByType[entity.type]) {
        nodesByType[entity.type] = [];
      }
      nodesByType[entity.type].push(entity);
    }
    
    // Create type groups for source selector
    for (const [type, entities] of Object.entries(nodesByType)) {
      const typeGroup = this.createNodeTypeGroup(type, entities, 'source');
      this.sourceSelector.appendChild(typeGroup);
    }
    
    // Create type groups for target selector with "All" checkbox
    for (const [type, entities] of Object.entries(nodesByType)) {
      const typeGroup = this.createNodeTypeGroup(type, entities, 'target', true);
      this.targetSelector.appendChild(typeGroup);
    }
  }
  
  /**
   * Create a group of nodes by type for selection
   */
  private createNodeTypeGroup(
    type: string, 
    entities: DataEntity[], 
    selectorType: 'source' | 'target',
    includeTypeSelector: boolean = false
  ): HTMLElement {
    const typeGroup = document.createElement('div');
    typeGroup.className = 'node-type-group';
    
    // Create type header
    const typeHeader = document.createElement('div');
    typeHeader.className = 'type-header';
    
    // Create type checkbox if needed
    if (includeTypeSelector) {
      const typeCheckbox = document.createElement('input');
      typeCheckbox.type = 'checkbox';
      typeCheckbox.id = `${selectorType}-type-${type}`;
      typeCheckbox.className = 'type-checkbox';
      typeCheckbox.setAttribute('data-type', type);
      
      typeCheckbox.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        const nodeCheckboxes = typeGroup.querySelectorAll('.node-checkbox') as NodeListOf<HTMLInputElement>;
        
        // Check/uncheck all nodes of this type
        nodeCheckboxes.forEach(checkbox => {
          checkbox.checked = isChecked;
          
          // Update selected targets
          if (selectorType === 'target') {
            const nodeId = checkbox.getAttribute('data-id') || '';
            if (isChecked) {
              if (!this.selectedTargetIds.includes(nodeId)) {
                this.selectedTargetIds.push(nodeId);
              }
            } else {
              this.selectedTargetIds = this.selectedTargetIds.filter(id => id !== nodeId);
            }
          }
        });
      });
      
      const typeLabel = document.createElement('label');
      typeLabel.setAttribute('for', `${selectorType}-type-${type}`);
      typeLabel.innerHTML = `<strong>${type}</strong> (All ${entities.length} nodes)`;
      
      typeHeader.appendChild(typeCheckbox);
      typeHeader.appendChild(typeLabel);
    } else {
      typeHeader.innerHTML = `<strong>${type}</strong> (${entities.length} nodes)`;
    }
    
    // Create expand/collapse button
    const expandButton = document.createElement('button');
    expandButton.className = 'btn-sm btn-outline expand-button';
    expandButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
    expandButton.addEventListener('click', () => {
      const nodeList = typeGroup.querySelector('.node-list');
      if (nodeList) {
        nodeList.classList.toggle('expanded');
        expandButton.innerHTML = nodeList.classList.contains('expanded') 
          ? '<i class="fas fa-chevron-up"></i>' 
          : '<i class="fas fa-chevron-down"></i>';
      }
    });
    
    typeHeader.appendChild(expandButton);
    typeGroup.appendChild(typeHeader);
    
    // Create node list (initially collapsed)
    const nodeList = document.createElement('div');
    nodeList.className = 'node-list';
    
    // Add nodes
    for (const entity of entities) {
      const nodeItem = document.createElement('div');
      nodeItem.className = 'node-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `${selectorType}-node-${entity.id}`;
      checkbox.className = 'node-checkbox';
      checkbox.setAttribute('data-id', entity.id);
      checkbox.setAttribute('data-type', type);
      
      checkbox.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        const nodeId = (e.target as HTMLElement).getAttribute('data-id') || '';
        
        if (selectorType === 'source') {
          // Update selected sources
          if (isChecked) {
            if (!this.selectedSourceIds.includes(nodeId)) {
              this.selectedSourceIds.push(nodeId);
            }
          } else {
            this.selectedSourceIds = this.selectedSourceIds.filter(id => id !== nodeId);
          }
        } else {
          // Update selected targets
          if (isChecked) {
            if (!this.selectedTargetIds.includes(nodeId)) {
              this.selectedTargetIds.push(nodeId);
            }
          } else {
            this.selectedTargetIds = this.selectedTargetIds.filter(id => id !== nodeId);
          }
        }
      });
      
      const label = document.createElement('label');
      label.setAttribute('for', `${selectorType}-node-${entity.id}`);
      label.textContent = entity.label;
      
      nodeItem.appendChild(checkbox);
      nodeItem.appendChild(label);
      nodeList.appendChild(nodeItem);
    }
    
    typeGroup.appendChild(nodeList);
    return typeGroup;
  }
  
  /**
   * Apply selected filters
   */
  private applyFilters(): void {
    if (this.selectedSourceIds.length === 0) {
      alert('Please select at least one source node');
      return;
    }
    
    // Notify about filter changes
    if (this.onFilterChangeCallback) {
      this.onFilterChangeCallback(this.selectedSourceIds, this.selectedTargetIds);
    }
    
    // Update status area
    const statusArea = this.container.querySelector('.advanced-status-area');
    if (statusArea) {
      statusArea.innerHTML = `
        <div class="file-status success">
          <i class="fas fa-filter"></i>
          <div class="status-details">
            <p><strong>Filters applied:</strong> ${this.selectedSourceIds.length} source nodes, ${this.selectedTargetIds.length} target nodes</p>
          </div>
        </div>
      `;
    }
  }
  
  /**
   * Clear all filters
   */
  private clearFilters(): void {
    // Reset selected IDs
    this.selectedSourceIds = [];
    this.selectedTargetIds = [];
    
    // Uncheck all checkboxes
    const checkboxes = this.container.querySelectorAll('.node-checkbox, .type-checkbox') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    
    // Notify about filter changes
    if (this.onFilterChangeCallback) {
      this.onFilterChangeCallback([], []);
    }
    
    // Update status area
    const statusArea = this.container.querySelector('.advanced-status-area');
    if (statusArea) {
      statusArea.innerHTML = `
        <div class="file-status">
          <i class="fas fa-info-circle"></i>
          <div class="status-details">
            <p><strong>Filters cleared</strong></p>
            <p>Select source and target nodes to apply filters</p>
          </div>
        </div>
      `;
    }
  }
}