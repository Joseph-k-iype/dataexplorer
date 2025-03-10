/**
 * Configuration Panel Component
 * Allows users to define how data is mapped to graph elements
 */
import { RawData, MappingConfiguration, ClassDefinition, RelationshipDefinition } from '../../models/data-types';
import { GraphBuilderService } from '../../services/graph-builder/GraphBuilderService';
import { generatePastelColor } from '../../utils/helpers';

export class ConfigurationPanel {
  private container: HTMLElement;
  private rawData: RawData | null = null;
  private config: MappingConfiguration = { classes: [], relationships: [] };
  private graphBuilder: GraphBuilderService;
  private onConfigChangeCallback: ((config: MappingConfiguration) => void) | null = null;
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.graphBuilder = new GraphBuilderService();
    
    // Initialize empty panel
    this.render();
  }
  
  /**
   * Set the raw data and initialize configuration suggestions
   */
  setData(rawData: RawData): void {
    this.rawData = rawData;
    
    // Generate suggested configuration
    const suggestions = this.graphBuilder.suggestClassConfigurations(rawData);
    this.config = {
      classes: suggestions.classes || [],
      relationships: suggestions.relationships || []
    };
    
    // Re-render the panel
    this.render();
  }
  
  /**
   * Register callback for configuration changes
   */
  onConfigChange(callback: (config: MappingConfiguration) => void): void {
    this.onConfigChangeCallback = callback;
  }
  
  /**
   * Get current configuration
   */
  getConfiguration(): MappingConfiguration {
    return this.config;
  }
  
  /**
   * Render the configuration panel
   */
  private render(): void {
    if (!this.container) return;
    
    // Clear previous content
    this.container.innerHTML = '';
    
    if (!this.rawData) {
      this.renderEmptyState();
      return;
    }
    
    // Create panel structure
    const panel = document.createElement('div');
    panel.className = 'config-panel';
    
    // Add header
    const header = document.createElement('div');
    header.className = 'config-header';
    header.innerHTML = `
      <h2>Data Mapping Configuration</h2>
      <p>Configure how your data is mapped to graph elements</p>
    `;
    panel.appendChild(header);
    
    // Add class definitions section
    const classesSection = this.createClassesSection();
    panel.appendChild(classesSection);
    
    // Add relationship definitions section
    const relationshipsSection = this.createRelationshipsSection();
    panel.appendChild(relationshipsSection);
    
    // Add action buttons
    const actions = document.createElement('div');
    actions.className = 'config-actions';
    
    const applyButton = document.createElement('button');
    applyButton.className = 'btn btn-primary';
    applyButton.textContent = 'Apply Configuration';
    applyButton.addEventListener('click', () => this.applyConfiguration());
    
    const resetButton = document.createElement('button');
    resetButton.className = 'btn btn-secondary';
    resetButton.textContent = 'Reset to Defaults';
    resetButton.addEventListener('click', () => this.resetConfiguration());
    
    actions.appendChild(applyButton);
    actions.appendChild(resetButton);
    panel.appendChild(actions);
    
    // Add to container
    this.container.appendChild(panel);
  }
  
  /**
   * Render empty state when no data is loaded
   */
  private renderEmptyState(): void {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <h3>No Data Loaded</h3>
      <p>Please upload a file to configure graph mapping</p>
    `;
    this.container.appendChild(emptyState);
  }
  
  /**
   * Create the classes configuration section
   */
  private createClassesSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'config-section';
    
    // Section header
    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
      <h3>Node Classes</h3>
      <p>Define types of nodes in your graph</p>
    `;
    
    // Add button for new class
    const addButton = document.createElement('button');
    addButton.className = 'btn btn-sm btn-outline';
    addButton.innerHTML = '<i class="fas fa-plus"></i> Add Class';
    addButton.addEventListener('click', () => this.addClass());
    header.appendChild(addButton);
    
    section.appendChild(header);
    
    // Classes list
    const classesList = document.createElement('div');
    classesList.className = 'classes-list';
    
    // Render each class
    for (let i = 0; i < this.config.classes.length; i++) {
      const classItem = this.createClassItem(this.config.classes[i], i);
      classesList.appendChild(classItem);
    }
    
    section.appendChild(classesList);
    return section;
  }
  
  /**
   * Create a class configuration item with improved descriptions
   */
  private createClassItem(classDefinition: ClassDefinition, index: number): HTMLElement {
    const item = document.createElement('div');
    item.className = 'config-item';
    item.style.borderLeft = `4px solid ${classDefinition.color}`;
    
    // Class header with name and controls
    const header = document.createElement('div');
    header.className = 'item-header';
    
    const title = document.createElement('h4');
    title.textContent = classDefinition.name;
    
    const controls = document.createElement('div');
    controls.className = 'item-controls';
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-sm btn-danger';
    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeClass(index);
    });
    
    const expandButton = document.createElement('button');
    expandButton.className = 'btn btn-sm btn-outline';
    expandButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
    
    controls.appendChild(deleteButton);
    controls.appendChild(expandButton);
    
    header.appendChild(title);
    header.appendChild(controls);
    item.appendChild(header);
    
    // Class details form
    const details = document.createElement('div');
    details.className = 'item-details';
    
    if (this.rawData) {
      const columns = this.rawData.columns;
      
      // Name field
      details.appendChild(this.createTextField('Class Name:', `class-name-${index}`, classDefinition.name, (value) => {
        this.config.classes[index].name = value;
        title.textContent = value;
      }));
      
      // ID field
      details.appendChild(this.createTextField('Class ID:', `class-id-${index}`, classDefinition.id, (value) => {
        this.config.classes[index].id = value;
      }));
      
      // Source column selector with improved tooltip
      const sourceColumnGroup = this.createSelectField(
        'Entity ID Column:', 
        `source-column-${index}`, 
        columns, 
        classDefinition.sourceColumn, 
        (value) => {
          this.config.classes[index].sourceColumn = value;
        }
      );
      
      // Add tooltip for Entity ID Column
      const sourceColumnHelp = document.createElement('div');
      sourceColumnHelp.className = 'field-help';
      sourceColumnHelp.innerHTML = `
        <p class="help-text">The column containing unique identifiers for each entity (node). 
        These values will be used to create and reference nodes in the graph.</p>
        <p class="help-example">Example: "employee_id", "product_code", etc.</p>
      `;
      sourceColumnHelp.style.fontSize = '12px';
      sourceColumnHelp.style.color = 'var(--color-text-secondary)';
      sourceColumnHelp.style.marginTop = '4px';
      sourceColumnHelp.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
      sourceColumnHelp.style.padding = '6px';
      sourceColumnHelp.style.borderRadius = '4px';
      
      sourceColumnGroup.appendChild(sourceColumnHelp);
      details.appendChild(sourceColumnGroup);
      
      // Label column selector with improved tooltip
      const labelColumnGroup = this.createSelectField(
        'Entity Label Column:', 
        `label-column-${index}`, 
        columns, 
        classDefinition.labelColumn, 
        (value) => {
          this.config.classes[index].labelColumn = value;
        }
      );
      
      // Add tooltip for Label Column
      const labelColumnHelp = document.createElement('div');
      labelColumnHelp.className = 'field-help';
      labelColumnHelp.innerHTML = `
        <p class="help-text">The column containing the text to display as node labels in the graph.</p>
        <p class="help-example">Example: "employee_name", "product_title", etc.</p>
      `;
      labelColumnHelp.style.fontSize = '12px';
      labelColumnHelp.style.color = 'var(--color-text-secondary)';
      labelColumnHelp.style.marginTop = '4px';
      labelColumnHelp.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
      labelColumnHelp.style.padding = '6px';
      labelColumnHelp.style.borderRadius = '4px';
      
      labelColumnGroup.appendChild(labelColumnHelp);
      details.appendChild(labelColumnGroup);
      
      // Color picker
      details.appendChild(this.createColorField('Node Color:', `class-color-${index}`, classDefinition.color, (value) => {
        this.config.classes[index].color = value;
        item.style.borderLeft = `4px solid ${value}`;
      }));
      
      // Metadata columns selector (multi-select)
      const metadataGroup = this.createMultiSelectField(
        'Metadata Columns:', 
        `metadata-columns-${index}`, 
        columns, 
        classDefinition.metadataColumns, 
        (values) => {
          this.config.classes[index].metadataColumns = values;
        }
      );
      
      // Add tooltip for Metadata Columns
      const metadataHelp = document.createElement('div');
      metadataHelp.className = 'field-help';
      metadataHelp.innerHTML = `
        <p class="help-text">Additional columns to include as metadata for each node. 
        This information will be available when you hover or select nodes.</p>
      `;
      metadataHelp.style.fontSize = '12px';
      metadataHelp.style.color = 'var(--color-text-secondary)';
      metadataHelp.style.marginTop = '4px';
      metadataHelp.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
      metadataHelp.style.padding = '6px';
      metadataHelp.style.borderRadius = '4px';
      
      metadataGroup.appendChild(metadataHelp);
      details.appendChild(metadataGroup);
    }
    
    item.appendChild(details);
    
    // Toggle expansion on header click
    header.addEventListener('click', (e) => {
      if (e.target !== deleteButton && e.target !== deleteButton.firstChild) {
        details.classList.toggle('expanded');
        expandButton.innerHTML = details.classList.contains('expanded') 
          ? '<i class="fas fa-chevron-up"></i>' 
          : '<i class="fas fa-chevron-down"></i>';
      }
    });
    
    return item;
  }
  
  /**
   * Create the relationships configuration section
   */
  private createRelationshipsSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'config-section';
    
    // Section header
    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
      <h3>Relationships</h3>
      <p>Define connections between node classes</p>
    `;
    
    // Add button for new relationship
    const addButton = document.createElement('button');
    addButton.className = 'btn btn-sm btn-outline';
    addButton.innerHTML = '<i class="fas fa-plus"></i> Add Relationship';
    addButton.addEventListener('click', () => this.addRelationship());
    header.appendChild(addButton);
    
    section.appendChild(header);
    
    // Relationships list
    const relationshipsList = document.createElement('div');
    relationshipsList.className = 'relationships-list';
    
    // Render each relationship
    for (let i = 0; i < this.config.relationships.length; i++) {
      const relationshipItem = this.createRelationshipItem(this.config.relationships[i], i);
      relationshipsList.appendChild(relationshipItem);
    }
    
    section.appendChild(relationshipsList);
    return section;
  }
  
  /**
   * Create a relationship configuration item
   */
  private createRelationshipItem(relationship: RelationshipDefinition, index: number): HTMLElement {
    const item = document.createElement('div');
    item.className = 'config-item';
    
    // Relationship header with name and controls
    const header = document.createElement('div');
    header.className = 'item-header';
    
    const title = document.createElement('h4');
    title.textContent = relationship.name;
    
    const controls = document.createElement('div');
    controls.className = 'item-controls';
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-sm btn-danger';
    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeRelationship(index);
    });
    
    const expandButton = document.createElement('button');
    expandButton.className = 'btn btn-sm btn-outline';
    expandButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
    
    controls.appendChild(deleteButton);
    controls.appendChild(expandButton);
    
    header.appendChild(title);
    header.appendChild(controls);
    item.appendChild(header);
    
    // Relationship details form
    const details = document.createElement('div');
    details.className = 'item-details';
    
    if (this.rawData) {
      const columns = this.rawData.columns;
      const classOptions = this.config.classes.map(c => ({ value: c.id, label: c.name }));
      
      // Name field
      details.appendChild(this.createTextField('Relationship Name:', `rel-name-${index}`, relationship.name, (value) => {
        this.config.relationships[index].name = value;
        title.textContent = value;
      }));
      
      // ID field
      details.appendChild(this.createTextField('Relationship ID:', `rel-id-${index}`, relationship.id, (value) => {
        this.config.relationships[index].id = value;
      }));
      
      // Source class selector
      const sourceClassGroup = this.createCustomSelectField('Source Class:', `source-class-${index}`, classOptions, relationship.sourceClass, (value) => {
        this.config.relationships[index].sourceClass = value;
      });
      
      // Add tooltip for Source Class
      const sourceClassHelp = document.createElement('div');
      sourceClassHelp.className = 'field-help';
      sourceClassHelp.innerHTML = `
        <p class="help-text">The class of nodes where the relationship starts.</p>
      `;
      sourceClassHelp.style.fontSize = '12px';
      sourceClassHelp.style.color = 'var(--color-text-secondary)';
      sourceClassHelp.style.marginTop = '4px';
      sourceClassHelp.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
      sourceClassHelp.style.padding = '6px';
      sourceClassHelp.style.borderRadius = '4px';
      
      sourceClassGroup.appendChild(sourceClassHelp);
      details.appendChild(sourceClassGroup);
      
      // Target class selector
      const targetClassGroup = this.createCustomSelectField('Target Class:', `target-class-${index}`, classOptions, relationship.targetClass, (value) => {
        this.config.relationships[index].targetClass = value;
      });
      
      // Add tooltip for Target Class
      const targetClassHelp = document.createElement('div');
      targetClassHelp.className = 'field-help';
      targetClassHelp.innerHTML = `
        <p class="help-text">The class of nodes where the relationship ends.</p>
      `;
      targetClassHelp.style.fontSize = '12px';
      targetClassHelp.style.color = 'var(--color-text-secondary)';
      targetClassHelp.style.marginTop = '4px';
      targetClassHelp.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
      targetClassHelp.style.padding = '6px';
      targetClassHelp.style.borderRadius = '4px';
      
      targetClassGroup.appendChild(targetClassHelp);
      details.appendChild(targetClassGroup);
      
      // Source column selector
      const sourceColumnGroup = this.createSelectField('Source Entity ID Column:', `rel-source-column-${index}`, columns, relationship.sourceColumn, (value) => {
        this.config.relationships[index].sourceColumn = value;
      });
      
      // Add tooltip for Source Column
      const sourceColumnHelp = document.createElement('div');
      sourceColumnHelp.className = 'field-help';
      sourceColumnHelp.innerHTML = `
        <p class="help-text">The column containing IDs that match source class entity IDs.</p>
        <p class="help-example">This connects the relationship to its starting node.</p>
      `;
      sourceColumnHelp.style.fontSize = '12px';
      sourceColumnHelp.style.color = 'var(--color-text-secondary)';
      sourceColumnHelp.style.marginTop = '4px';
      sourceColumnHelp.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
      sourceColumnHelp.style.padding = '6px';
      sourceColumnHelp.style.borderRadius = '4px';
      
      sourceColumnGroup.appendChild(sourceColumnHelp);
      details.appendChild(sourceColumnGroup);
      
      // Target column selector
      const targetColumnGroup = this.createSelectField('Target Entity ID Column:', `rel-target-column-${index}`, columns, relationship.targetColumn, (value) => {
        this.config.relationships[index].targetColumn = value;
      });
      
      // Add tooltip for Target Column
      const targetColumnHelp = document.createElement('div');
      targetColumnHelp.className = 'field-help';
      targetColumnHelp.innerHTML = `
        <p class="help-text">The column containing IDs that match target class entity IDs.</p>
        <p class="help-example">This connects the relationship to its ending node.</p>
      `;
      targetColumnHelp.style.fontSize = '12px';
      targetColumnHelp.style.color = 'var(--color-text-secondary)';
      targetColumnHelp.style.marginTop = '4px';
      targetColumnHelp.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
      targetColumnHelp.style.padding = '6px';
      targetColumnHelp.style.borderRadius = '4px';
      
      targetColumnGroup.appendChild(targetColumnHelp);
      details.appendChild(targetColumnGroup);
      
      // Metadata columns selector (multi-select)
      details.appendChild(this.createMultiSelectField('Metadata Columns:', `rel-metadata-columns-${index}`, columns, relationship.metadataColumns, (values) => {
        this.config.relationships[index].metadataColumns = values;
      }));
    }
    
    item.appendChild(details);
    
    // Toggle expansion on header click
    header.addEventListener('click', (e) => {
      if (e.target !== deleteButton && e.target !== deleteButton.firstChild) {
        details.classList.toggle('expanded');
        expandButton.innerHTML = details.classList.contains('expanded') 
          ? '<i class="fas fa-chevron-up"></i>' 
          : '<i class="fas fa-chevron-down"></i>';
      }
    });
    
    return item;
  }
  
  /**
   * Add a new class definition with better defaults
   */
  private addClass(): void {
    // Generate a unique ID for the new class
    const newId = `class_${Date.now()}`;
    
    // Pick a good default column for source (prefer columns with 'id' in the name)
    let defaultSourceColumn = this.rawData?.columns[0] || '';
    if (this.rawData) {
      const idColumns = this.rawData.columns.filter(col => 
        /id$|^id|_id$|key$|code$/i.test(col)
      );
      if (idColumns.length > 0) {
        defaultSourceColumn = idColumns[0];
      }
    }
    
    // Pick a good default column for label (prefer columns with 'name' in the name)
    let defaultLabelColumn = defaultSourceColumn;
    if (this.rawData) {
      const nameColumns = this.rawData.columns.filter(col => 
        /name$|^name|_name$|label|title|desc$/i.test(col)
      );
      if (nameColumns.length > 0) {
        defaultLabelColumn = nameColumns[0];
      }
    }
    
    const newClass: ClassDefinition = {
      id: newId,
      name: `Class ${this.config.classes.length + 1}`,
      sourceColumn: defaultSourceColumn,
      labelColumn: defaultLabelColumn,
      metadataColumns: [],
      color: generatePastelColor()
    };
    
    this.config.classes.push(newClass);
    this.render();
  }
  
  /**
   * Remove a class definition
   */
  private removeClass(index: number): void {
    // Store class ID before removal for relationship cleanup
    const classId = this.config.classes[index].id;
    
    // Remove the class
    this.config.classes.splice(index, 1);
    
    // Remove relationships that reference this class
    this.config.relationships = this.config.relationships.filter(rel => 
      rel.sourceClass !== classId && rel.targetClass !== classId
    );
    
    this.render();
  }
  
  /**
   * Add a new relationship definition
   */
  private addRelationship(): void {
    // Only allow relationships if there are at least 2 classes
    if (this.config.classes.length < 2) {
      alert('You need at least two classes to create a relationship');
      return;
    }
    
    const newId = `rel_${Date.now()}`;
    const newRelationship: RelationshipDefinition = {
      id: newId,
      name: `Relationship ${this.config.relationships.length + 1}`,
      sourceClass: this.config.classes[0].id,
      targetClass: this.config.classes[1].id,
      sourceColumn: this.rawData?.columns[0] || '',
      targetColumn: this.rawData?.columns[0] || '',
      metadataColumns: []
    };
    
    this.config.relationships.push(newRelationship);
    this.render();
  }
  
  /**
   * Remove a relationship definition
   */
  private removeRelationship(index: number): void {
    this.config.relationships.splice(index, 1);
    this.render();
  }
  
  /**
   * Apply the current configuration
   */
  private applyConfiguration(): void {
    if (this.onConfigChangeCallback) {
      this.onConfigChangeCallback(this.config);
      
      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'success-message';
      successMessage.innerHTML = `
        <p><i class="fas fa-check-circle"></i> Configuration applied successfully!</p>
        <p>The graph has been updated with your settings.</p>
      `;
      successMessage.style.backgroundColor = 'rgba(0, 230, 118, 0.1)';
      successMessage.style.borderLeft = '3px solid var(--color-success)';
      successMessage.style.padding = '10px';
      successMessage.style.marginTop = '15px';
      successMessage.style.borderRadius = '4px';
      
      // Find a good place to insert this message
      const actionsPanel = this.container.querySelector('.config-actions');
      if (actionsPanel) {
        actionsPanel.parentNode?.insertBefore(successMessage, actionsPanel.nextSibling);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
          successMessage.style.opacity = '0';
          successMessage.style.transition = 'opacity 0.5s';
          setTimeout(() => successMessage.remove(), 500);
        }, 5000);
      }
    }
  }
  
  /**
   * Reset to default configuration with improved explanations
   */
  private resetConfiguration(): void {
    if (confirm('Reset to default configuration? This will discard any changes you have made.')) {
      if (this.rawData) {
        const suggestions = this.graphBuilder.suggestClassConfigurations(this.rawData);
        this.config = {
          classes: suggestions.classes || [],
          relationships: suggestions.relationships || []
        };
        this.render();
        
        // Display a message about the automatic configuration
        const infoMessage = document.createElement('div');
        infoMessage.className = 'info-message';
        infoMessage.innerHTML = `
          <p><i class="fas fa-info-circle"></i> Configuration has been reset to defaults.</p>
          <p>The system has analyzed your data and suggested a configuration based on column names and content patterns.</p>
          <p>You can adjust these settings or <strong>click "Apply Configuration"</strong> to build the graph.</p>
        `;
        infoMessage.style.backgroundColor = 'rgba(76, 132, 255, 0.1)';
        infoMessage.style.borderLeft = '3px solid var(--color-primary)';
        infoMessage.style.padding = '10px';
        infoMessage.style.marginTop = '15px';
        infoMessage.style.borderRadius = '4px';
        
        // Find a good place to insert this message
        const actionsPanel = this.container.querySelector('.config-actions');
        if (actionsPanel) {
          actionsPanel.parentNode?.insertBefore(infoMessage, actionsPanel);
          
          // Auto-remove after 10 seconds
          setTimeout(() => {
            infoMessage.style.opacity = '0';
            infoMessage.style.transition = 'opacity 0.5s';
            setTimeout(() => infoMessage.remove(), 500);
          }, 10000);
        }
      }
    }
  }
  
  /**
   * Create a text input field
   */
  private createTextField(
    label: string,
    id: string,
    value: string,
    onChange: (value: string) => void
  ): HTMLElement {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    const labelElement = document.createElement('label');
    labelElement.setAttribute('for', id);
    labelElement.textContent = label;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.id = id;
    input.value = value;
    input.addEventListener('change', (e) => {
      onChange((e.target as HTMLInputElement).value);
    });
    
    formGroup.appendChild(labelElement);
    formGroup.appendChild(input);
    
    return formGroup;
  }
  
  /**
   * Create a select field
   */
  private createSelectField(
    label: string,
    id: string,
    options: string[],
    value: string,
    onChange: (value: string) => void
  ): HTMLElement {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    const labelElement = document.createElement('label');
    labelElement.setAttribute('for', id);
    labelElement.textContent = label;
    
    const select = document.createElement('select');
    select.id = id;
    
    for (const option of options) {
      const optionElement = document.createElement('option');
      optionElement.value = option;
      optionElement.textContent = option;
      if (option === value) {
        optionElement.selected = true;
      }
      select.appendChild(optionElement);
    }
    
    select.addEventListener('change', (e) => {
      onChange((e.target as HTMLSelectElement).value);
    });
    
    formGroup.appendChild(labelElement);
    formGroup.appendChild(select);
    
    return formGroup;
  }
  
  /**
   * Create a custom select field with value/label pairs
   */
  private createCustomSelectField(
    label: string,
    id: string,
    options: Array<{value: string, label: string}>,
    value: string,
    onChange: (value: string) => void
  ): HTMLElement {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    const labelElement = document.createElement('label');
    labelElement.setAttribute('for', id);
    labelElement.textContent = label;
    
    const select = document.createElement('select');
    select.id = id;
    
    for (const option of options) {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      if (option.value === value) {
        optionElement.selected = true;
      }
      select.appendChild(optionElement);
    }
    
    select.addEventListener('change', (e) => {
      onChange((e.target as HTMLSelectElement).value);
    });
    
    formGroup.appendChild(labelElement);
    formGroup.appendChild(select);
    
    return formGroup;
  }
  
  /**
   * Create a multi-select field
   */
  private createMultiSelectField(
    label: string,
    id: string,
    options: string[],
    values: string[],
    onChange: (values: string[]) => void
  ): HTMLElement {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    
    const selectContainer = document.createElement('div');
    selectContainer.className = 'multi-select-container';
    
    // Create checkboxes for each option
    for (const option of options) {
      const checkboxContainer = document.createElement('div');
      checkboxContainer.className = 'checkbox-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `${id}-${option}`;
      checkbox.value = option;
      checkbox.checked = values.includes(option);
      
      const checkboxLabel = document.createElement('label');
      checkboxLabel.setAttribute('for', `${id}-${option}`);
      checkboxLabel.textContent = option;
      
      checkbox.addEventListener('change', () => {
        const selectedValues = Array.from(
          selectContainer.querySelectorAll('input[type="checkbox"]:checked')
        ).map((cb) => (cb as HTMLInputElement).value);
        
        onChange(selectedValues);
      });
      
      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(checkboxLabel);
      selectContainer.appendChild(checkboxContainer);
    }
    
    formGroup.appendChild(labelElement);
    formGroup.appendChild(selectContainer);
    
    return formGroup;
  }
  
  /**
   * Create a color picker field
   */
  private createColorField(
    label: string,
    id: string,
    value: string,
    onChange: (value: string) => void
  ): HTMLElement {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    const labelElement = document.createElement('label');
    labelElement.setAttribute('for', id);
    labelElement.textContent = label;
    
    const input = document.createElement('input');
    input.type = 'color';
    input.id = id;
    input.value = this.toHexColor(value);
    
    input.addEventListener('change', (e) => {
      onChange((e.target as HTMLInputElement).value);
    });
    
    formGroup.appendChild(labelElement);
    formGroup.appendChild(input);
    
    return formGroup;
  }
  
  /**
   * Convert any color format to hex for color input
   */
  private toHexColor(color: string): string {
    // If it's already a hex color, return it
    if (/^#[0-9A-F]{6}$/i.test(color)) {
      return color;
    }
    
    // If it's an rgba color, convert to hex
    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1]);
      const g = parseInt(rgbaMatch[2]);
      const b = parseInt(rgbaMatch[3]);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    
    // Default fallback
    return '#cccccc';
  }
}