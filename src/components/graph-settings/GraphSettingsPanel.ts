/**
 * Graph Settings Panel
 * Provides UI controls for customizing graph appearance and behavior
 */
import { Dataset } from '../../models/data-types';

export interface GraphSettings {
  nodeColors: Record<string, string>;
  showGroups: boolean;
  showEdgeLabels: boolean;
  highlightEdgeLabels: boolean;
}

export class GraphSettingsPanel {
  private container: HTMLElement;
  private componentElement: HTMLElement;
  private dataset: Dataset | null = null;
  private settings: GraphSettings = {
    nodeColors: {},
    showGroups: true,
    showEdgeLabels: true,
    highlightEdgeLabels: true
  };
  private onSettingsChangeCallback: ((settings: GraphSettings) => void) | null = null;
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.componentElement = document.createElement('div');
    
    // Initialize UI
    this.render();
  }
  
  /**
   * Get the component element
   */
  getElement(): HTMLElement {
    return this.componentElement;
  }
  
  /**
   * Set dataset for extracting node types
   */
  setDataset(dataset: Dataset): void {
    this.dataset = dataset;
    this.render();
  }
  
  /**
   * Register callback for when settings change
   */
  onSettingsChange(callback: (settings: GraphSettings) => void): void {
    this.onSettingsChangeCallback = callback;
  }
  
  /**
   * Render the settings panel
   */
  private render(): void {
    this.componentElement.innerHTML = '';
    
    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'settings-panel';
    
    // Panel header
    const header = document.createElement('div');
    header.className = 'settings-header';
    header.innerHTML = `
      <h3>Graph Settings</h3>
      <p>Customize the appearance and behavior of the graph</p>
    `;
    
    // Node color settings
    const colorSection = document.createElement('div');
    colorSection.className = 'settings-section';
    
    const colorHeader = document.createElement('h4');
    colorHeader.textContent = 'Node Colors';
    colorSection.appendChild(colorHeader);
    
    // Create color pickers for each node type if dataset is loaded
    if (this.dataset) {
      const nodeTypes = this.getUniqueNodeTypes();
      
      if (nodeTypes.length > 0) {
        const colorGrid = document.createElement('div');
        colorGrid.className = 'color-grid';
        
        for (const type of nodeTypes) {
          const colorItem = this.createColorPickerItem(type);
          colorGrid.appendChild(colorItem);
        }
        
        colorSection.appendChild(colorGrid);
      } else {
        colorSection.innerHTML += '<p class="empty-message">No node types found in the dataset</p>';
      }
    } else {
      colorSection.innerHTML += '<p class="empty-message">Load a dataset to customize node colors</p>';
    }
    
    // Toggle settings
    const toggleSection = document.createElement('div');
    toggleSection.className = 'settings-section';
    
    const toggleHeader = document.createElement('h4');
    toggleHeader.textContent = 'Display Options';
    toggleSection.appendChild(toggleHeader);
    
    // Create toggle for grouping
    const groupToggle = this.createToggleItem(
      'Show Node Groups', 
      'Enable or disable node grouping',
      this.settings.showGroups,
      (checked) => {
        this.settings.showGroups = checked;
        this.notifySettingsChanged();
      }
    );
    
    // Create toggle for edge labels
    const edgeLabelToggle = this.createToggleItem(
      'Show Edge Labels', 
      'Display labels on edges',
      this.settings.showEdgeLabels,
      (checked) => {
        this.settings.showEdgeLabels = checked;
        
        // Update edge label highlight toggle state
        const highlightToggle = this.componentElement.querySelector('#edge-label-highlight-toggle') as HTMLInputElement;
        if (highlightToggle) {
          highlightToggle.disabled = !checked;
          highlightToggle.parentElement!.classList.toggle('disabled', !checked);
        }
        
        this.notifySettingsChanged();
      }
    );
    
    // Create toggle for edge label highlights
    const edgeLabelHighlightToggle = this.createToggleItem(
      'Highlight Edge Labels', 
      'Add background to edge labels for better visibility',
      this.settings.highlightEdgeLabels,
      (checked) => {
        this.settings.highlightEdgeLabels = checked;
        this.notifySettingsChanged();
      },
      'edge-label-highlight-toggle',
      !this.settings.showEdgeLabels
    );
    
    toggleSection.appendChild(groupToggle);
    toggleSection.appendChild(edgeLabelToggle);
    toggleSection.appendChild(edgeLabelHighlightToggle);
    
    // Apply button
    const actionSection = document.createElement('div');
    actionSection.className = 'settings-actions';
    
    const resetButton = document.createElement('button');
    resetButton.className = 'btn btn-secondary';
    resetButton.textContent = 'Reset to Defaults';
    resetButton.addEventListener('click', () => this.resetSettings());
    
    actionSection.appendChild(resetButton);
    
    // Assemble panel
    settingsPanel.appendChild(header);
    settingsPanel.appendChild(colorSection);
    settingsPanel.appendChild(toggleSection);
    settingsPanel.appendChild(actionSection);
    
    this.componentElement.appendChild(settingsPanel);
  }
  
  /**
   * Create a color picker item for a node type
   */
  private createColorPickerItem(nodeType: string): HTMLElement {
    const container = document.createElement('div');
    container.className = 'color-item';
    
    const label = document.createElement('label');
    label.setAttribute('for', `color-${nodeType}`);
    label.textContent = nodeType;
    
    // Get current color from settings or use default
    const currentColor = this.settings.nodeColors[nodeType] || this.getDefaultColorForType(nodeType);
    
    // Store color in settings if not already set
    if (!this.settings.nodeColors[nodeType]) {
      this.settings.nodeColors[nodeType] = currentColor;
    }
    
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.id = `color-${nodeType}`;
    colorPicker.value = currentColor;
    colorPicker.addEventListener('change', (e) => {
      const newColor = (e.target as HTMLInputElement).value;
      this.settings.nodeColors[nodeType] = newColor;
      this.notifySettingsChanged();
    });
    
    container.appendChild(label);
    container.appendChild(colorPicker);
    
    return container;
  }
  
  /**
   * Create a toggle switch item
   */
  private createToggleItem(
    label: string, 
    description: string, 
    initialState: boolean,
    onChange: (checked: boolean) => void,
    id?: string,
    disabled: boolean = false
  ): HTMLElement {
    const container = document.createElement('div');
    container.className = 'toggle-item';
    if (disabled) {
      container.classList.add('disabled');
    }
    
    const header = document.createElement('div');
    header.className = 'toggle-header';
    
    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    if (id) {
      labelElement.setAttribute('for', id);
    }
    
    const toggle = document.createElement('div');
    toggle.className = 'toggle-switch';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = initialState;
    input.disabled = disabled;
    if (id) {
      input.id = id;
    }
    
    input.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      onChange(checked);
    });
    
    const slider = document.createElement('span');
    slider.className = 'toggle-slider';
    
    toggle.appendChild(input);
    toggle.appendChild(slider);
    
    header.appendChild(labelElement);
    header.appendChild(toggle);
    
    const descElement = document.createElement('p');
    descElement.className = 'toggle-description';
    descElement.textContent = description;
    
    container.appendChild(header);
    container.appendChild(descElement);
    
    return container;
  }
  
  /**
   * Get unique node types from the dataset
   */
  private getUniqueNodeTypes(): string[] {
    if (!this.dataset) return [];
    
    const types = new Set<string>();
    for (const entity of this.dataset.entities) {
      types.add(entity.type);
    }
    
    return Array.from(types);
  }
  
  /**
   * Get default color for a node type
   */
  private getDefaultColorForType(type: string): string {
    // Standard color palette for different node types
    const typeColors: Record<string, string> = {
      'database': '#4682B4',   // Steel Blue
      'service': '#2ECC71',    // Emerald Green
      'client': '#E74C3C',     // Bright Red
      'gateway': '#F39C12',    // Orange
      'server': '#3498DB',     // Bright Blue
      'schema': '#9B59B6',     // Amethyst Purple
      'table': '#16A085',      // Green
      'column': '#E67E22',     // Orange
      'view': '#2980B9',       // Blue
      'group': '#95A5A6',      // Gray
    };
    
    // Return color for the type or generate a consistent color
    return typeColors[type.toLowerCase()] || this.generateConsistentColor(type);
  }
  
  /**
   * Generate a consistent color based on a string
   */
  private generateConsistentColor(str: string): string {
    // Simple hash function to generate a consistent number from a string
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert to a hex color
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      // Make sure color is not too dark or too light
      const adjustedValue = Math.max(Math.min(value, 220), 50);
      color += ('00' + adjustedValue.toString(16)).substr(-2);
    }
    
    return color;
  }
  
  /**
   * Reset settings to defaults
   */
  private resetSettings(): void {
    this.settings = {
      nodeColors: {},
      showGroups: true,
      showEdgeLabels: true,
      highlightEdgeLabels: true
    };
    
    // Rebuild UI with default settings
    this.render();
    
    // Notify about changes
    this.notifySettingsChanged();
  }
  
  /**
   * Notify about settings changes
   */
  private notifySettingsChanged(): void {
    if (this.onSettingsChangeCallback) {
      this.onSettingsChangeCallback({ ...this.settings });
    }
  }
}