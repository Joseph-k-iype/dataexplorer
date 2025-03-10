/**
 * Core data models for the application
 */

/**
 * Generic data entity that can represent any type of node
 */
export interface DataEntity {
    id: string;
    type: string;
    label: string;
    metadata: Record<string, any>;
  }
  
  /**
   * Represents a relationship between two entities
   */
  export interface Relationship {
    id: string;
    source: string;
    target: string;
    type: string;
    metadata: Record<string, any>;
  }
  
  /**
   * Dataset containing entities and relationships
   */
  export interface Dataset {
    entities: DataEntity[];
    relationships: Relationship[];
  }
  
  /**
   * Configuration for mapping CSV/JSON to graph elements
   */
  export interface MappingConfiguration {
    // Class definitions (e.g., Schema, Table, Column)
    classes: ClassDefinition[];
    
    // Relationship definitions between classes
    relationships: RelationshipDefinition[];
  }
  
  /**
   * Definition of a class (node type)
   */
  export interface ClassDefinition {
    id: string;
    name: string;
    sourceColumn: string; // Column that contains the entity ID
    labelColumn: string; // Column that contains the entity label
    metadataColumns: string[]; // Columns to include as metadata
    color: string; // Visual style
    icon?: string; // Optional icon
  }
  
  /**
   * Definition of a relationship between classes
   */
  export interface RelationshipDefinition {
    id: string;
    name: string;
    sourceClass: string; // ID of the source class
    targetClass: string; // ID of the target class
    sourceColumn: string; // Column containing source entity IDs
    targetColumn: string; // Column containing target entity IDs
    metadataColumns: string[]; // Columns to include as metadata
  }
  
  /**
   * Raw data from uploaded files
   */
  export interface RawData {
    columns: string[];
    rows: Record<string, any>[];
  }
  
  /**
   * Analysis result for path finding
   */
  export interface PathAnalysisResult {
    paths: Array<{
      nodes: string[];
      edges: string[];
      metadata: Record<string, any>;
    }>;
    metrics: {
      totalPaths: number;
      shortestPathLength: number;
      longestPathLength: number;
    };
  }
  
  /**
   * Analysis result for impact analysis
   */
  export interface ImpactAnalysisResult {
    directImpact: string[];
    indirectImpact: string[];
    metrics: {
      totalImpactedNodes: number;
      maxDepth: number;
      criticalPaths: number;
    };
  }
  
  /**
   * Graph layout options
   */
  export type LayoutType = 'hierarchical' | 'organic' | 'radial';
  
  /**
   * Node selection event
   */
  export interface NodeSelectionEvent {
    added: string[];
    removed: string[];
    selected: string[];
  }
  
  /**
   * Graph export format
   */
  export type ExportFormat = 'svg' | 'png' | 'pdf';
  
  /**
   * Visualization style for nodes/relationships
   */
  export interface VisualizationStyle {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
    shape?: string;
    icon?: string;
    width?: number;
    height?: number;
  }
  
  /**
   * Application state interface
   */
  export interface AppState {
    rawData: RawData | null;
    mapping: MappingConfiguration | null;
    dataset: Dataset | null;
    selectedEntities: string[];
    activeAnalysis: 'path' | 'impact' | null;
    analysisResults: PathAnalysisResult | ImpactAnalysisResult | null;
  }