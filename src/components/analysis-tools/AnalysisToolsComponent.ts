/**
 * Analysis Tools Component
 * Provides tools for path finding and impact analysis
 */
import { Dataset, PathAnalysisResult, ImpactAnalysisResult, DataEntity } from '../../models/data-types';
import { AnalysisService } from '../../services/analysis/AnalysisService';

export class AnalysisToolsComponent {
  private container: HTMLElement;
  private dataset: Dataset | null = null;
  private analysisService: AnalysisService;
  private selectedNodes: string[] = [];
  private onPathAnalysisCallback: ((result: PathAnalysisResult) => void) | null = null;
  private onImpactAnalysisCallback: ((result: ImpactAnalysisResult) => void) | null = null;
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.analysisService = new AnalysisService();
    
    // Initialize UI
    this.render();
  }
  
  /**
   * Set the dataset for analysis
   */
  setDataset(dataset: Dataset): void {
    this.dataset = dataset;
    this.selectedNodes = [];
    this.render();
  }
  
  /**
   * Set selected nodes for analysis
   */
  setSelectedNodes(nodeIds: string[]): void {
    this.selectedNodes = nodeIds;
    this.updateSelectionDisplay();
  }
  
  /**
   * Register callback for path analysis results
   */
  onPathAnalysis(callback: (result: PathAnalysisResult) => void): void {
    this.onPathAnalysisCallback = callback;
  }
  
  /**
   * Register callback for impact analysis results
   */
  onImpactAnalysis(callback: (result: ImpactAnalysisResult) => void): void {
    this.onImpactAnalysisCallback = callback;
  }
  
  /**
   * Render the analysis tools component
   */
  private render(): void {
    // Clear container
    this.container.innerHTML = '';
    
    if (!this.dataset) {
      this.renderEmptyState();
      return;
    }
    
    // Create panel structure
    const panel = document.createElement('div');
    panel.className = 'analysis-panel';
    
    // Panel header
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `
      <h2>Analysis Tools</h2>
      <p>Explore relationships and dependencies in your data</p>
    `;
    panel.appendChild(header);
    
    // Selection section
    const selectionSection = document.createElement('div');
    selectionSection.className = 'selection-section';
    
    const selectionHeader = document.createElement('h3');
    selectionHeader.textContent = 'Selected Nodes';
    
    const selectionInfo = document.createElement('p');
    selectionInfo.className = 'selection-info';
    
    if (this.selectedNodes.length === 0) {
      selectionInfo.innerHTML = `
        <p>No nodes selected. Click on nodes in the graph to select them.</p>
      `;
    } else if (this.selectedNodes.length === 1) {
      selectionInfo.innerHTML = `
        <p>1 node selected. Select at least one more node for path analysis.</p>
      `;
    } else {
      const sourceEntity = this.dataset.entities.find(e => e.id === this.selectedNodes[0]);
      const targetEntity = this.dataset.entities.find(e => e.id === this.selectedNodes[this.selectedNodes.length - 1]);
      
      selectionInfo.innerHTML = `
        <p>${this.selectedNodes.length} nodes selected.</p>
        <p><small>Path analysis will find paths from <strong>${sourceEntity?.label || 'Source'}</strong> to <strong>${targetEntity?.label || 'Target'}</strong>.</small></p>
      `;
    }
    
    const selectionList = document.createElement('div');
    selectionList.className = 'selection-list';
    
    // Populate selection list
    for (const nodeId of this.selectedNodes) {
      const entity = this.dataset.entities.find(e => e.id === nodeId);
      if (entity) {
        const selectionItem = this.createSelectionItem(entity);
        selectionList.appendChild(selectionItem);
      }
    }
    
    selectionSection.appendChild(selectionHeader);
    selectionSection.appendChild(selectionInfo);
    selectionSection.appendChild(selectionList);
    panel.appendChild(selectionSection);
    
    // Analysis tools section
    const toolsSection = document.createElement('div');
    toolsSection.className = 'tools-section';
    
    const toolsHeader = document.createElement('h3');
    toolsHeader.textContent = 'Analysis Tools';
    
    // Path analysis tool
    const pathAnalysisTool = this.createPathAnalysisTool();
    
    // Impact analysis tool
    const impactAnalysisTool = this.createImpactAnalysisTool();
    
    toolsSection.appendChild(toolsHeader);
    toolsSection.appendChild(pathAnalysisTool);
    toolsSection.appendChild(impactAnalysisTool);
    panel.appendChild(toolsSection);
    
    // Results section (initially empty)
    const resultsSection = document.createElement('div');
    resultsSection.className = 'results-section';
    resultsSection.innerHTML = `
      <h3>Analysis Results</h3>
      <p class="placeholder-text">Run an analysis to see results here</p>
    `;
    panel.appendChild(resultsSection);
    
    this.container.appendChild(panel);
  }
  
  /**
   * Render empty state when no dataset is loaded
   */
  private renderEmptyState(): void {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <h3>No Data Loaded</h3>
      <p>Upload and configure your data first to enable analysis tools</p>
    `;
    this.container.appendChild(emptyState);
  }
  
  /**
   * Create a selection item for a selected node
   */
  private createSelectionItem(entity: DataEntity): HTMLElement {
    const item = document.createElement('div');
    item.className = 'selection-item';
    
    const label = document.createElement('span');
    label.className = 'item-label';
    label.textContent = entity.label;
    
    const type = document.createElement('span');
    type.className = 'item-type';
    type.textContent = entity.type;
    
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-button';
    removeButton.innerHTML = '×';
    removeButton.addEventListener('click', () => {
      this.selectedNodes = this.selectedNodes.filter(id => id !== entity.id);
      this.updateSelectionDisplay();
    });
    
    item.appendChild(label);
    item.appendChild(type);
    item.appendChild(removeButton);
    
    return item;
  }
  
  /**
   * Create the path analysis tool
   */
  private createPathAnalysisTool(): HTMLElement {
    const tool = document.createElement('div');
    tool.className = 'analysis-tool';
    
    const header = document.createElement('div');
    header.className = 'tool-header';
    header.innerHTML = `
      <h4>Path Analysis</h4>
      <p>Find paths between selected nodes</p>
    `;
    
    const form = document.createElement('div');
    form.className = 'tool-form';
    
    // Max length input
    const maxLengthGroup = document.createElement('div');
    maxLengthGroup.className = 'form-group';
    
    const maxLengthLabel = document.createElement('label');
    maxLengthLabel.setAttribute('for', 'max-path-length');
    maxLengthLabel.textContent = 'Maximum Path Length:';
    
    const maxLengthInput = document.createElement('input');
    maxLengthInput.type = 'number';
    maxLengthInput.id = 'max-path-length';
    maxLengthInput.min = '1';
    maxLengthInput.max = '20';
    maxLengthInput.value = '10';
    
    maxLengthGroup.appendChild(maxLengthLabel);
    maxLengthGroup.appendChild(maxLengthInput);
    
    // Run button
    const runButton = document.createElement('button');
    runButton.className = 'btn btn-primary';
    runButton.textContent = 'Run Path Analysis';
    runButton.disabled = this.selectedNodes.length < 2;
    
    runButton.addEventListener('click', () => {
      this.runPathAnalysis(parseInt(maxLengthInput.value));
    });
    
    // Requirements info
    const requirementsInfo = document.createElement('div');
    requirementsInfo.className = 'requirements-info';
    requirementsInfo.innerHTML = this.selectedNodes.length < 2 
      ? '<p><i class="fas fa-info-circle"></i> Select at least 2 nodes to run path analysis</p>' 
      : '<p><i class="fas fa-check-circle"></i> Ready to analyze paths</p>';
    
    form.appendChild(maxLengthGroup);
    form.appendChild(runButton);
    form.appendChild(requirementsInfo);
    
    tool.appendChild(header);
    tool.appendChild(form);
    
    return tool;
  }
  
  /**
   * Create the impact analysis tool
   */
  private createImpactAnalysisTool(): HTMLElement {
    const tool = document.createElement('div');
    tool.className = 'analysis-tool';
    
    const header = document.createElement('div');
    header.className = 'tool-header';
    header.innerHTML = `
      <h4>Impact Analysis</h4>
      <p>Analyze downstream impact from selected nodes</p>
    `;
    
    const form = document.createElement('div');
    form.className = 'tool-form';
    
    // Max depth input
    const maxDepthGroup = document.createElement('div');
    maxDepthGroup.className = 'form-group';
    
    const maxDepthLabel = document.createElement('label');
    maxDepthLabel.setAttribute('for', 'max-impact-depth');
    maxDepthLabel.textContent = 'Maximum Impact Depth:';
    
    const maxDepthInput = document.createElement('input');
    maxDepthInput.type = 'number';
    maxDepthInput.id = 'max-impact-depth';
    maxDepthInput.min = '1';
    maxDepthInput.max = '20';
    maxDepthInput.value = '5';
    
    maxDepthGroup.appendChild(maxDepthLabel);
    maxDepthGroup.appendChild(maxDepthInput);
    
    // Run button
    const runButton = document.createElement('button');
    runButton.className = 'btn btn-primary';
    runButton.textContent = 'Run Impact Analysis';
    runButton.disabled = this.selectedNodes.length === 0;
    
    runButton.addEventListener('click', () => {
      this.runImpactAnalysis(parseInt(maxDepthInput.value));
    });
    
    // Requirements info
    const requirementsInfo = document.createElement('div');
    requirementsInfo.className = 'requirements-info';
    requirementsInfo.innerHTML = this.selectedNodes.length === 0 
      ? '<p><i class="fas fa-info-circle"></i> Select at least 1 node to run impact analysis</p>' 
      : '<p><i class="fas fa-check-circle"></i> Ready to analyze impact</p>';
    
    form.appendChild(maxDepthGroup);
    form.appendChild(runButton);
    form.appendChild(requirementsInfo);
    
    tool.appendChild(header);
    tool.appendChild(form);
    
    return tool;
  }
  
  /**
   * Update the selection display when selection changes
   */
  private updateSelectionDisplay(): void {
    // Update selection info
    const selectionInfo = this.container.querySelector('.selection-info');
    if (selectionInfo) {
      if (this.selectedNodes.length === 0) {
        selectionInfo.innerHTML = `
          <p>No nodes selected. Click on nodes in the graph to select them.</p>
        `;
      } else if (this.selectedNodes.length === 1) {
        selectionInfo.innerHTML = `
          <p>1 node selected. Select at least one more node for path analysis.</p>
        `;
      } else {
        const sourceEntity = this.dataset?.entities.find(e => e.id === this.selectedNodes[0]);
        const targetEntity = this.dataset?.entities.find(e => e.id === this.selectedNodes[this.selectedNodes.length - 1]);
        
        selectionInfo.innerHTML = `
          <p>${this.selectedNodes.length} nodes selected.</p>
          <p><small>Path analysis will find paths from <strong>${sourceEntity?.label || 'Source'}</strong> to <strong>${targetEntity?.label || 'Target'}</strong>.</small></p>
        `;
      }
    }
    
    // Update path analysis button
    const pathButton = this.container.querySelector('.analysis-tool:nth-child(1) .btn');
    if (pathButton) {
      (pathButton as HTMLButtonElement).disabled = this.selectedNodes.length < 2;
    }
    
    // Update path analysis requirements info
    const pathRequirements = this.container.querySelector('.analysis-tool:nth-child(1) .requirements-info');
    if (pathRequirements) {
      pathRequirements.innerHTML = this.selectedNodes.length < 2 
        ? '<p><i class="fas fa-info-circle"></i> Select at least 2 nodes to run path analysis</p>' 
        : '<p><i class="fas fa-check-circle"></i> Ready to analyze paths</p>';
    }
    
    // Update impact analysis button
    const impactButton = this.container.querySelector('.analysis-tool:nth-child(2) .btn');
    if (impactButton) {
      (impactButton as HTMLButtonElement).disabled = this.selectedNodes.length === 0;
    }
    
    // Update impact analysis requirements info
    const impactRequirements = this.container.querySelector('.analysis-tool:nth-child(2) .requirements-info');
    if (impactRequirements) {
      impactRequirements.innerHTML = this.selectedNodes.length === 0 
        ? '<p><i class="fas fa-info-circle"></i> Select at least 1 node to run impact analysis</p>' 
        : '<p><i class="fas fa-check-circle"></i> Ready to analyze impact</p>';
    }
    
    // Update selection list
    this.updateSelectionList();
  }
  
  /**
   * Update the selection list separately to avoid code duplication
   */
  private updateSelectionList(): void {
    const selectionList = this.container.querySelector('.selection-list');
    if (selectionList && this.dataset) {
      selectionList.innerHTML = '';
      
      for (const nodeId of this.selectedNodes) {
        const entity = this.dataset.entities.find(e => e.id === nodeId);
        if (entity) {
          const selectionItem = this.createSelectionItem(entity);
          selectionList.appendChild(selectionItem);
        }
      }
    }
  }
  
  /**
   * Run path analysis - improved version
   */
  private runPathAnalysis(maxLength: number): void {
    if (!this.dataset || this.selectedNodes.length < 2) {
      console.error("Path analysis requires at least 2 nodes");
      
      // Show error message in UI
      const resultsSection = this.container.querySelector('.results-section');
      if (resultsSection) {
        resultsSection.innerHTML = `
          <h3>Path Analysis Error</h3>
          <div class="error-message" style="color: var(--color-danger); padding: 10px; background: rgba(255, 82, 82, 0.1); border-radius: 6px;">
            <p><i class="fas fa-exclamation-triangle"></i> Please select at least 2 nodes to perform path analysis.</p>
            <p>Currently selected: ${this.selectedNodes.length} nodes</p>
          </div>
        `;
      }
      
      return;
    }
    
    console.log("Running path analysis with nodes:", this.selectedNodes);
    
    // Use first node as source and last node as target for clearer results
    const sourceId = this.selectedNodes[0];
    const targetId = this.selectedNodes[this.selectedNodes.length - 1];
    
    // Run analysis with single source and target for simplicity
    const result = this.analysisService.findPaths(
      this.dataset,
      [sourceId],
      [targetId],
      maxLength
    );
    
    console.log("Path analysis complete, found paths:", result.paths.length);
    
    // Display results
    this.displayPathResults(result);
    
    // Notify via callback
    if (this.onPathAnalysisCallback) {
      this.onPathAnalysisCallback(result);
    }
  }
  
  /**
   * Run impact analysis
   */
  private runImpactAnalysis(maxDepth: number): void {
    if (!this.dataset || this.selectedNodes.length === 0) {
      // Show error message
      const resultsSection = this.container.querySelector('.results-section');
      if (resultsSection) {
        resultsSection.innerHTML = `
          <h3>Impact Analysis Error</h3>
          <div class="error-message" style="color: var(--color-danger); padding: 10px; background: rgba(255, 82, 82, 0.1); border-radius: 6px;">
            <p><i class="fas fa-exclamation-triangle"></i> Please select at least 1 node to perform impact analysis.</p>
          </div>
        `;
      }
      return;
    }
    
    // Run analysis
    const result = this.analysisService.analyzeImpact(this.dataset, this.selectedNodes, maxDepth);
    
    // Display results
    this.displayImpactResults(result);
    
    // Notify via callback
    if (this.onImpactAnalysisCallback) {
      this.onImpactAnalysisCallback(result);
    }
  }
  
  /**
   * Display path analysis results
   */
  private displayPathResults(result: PathAnalysisResult): void {
    const resultsSection = this.container.querySelector('.results-section');
    if (!resultsSection) return;
    
    resultsSection.innerHTML = '';
    
    // Result header
    const header = document.createElement('h3');
    header.textContent = 'Path Analysis Results';
    resultsSection.appendChild(header);
    
    if (result.paths.length === 0) {
      // No paths found message
      const noResults = document.createElement('div');
      noResults.className = 'no-results';
      noResults.innerHTML = `
        <p><i class="fas fa-info-circle"></i> No paths found between the selected nodes.</p>
        <p>Try selecting different nodes or increasing the maximum path length.</p>
      `;
      resultsSection.appendChild(noResults);
      return;
    }
    
    // Summary metrics
    const summary = document.createElement('div');
    summary.className = 'result-summary';
    summary.innerHTML = `
      <div class="metric">
        <span class="metric-value">${result.paths.length}</span>
        <span class="metric-label">Paths Found</span>
      </div>
      <div class="metric">
        <span class="metric-value">${result.metrics.shortestPathLength > 0 ? result.metrics.shortestPathLength - 1 : 0}</span>
        <span class="metric-label">Min Hops</span>
      </div>
      <div class="metric">
        <span class="metric-value">${result.metrics.longestPathLength > 0 ? result.metrics.longestPathLength - 1 : 0}</span>
        <span class="metric-label">Max Hops</span>
      </div>
    `;
    resultsSection.appendChild(summary);
    
    // Display paths
    const pathsList = document.createElement('div');
    pathsList.className = 'paths-list';
    
    // Sort paths by length (shortest first)
    const sortedPaths = [...result.paths].sort((a, b) => a.nodes.length - b.nodes.length);
    
    // Show paths (limited to first 10 for performance)
    const displayPaths = sortedPaths.slice(0, 10);
    
    for (let i = 0; i < displayPaths.length; i++) {
      const path = displayPaths[i];
      
      const pathItem = document.createElement('div');
      pathItem.className = 'path-item';
      
      // Path header
      const pathHeader = document.createElement('div');
      pathHeader.className = 'path-header';
      pathHeader.innerHTML = `
        <h4>Path ${i + 1}</h4>
        <span class="path-length">${path.nodes.length - 1} hops</span>
      `;
      
      // Path nodes
      const pathNodes = document.createElement('div');
      pathNodes.className = 'path-nodes';
      
      // Format path as a chain of nodes
      for (let j = 0; j < path.nodes.length; j++) {
        const nodeId = path.nodes[j];
        const entity = this.dataset?.entities.find(e => e.id === nodeId);
        
        if (entity) {
          // Node element
          const nodeElement = document.createElement('div');
          nodeElement.className = 'path-node';
          nodeElement.innerHTML = `
            <span class="node-label">${entity.label}</span>
            <span class="node-type">${entity.type}</span>
          `;
          
          pathNodes.appendChild(nodeElement);
          
          // Add arrow if not the last node
          if (j < path.nodes.length - 1) {
            const arrow = document.createElement('div');
            arrow.className = 'path-arrow';
            arrow.innerHTML = `<i class="fas fa-arrow-right"></i>`;
            pathNodes.appendChild(arrow);
          }
        }
      }
      
      pathItem.appendChild(pathHeader);
      pathItem.appendChild(pathNodes);
      pathsList.appendChild(pathItem);
    }
    
    // Add message if more paths were found but not displayed
    if (sortedPaths.length > 10) {
      const moreInfo = document.createElement('div');
      moreInfo.className = 'more-info';
      moreInfo.textContent = `Showing 10 of ${sortedPaths.length} paths. The remaining paths are still highlighted in the graph.`;
      pathsList.appendChild(moreInfo);
    }
    
    resultsSection.appendChild(pathsList);
  }
  
  /**
   * Display impact analysis results
   */
  private displayImpactResults(result: ImpactAnalysisResult): void {
    const resultsSection = this.container.querySelector('.results-section');
    if (!resultsSection) return;
    
    resultsSection.innerHTML = '';
    
    // Result header
    const header = document.createElement('h3');
    header.textContent = 'Impact Analysis Results';
    resultsSection.appendChild(header);
    
    // Check if we have any impact at all
    if (result.directImpact.length === 0 && result.indirectImpact.length === 0) {
      // No impact found message
      const noResults = document.createElement('div');
      noResults.className = 'no-results';
      noResults.innerHTML = `
        <p><i class="fas fa-info-circle"></i> No impact found from the selected nodes.</p>
        <p>Try selecting different nodes or increasing the maximum depth.</p>
      `;
      resultsSection.appendChild(noResults);
      return;
    }
    
    // Summary metrics
    const summary = document.createElement('div');
    summary.className = 'result-summary';
    summary.innerHTML = `
      <div class="metric">
        <span class="metric-value">${result.directImpact.length}</span>
        <span class="metric-label">Direct Impact</span>
      </div>
      <div class="metric">
        <span class="metric-value">${result.indirectImpact.length}</span>
        <span class="metric-label">Indirect Impact</span>
      </div>
      <div class="metric">
        <span class="metric-value">${result.metrics.maxDepth}</span>
        <span class="metric-label">Max Depth</span>
      </div>
    `;
    resultsSection.appendChild(summary);
    
    // Create tabs for direct and indirect impact
    const tabs = document.createElement('div');
    tabs.className = 'impact-tabs';
    
    const directTab = document.createElement('div');
    directTab.className = 'impact-tab active';
    directTab.textContent = `Direct Impact (${result.directImpact.length})`;
    
    const indirectTab = document.createElement('div');
    indirectTab.className = 'impact-tab';
    indirectTab.textContent = `Indirect Impact (${result.indirectImpact.length})`;
    
    tabs.appendChild(directTab);
    tabs.appendChild(indirectTab);
    
    // Tab content
    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';
    
    // Direct impact content (shown by default)
    const directContent = document.createElement('div');
    directContent.className = 'impact-content active';
    
    if (result.directImpact.length === 0) {
      directContent.innerHTML = '<p class="no-results">No direct impact found</p>';
    } else {
      const directList = document.createElement('div');
      directList.className = 'impact-list';
      
      for (const nodeId of result.directImpact) {
        const entity = this.dataset?.entities.find(e => e.id === nodeId);
        if (entity) {
          const impactItem = this.createImpactItem(entity);
          directList.appendChild(impactItem);
        }
      }
      
      directContent.appendChild(directList);
    }
    
    // Indirect impact content (hidden by default)
    const indirectContent = document.createElement('div');
    indirectContent.className = 'impact-content';
    
    if (result.indirectImpact.length === 0) {
      indirectContent.innerHTML = '<p class="no-results">No indirect impact found</p>';
    } else {
      const indirectList = document.createElement('div');
      indirectList.className = 'impact-list';
      
      for (const nodeId of result.indirectImpact) {
        const entity = this.dataset?.entities.find(e => e.id === nodeId);
        if (entity) {
          const impactItem = this.createImpactItem(entity);
          indirectList.appendChild(impactItem);
        }
      }
      
      indirectContent.appendChild(indirectList);
    }
    
    tabContent.appendChild(directContent);
    tabContent.appendChild(indirectContent);
    
    // Add tab switching logic
    directTab.addEventListener('click', () => {
      directTab.classList.add('active');
      indirectTab.classList.remove('active');
      directContent.classList.add('active');
      indirectContent.classList.remove('active');
    });
    
    indirectTab.addEventListener('click', () => {
      indirectTab.classList.add('active');
      directTab.classList.remove('active');
      indirectContent.classList.add('active');
      directContent.classList.remove('active');
    });
    
    resultsSection.appendChild(tabs);
    resultsSection.appendChild(tabContent);
  }
  
  /**
   * Create an impact item for the impact list
   */
  private createImpactItem(entity: DataEntity): HTMLElement {
    const item = document.createElement('div');
    item.className = 'impact-item';
    
    const label = document.createElement('span');
    label.className = 'item-label';
    label.textContent = entity.label;
    
    const type = document.createElement('span');
    type.className = 'item-type';
    type.textContent = entity.type;
    
    // Add metadata if present
    if (Object.keys(entity.metadata).length > 0) {
      const metadata = document.createElement('div');
      metadata.className = 'item-metadata';
      
      for (const [key, value] of Object.entries(entity.metadata).slice(0, 3)) {
        const metaItem = document.createElement('span');
        metaItem.className = 'meta-item';
        metaItem.textContent = `${key}: ${value}`;
        metadata.appendChild(metaItem);
      }
      
      item.appendChild(label);
      item.appendChild(type);
      item.appendChild(metadata);
    } else {
      item.appendChild(label);
      item.appendChild(type);
    }
    
    return item;
  }
}