/**
 * Graph Builder Service
 * Builds a graph model from the raw data based on user-defined mapping
 */
import { 
  RawData, 
  MappingConfiguration, 
  Dataset, 
  DataEntity, 
  Relationship, 
  ClassDefinition 
} from '../../models/data-types';
import { generatePastelColor } from '../../utils/helpers';

export class GraphBuilderService {
  // Consistent color map to ensure entity types always get the same colors
  private static typeColorMap: Record<string, string> = {
    'schema': '#4682B4',    // Steel Blue
    'table': '#2ECC71',     // Emerald Green
    'column': '#E74C3C',    // Bright Red
    'view': '#F39C12',      // Orange
    'procedure': '#3498DB', // Bright Blue
    'user': '#9B59B6',      // Amethyst Purple
    'group': '#ECF0F1'      // Light Gray
  };
  
  /**
   * Build a dataset based on raw data and mapping configuration
   */
  buildDataset(rawData: RawData, mapping: MappingConfiguration): Dataset {
    console.log("Building dataset with mapping:", mapping);
    
    const entities: DataEntity[] = [];
    const relationships: Relationship[] = [];
    const entityMap = new Map<string, boolean>(); // Track created entities to avoid duplicates
    
    // Create entities based on class definitions
    for (const classDefinition of mapping.classes) {
      const { id: classId, name: className, sourceColumn, labelColumn, metadataColumns } = classDefinition;
      
      console.log(`Processing class: ${className}, source column: ${sourceColumn}, label column: ${labelColumn}`);
      
      // Store color in the type color map for consistency
      GraphBuilderService.typeColorMap[classId] = classDefinition.color;
      
      for (const row of rawData.rows) {
        const entityId = String(row[sourceColumn]);
        
        // Skip if entity ID is missing or already processed
        if (!entityId || entityId === 'undefined' || entityId === 'null') {
          continue;
        }
        
        const fullEntityId = `${classId}:${entityId}`;
        
        // Skip if already processed
        if (entityMap.has(fullEntityId)) {
          continue;
        }
        
        // Extract metadata from specified columns
        const metadata: Record<string, any> = {};
        for (const metadataColumn of metadataColumns) {
          if (row[metadataColumn] !== undefined) {
            metadata[metadataColumn] = row[metadataColumn];
          }
        }
        
        // Get label - if label column is empty, use entity ID as fallback
        const label = row[labelColumn] !== undefined && row[labelColumn] !== null 
          ? String(row[labelColumn]) 
          : entityId;
        
        // Create entity
        const entity: DataEntity = {
          id: fullEntityId,
          type: classId,
          label: label,
          metadata
        };
        
        entities.push(entity);
        entityMap.set(fullEntityId, true);
      }
    }
    
    console.log(`Created ${entities.length} entities`);
    
    // Create relationships based on relationship definitions
    for (const relationshipDef of mapping.relationships) {
      const { id: relId, sourceClass, targetClass, sourceColumn, targetColumn, metadataColumns } = relationshipDef;
      
      console.log(`Processing relationship: ${relId}, from ${sourceClass} to ${targetClass}`);
      
      // Count created relationships for this type
      let relationshipCount = 0;
      
      for (const row of rawData.rows) {
        const sourceEntityId = row[sourceColumn] !== undefined ? String(row[sourceColumn]) : '';
        const targetEntityId = row[targetColumn] !== undefined ? String(row[targetColumn]) : '';
        
        // Skip if source or target is missing
        if (!sourceEntityId || !targetEntityId || 
            sourceEntityId === 'undefined' || targetEntityId === 'undefined' ||
            sourceEntityId === 'null' || targetEntityId === 'null') {
          continue;
        }
        
        const sourceFullId = `${sourceClass}:${sourceEntityId}`;
        const targetFullId = `${targetClass}:${targetEntityId}`;
        
        // Skip if source or target entity doesn't exist
        if (!entityMap.has(sourceFullId) || !entityMap.has(targetFullId)) {
          continue;
        }
        
        // Skip self-loops (unless we want to support them)
        if (sourceFullId === targetFullId) {
          continue;
        }
        
        // Extract metadata from specified columns
        const metadata: Record<string, any> = {};
        for (const metadataColumn of metadataColumns) {
          if (row[metadataColumn] !== undefined) {
            metadata[metadataColumn] = row[metadataColumn];
          }
        }
        
        // Create relationship with unique ID
        const relationshipId = `${relId}:${sourceEntityId}-${targetEntityId}`;
        
        // Only add if this exact relationship doesn't already exist
        if (!relationships.some(r => r.id === relationshipId)) {
          const relationship: Relationship = {
            id: relationshipId,
            source: sourceFullId,
            target: targetFullId,
            type: relId,
            metadata
          };
          
          relationships.push(relationship);
          relationshipCount++;
        }
      }
      
      console.log(`Created ${relationshipCount} relationships of type ${relId}`);
    }
    
    return { entities, relationships };
  }
  
  /**
   * Extract unique values from a column to help with configuration
   */
  extractUniqueValues(rawData: RawData, column: string): string[] {
    const uniqueValues = new Set<string>();
    
    for (const row of rawData.rows) {
      const value = row[column];
      if (value !== undefined && value !== null) {
        uniqueValues.add(String(value));
      }
    }
    
    return Array.from(uniqueValues);
  }
  
  /**
   * Suggest potential class configurations based on data analysis
   */
  suggestClassConfigurations(rawData: RawData): Partial<MappingConfiguration> {
    const classes: ClassDefinition[] = [];
    const relationships: any[] = [];
    const columns = rawData.columns;
    
    // Analyze column names to find patterns
    const idColumns = this.findIdColumns(columns);
    const labelColumns = this.findLabelColumns(columns);
    const relationshipColumns = this.findRelationshipColumns(columns);
    const typeColumns = this.findTypeColumns(columns);

    // Get column statistics to help with suggestions
    const columnStats = this.analyzeColumnStatistics(rawData);
    
    console.log("Suggesting configuration based on columns:", columns);
    console.log("ID columns:", idColumns);
    console.log("Label columns:", labelColumns);
    console.log("Relationship columns:", relationshipColumns);
    
    // First check if there are any type columns that categorize data
    if (typeColumns.length > 0) {
      // Get the first type column as main classifier
      const typeColumn = typeColumns[0];
      const types = this.extractUniqueValues(rawData, typeColumn);
      
      console.log(`Found type column: ${typeColumn} with values:`, types);
      
      // For each type, create a class
      for (const type of types) {
        // Find an ID column that correlates with this type
        const relevantIdColumns = this.findCorrelatedColumns(rawData, typeColumn, type, idColumns);
        if (relevantIdColumns.length === 0) continue;
        
        const idColumn = relevantIdColumns[0];
        
        // Find a matching label column
        const relevantLabelColumns = this.findCorrelatedColumns(rawData, typeColumn, type, labelColumns);
        const labelColumn = relevantLabelColumns.length > 0 ? relevantLabelColumns[0] : idColumn;
        
        // Generate a class name from the type
        const className = this.formatClassName(type);
        const classId = className.toLowerCase().replace(/\s/g, '_');
        
        // Get or generate a color for this class
        let classColor = GraphBuilderService.typeColorMap[classId];
        if (!classColor) {
          classColor = this.getConsistentPastelColor(classId);
          GraphBuilderService.typeColorMap[classId] = classColor;
        }
        
        // Create class
        classes.push({
          id: classId,
          name: className,
          sourceColumn: idColumn,
          labelColumn: labelColumn,
          metadataColumns: this.getMetadataColumns(columns, [typeColumn, idColumn, labelColumn, ...relationshipColumns]),
          color: classColor
        });
      }
    } else {
      // No type columns found, use ID columns to infer classes
      for (const idColumn of idColumns) {
        // Find a potential matching label column
        const matchingLabelPrefix = idColumn.replace(/id|key|code/i, '');
        const matchingLabelColumn = labelColumns.find(col => 
          col.startsWith(matchingLabelPrefix) || idColumn.startsWith(col.replace(/name|label|title|desc/i, ''))
        );
        
        // Generate a class name from the column name
        const className = this.generateClassName(idColumn);
        const classId = className.toLowerCase().replace(/\s/g, '_');
        
        // Get or generate a color for this class
        let classColor = GraphBuilderService.typeColorMap[classId];
        if (!classColor) {
          classColor = this.getConsistentPastelColor(classId);
          GraphBuilderService.typeColorMap[classId] = classColor;
        }
        
        // Create class definition
        classes.push({
          id: classId,
          name: className,
          sourceColumn: idColumn,
          labelColumn: matchingLabelColumn || idColumn,
          metadataColumns: this.getMetadataColumns(columns, [idColumn, matchingLabelColumn || '', ...relationshipColumns]),
          color: classColor
        });
      }
    }
    
    // Create potential relationship definitions
    for (const relColumn of relationshipColumns) {
      // Find potential matching class
      const relPrefix = relColumn.replace(/parent|ref|source|target|from|to/i, '');
      const matchingClass = classes.find(cls => 
        cls.name.toLowerCase().includes(relPrefix.toLowerCase()) || 
        relPrefix.toLowerCase().includes(cls.name.toLowerCase())
      );
      
      if (matchingClass) {
        // Determine if this is a self-relationship or points to another class
        if (relColumn.includes('parent')) {
          // Self-relationship (parent-child)
          relationships.push({
            id: `parent_${matchingClass.id}`,
            name: `Parent ${matchingClass.name}`,
            sourceClass: matchingClass.id,
            targetClass: matchingClass.id,
            sourceColumn: matchingClass.sourceColumn,
            targetColumn: relColumn,
            metadataColumns: []
          });
        } else {
          // Find another class this might relate to
          const otherClasses = classes.filter(cls => cls.id !== matchingClass.id);
          for (const otherClass of otherClasses) {
            // Check if the relationship column matches the other class
            if (relColumn.toLowerCase().includes(otherClass.name.toLowerCase()) || 
                otherClass.name.toLowerCase().includes(relPrefix.toLowerCase())) {
              relationships.push({
                id: `${matchingClass.id}_to_${otherClass.id}`,
                name: `${matchingClass.name} to ${otherClass.name}`,
                sourceClass: matchingClass.id,
                targetClass: otherClass.id,
                sourceColumn: matchingClass.sourceColumn,
                targetColumn: relColumn,
                metadataColumns: []
              });
              break;
            }
          }
        }
      }
    }
    
    // If no relationships were found but we have multiple classes, try to infer them
    if (relationships.length === 0 && classes.length > 1) {
      // Try to find relationships by looking for columns that match class IDs
      for (let i = 0; i < classes.length; i++) {
        for (let j = 0; j < classes.length; j++) {
          if (i === j) continue; // Skip self-relationships
          
          const sourceClass = classes[i];
          const targetClass = classes[j];
          
          // Look for columns that might reference the target class
          const potentialRefColumns = columns.filter(column => 
            column.toLowerCase().includes(targetClass.name.toLowerCase()) ||
            column.toLowerCase().includes(targetClass.id)
          );
          
          for (const refColumn of potentialRefColumns) {
            relationships.push({
              id: `${sourceClass.id}_to_${targetClass.id}`,
              name: `${sourceClass.name} to ${targetClass.name}`,
              sourceClass: sourceClass.id,
              targetClass: targetClass.id,
              sourceColumn: sourceClass.sourceColumn,
              targetColumn: refColumn,
              metadataColumns: []
            });
            break;
          }
        }
      }
    }
    
    console.log(`Suggested ${classes.length} classes and ${relationships.length} relationships`);
    
    return { classes, relationships };
  }
  
  /**
   * Find columns that likely contain IDs
   */
  private findIdColumns(columns: string[]): string[] {
    return columns.filter(col => 
      /id$|^id|_id$|key$|code$|uuid|guid/i.test(col) && 
      !/parent|ref|source|target|from|to/i.test(col)
    );
  }
  
  /**
   * Find columns that likely contain labels or names
   */
  private findLabelColumns(columns: string[]): string[] {
    return columns.filter(col => 
      /name$|^name|_name$|label|title|desc/i.test(col)
    );
  }
  
  /**
   * Find columns that likely represent relationships
   */
  private findRelationshipColumns(columns: string[]): string[] {
    return columns.filter(col => 
      /parent|ref|_id$|fk_|source|target|from|to/i.test(col) &&
      !/primary/i.test(col)
    );
  }
  
  /**
   * Find columns that might indicate types/categories
   */
  private findTypeColumns(columns: string[]): string[] {
    return columns.filter(col => 
      /type$|^type|_type$|category|class|kind/i.test(col)
    );
  }
  
  /**
   * Analyze column statistics to help with suggestions
   */
  private analyzeColumnStatistics(rawData: RawData): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const column of rawData.columns) {
      const values = rawData.rows.map(row => row[column]).filter(val => val !== undefined && val !== null);
      
      // Count unique values
      const uniqueValues = new Set(values);
      
      // Calculate percentage of rows with this value
      const coverage = values.length / rawData.rows.length;
      
      // Determine type (number, string, date, boolean)
      const types = new Set(values.map(val => typeof val));
      const primaryType = types.size === 1 ? Array.from(types)[0] : 'mixed';
      
      stats[column] = {
        uniqueCount: uniqueValues.size,
        coverage,
        primaryType,
        isUnique: uniqueValues.size === values.length && values.length > 0,
        examples: values.slice(0, 5)
      };
    }
    
    return stats;
  }
  
  /**
   * Find columns that correlate with a specific value in a type column
   */
  private findCorrelatedColumns(
    rawData: RawData, 
    typeColumn: string, 
    typeValue: string, 
    candidateColumns: string[]
  ): string[] {
    // Get rows of this type
    const rowsOfType = rawData.rows.filter(row => String(row[typeColumn]) === typeValue);
    
    if (rowsOfType.length === 0) return [];
    
    // For each candidate column, check if it has values for these rows
    return candidateColumns.filter(column => {
      const filledValues = rowsOfType.filter(row => row[column] !== undefined && row[column] !== null);
      return filledValues.length / rowsOfType.length > 0.7; // At least 70% of rows have a value
    });
  }
  
  /**
   * Get potential metadata columns by excluding known structure columns
   */
  private getMetadataColumns(columns: string[], excludeColumns: string[]): string[] {
    return columns.filter(col => !excludeColumns.includes(col));
  }
  
  /**
   * Format a class name properly
   */
  private formatClassName(name: string): string {
    // Replace underscores and hyphens with spaces
    let formattedName = name.replace(/[_-]/g, ' ');
    
    // Capitalize first letter of each word
    formattedName = formattedName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return formattedName;
  }
  
  /**
   * Generate a class name from a column name
   */
  private generateClassName(columnName: string): string {
    // Remove common suffixes/prefixes
    let name = columnName
      .replace(/Id$|Key$|Code$/i, '')
      .replace(/^id_|^key_|^code_/i, '');
    
    // If name became empty, use original
    if (!name) name = columnName;
    
    // Convert snake_case or kebab-case to Title Case
    return this.formatClassName(name);
  }
  
  /**
   * Get a consistent color for a class/type based on its name
   * This ensures the same entity types always get the same color
   */
  private getConsistentPastelColor(id: string): string {
    // Check if we already have a color for this type
    if (GraphBuilderService.typeColorMap[id]) {
      return GraphBuilderService.typeColorMap[id];
    }
    
    // Predefined vibrant colors for common entity types
    const typeColors: Record<string, string> = {
      'schema': '#4682B4',   // Steel Blue
      'table': '#2ECC71',    // Emerald Green
      'column': '#E74C3C',   // Bright Red
      'view': '#F39C12',     // Orange
      'procedure': '#3498DB', // Bright Blue
      'user': '#9B59B6',     // Amethyst Purple
      'database': '#16A085', // Green
      'server': '#2980B9',   // Blue
      'application': '#8E44AD', // Purple
      'service': '#F1C40F',  // Yellow
      'endpoint': '#E67E22', // Orange
      'api': '#D35400',      // Dark Orange
      'client': '#27AE60',   // Green
    };
    
    // Check if the id contains any of the known type keywords
    for (const [type, color] of Object.entries(typeColors)) {
      if (id.toLowerCase().includes(type)) {
        GraphBuilderService.typeColorMap[id] = color;
        return color;
      }
    }
    
    // If no match, generate a pastel color based on the hash of the id
    const color = generatePastelColor();
    GraphBuilderService.typeColorMap[id] = color;
    return color;
  }
}