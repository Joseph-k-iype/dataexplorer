/**
 * Graph Viewer Component
 * Visualizes and manages the graph display using yFiles
 */
import {
  GraphComponent,
  GraphEditorInputMode,
  INode,
  IEdge,
  Rect,
  ShapeNodeStyle,
  PolylineEdgeStyle,
  Arrow,
  IGraph,
  Color,
  HierarchicalLayout,
  LayoutExecutor,
  OrganicLayout,
  RadialLayout,
  Point,
  ShapeNodeShape,
  GroupNodeStyle,
  FoldingManager,
  ViewportAnimation,
  NodeStyleIndicatorRenderer,
  EdgeStyleIndicatorRenderer,
  GraphItemTypes,
  Insets,
  ArrowType,
  HierarchicalLayoutRoutingStyle,
  NodeLabelPlacement,
  EdgeLabelPlacement,
  Size,
  ItemEventArgs,
  IModelItem,
  // Add these imports for label placement
  ExteriorNodeLabelModel,
  ExteriorNodeLabelModelPosition,
  EdgeLabelPreferredPlacement
} from '@yfiles/yfiles';

import { 
  Dataset, 
  DataEntity, 
  Relationship, 
  PathAnalysisResult, 
  ImpactAnalysisResult, 
  LayoutType 
} from '../../models/data-types';

export class GraphViewer {
  private graphComponent: GraphComponent;
  private graph: IGraph;
  private nodeMap: Map<string, INode> = new Map();
  private edgeMap: Map<string, IEdge> = new Map();
  private dataset: Dataset | null = null;
  private foldingManager: FoldingManager | null = null;
  private foldingView: IGraph | null = null;
  private nodeSelectionCallback: ((nodeIds: string[]) => void) | null = null;
  
  constructor(container: HTMLElement) {
    // Initialize GraphComponent
    this.graphComponent = new GraphComponent(container);
    
    // Get the graph instance
    this.graph = this.graphComponent.graph;
    
    // Configure input mode for interactive exploration
    const inputMode = new GraphEditorInputMode({
      allowGroupingOperations: true
    });
    
    // Enable interactive features
    inputMode.moveUnselectedItemsInputMode.enabled = true;
    inputMode.navigationInputMode.allowCollapseGroup = true;
    inputMode.navigationInputMode.allowExpandGroup = true;
    
    // Use the collection events to listen for selection changes - note the kebab-case event names
    this.graphComponent.selection.addEventListener('item-added', 
      (evt: ItemEventArgs<IModelItem>) => {
        this.onSelectionChanged();
      }
    );
    
    this.graphComponent.selection.addEventListener('item-removed', 
      (evt: ItemEventArgs<IModelItem>) => {
        this.onSelectionChanged();
      }
    );
    
    // Setup double-click behavior to focus on nodes
    container.addEventListener('dblclick', (event: MouseEvent) => {
      // Get the clicked position in the container
      const rect = container.getBoundingClientRect();
      const viewPoint = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      // Convert the view coordinates to world coordinates
      const worldLocation = this.graphComponent.viewToWorldCoordinates(viewPoint);
      
      // Use GraphItemTypes.NODE as an array element for yFiles 3.0
      const hitItems = inputMode.findItems(worldLocation, [GraphItemTypes.NODE]);
      
      if (hitItems.size > 0) {
        const item = hitItems.first();
        if (item instanceof INode) {
          this.zoomToNode(item);
        }
      }
    });
    
    // Set input mode
    this.graphComponent.inputMode = inputMode;
    
    // Initialize with empty graph
    this.clear();
  }
  
  /**
   * Clear the graph
   */
  clear(): void {
    this.graph.clear();
    this.nodeMap.clear();
    this.edgeMap.clear();
    this.dataset = null;
    this.graphComponent.fitGraphBounds();
  }
  
  /**
   * Load dataset into the graph
   */
  async loadDataset(dataset: Dataset): Promise<void> {
    this.clear();
    this.dataset = dataset;
    
    // Setup folding support
    this.setupFolding();
    
    // First pass: Create nodes
    this.createNodes(dataset.entities);
    
    // Second pass: Create edges
    this.createEdges(dataset.relationships);
    
    // Apply initial layout
    await this.applyLayout('hierarchical');
  }
  
  /**
   * Apply a layout algorithm to the graph
   */
  async applyLayout(layoutType: LayoutType): Promise<void> {
    // Create layout algorithm based on type
    let layout;
    
    switch (layoutType) {
      case 'hierarchical':
        layout = new HierarchicalLayout({
          nodeDistance: 100,       // Increased from 50 to prevent overlap
          edgeDistance: 30,        // Increased from 20
          minimumLayerDistance: 80, // Add minimum layer distance to prevent vertical overlap
          nodeLabelPlacement: NodeLabelPlacement.CONSIDER,
          edgeLabelPlacement: EdgeLabelPlacement.INTEGRATED,
        });
        break;
        
      case 'organic':
        layout = new OrganicLayout({
          defaultMinimumNodeDistance: 80,   // Increased from 30 to prevent overlap
          qualityTimeRatio: 0.7,
          nodeLabelPlacement: NodeLabelPlacement.CONSIDER,
          edgeLabelPlacement: EdgeLabelPlacement.INTEGRATED
        });
        break;
        
      case 'radial':
        layout = new RadialLayout({
          minimumNodeDistance: 80,  // Increased from 30 to prevent overlap
        });
        break;
    }
    
    // Create layout executor
    const executor = new LayoutExecutor({
      graphComponent: this.graphComponent,
      layout,
      animationDuration: '0.8s',
      animateViewport: true,
      easedAnimation: true
    });
    
    // Run layout
    await executor.start();
  }
  
  /**
   * Register callback for node selection changes
   */
  onNodeSelection(callback: (nodeIds: string[]) => void): void {
    this.nodeSelectionCallback = callback;
  }
  
  /**
   * Highlight paths from path analysis result
   */
  highlightPaths(result: PathAnalysisResult): void {
    // Reset highlighting
    this.clearHighlights();
    
    // Highlight all paths
    for (const path of result.paths) {
      // Highlight nodes in path
      for (const nodeId of path.nodes) {
        const node = this.nodeMap.get(nodeId);
        if (node) {
          this.highlightNode(node, 'path');
        }
      }
      
      // Highlight edges in path
      for (const edgeId of path.edges) {
        const edge = this.edgeMap.get(edgeId);
        if (edge) {
          this.highlightEdge(edge, 'path');
        }
      }
    }
  }
  
  /**
   * Highlight impact results
   */
  highlightImpact(result: ImpactAnalysisResult): void {
    // Reset highlighting
    this.clearHighlights();
    
    // Highlight direct impact nodes
    for (const nodeId of result.directImpact) {
      const node = this.nodeMap.get(nodeId);
      if (node) {
        this.highlightNode(node, 'direct-impact');
      }
    }
    
    // Highlight indirect impact nodes
    for (const nodeId of result.indirectImpact) {
      const node = this.nodeMap.get(nodeId);
      if (node) {
        this.highlightNode(node, 'indirect-impact');
      }
    }
  }
  
  /**
   * Setup folding support for graph
   */
  private setupFolding(): void {
    // Create a folding manager
    this.foldingManager = new FoldingManager(this.graph);
    
    // Create folding view 
    const folderView = this.foldingManager.createFoldingView();
    this.foldingView = folderView.graph;
    
    // Use the folding view instead of the original graph
    if (this.foldingView) {
      this.graph = this.foldingView;
      this.graphComponent.graph = this.graph;
    }
  }
  
  /**
   * Create nodes from entities
   */
  private createNodes(entities: DataEntity[]): void {
    const typeGroups = new Map<string, DataEntity[]>();
    
    // Group entities by type
    for (const entity of entities) {
      if (!typeGroups.has(entity.type)) {
        typeGroups.set(entity.type, []);
      }
      typeGroups.get(entity.type)!.push(entity);
    }
    
    // Process each type group
    for (const [type, entitiesOfType] of typeGroups.entries()) {
      // Create a group node for this type
      const groupEntity: DataEntity = {
        id: `group:${type}`,
        type: 'group',
        label: `${type} (${entitiesOfType.length})`,
        metadata: { count: entitiesOfType.length }
      };
      
      // Create the group node
      const groupNode = this.createNodeForEntity(groupEntity, true);
      
      // Create child nodes inside the group
      for (const entity of entitiesOfType) {
        const node = this.createNodeForEntity(entity, false);
        // Assign to group
        this.graph.setParent(node, groupNode);
      }
    }
  }
  
  /**
   * Create a node for an entity
   */
  private createNodeForEntity(entity: DataEntity, isGroup: boolean): INode {
    // Determine node style based on type
    let nodeStyle;
    
    // Get consistent color for this entity type
    const entityColor = this.getColorForType(entity.type);
    
    if (isGroup) {
      // Group node style
      nodeStyle = new GroupNodeStyle({
        contentAreaPadding: new Insets(10),
        tabBackgroundFill: entityColor,
        tabFill: entityColor,
        stroke: '2px #667788',
        cornerRadius: 8
      });
    } else {
      // Always use circle shape for regular nodes
      nodeStyle = new ShapeNodeStyle({
        shape: ShapeNodeShape.ELLIPSE, // Always use ellipse (circle) shape
        fill: entityColor,
        stroke: '2px #667788'
      });
    }
    
    // Create node
    const node = isGroup
      ? this.graph.createGroupNode({
          style: nodeStyle,
          tag: entity
        })
      : this.graph.createNode({
          style: nodeStyle,
          tag: entity
        });
    
    // Configure label to be positioned below the node
    const labelModel = new ExteriorNodeLabelModel({
      margins: new Insets(5)
    });
    const labelParameter = labelModel.createParameter(ExteriorNodeLabelModelPosition.BOTTOM);
    
    // Add label with proper placement
    this.graph.addLabel({
      owner: node,
      text: entity.label,
      layoutParameter: labelParameter
    });
    
    // Store in map for later reference
    this.nodeMap.set(entity.id, node);
    
    return node;
  }
  
  /**
   * Create edges from relationships
   */
  private createEdges(relationships: Relationship[]): void {
    for (const relationship of relationships) {
      // Get source and target nodes
      const sourceNode = this.nodeMap.get(relationship.source);
      const targetNode = this.nodeMap.get(relationship.target);
      
      // Skip if either node doesn't exist
      if (!sourceNode || !targetNode) {
        continue;
      }
      
      // Create edge style
      const edgeStyle = new PolylineEdgeStyle({
        stroke: '1.5px #667788',
        // Updated for yFiles 3.0
        targetArrow: new Arrow({
          type: ArrowType.TRIANGLE,
          cropAtPort: false
        })
      });
      
      // Create edge
      const edge = this.graph.createEdge({
        source: sourceNode,
        target: targetNode,
        style: edgeStyle,
        tag: relationship
      });
      
      // Add label if type is meaningful
      if (relationship.type && relationship.type !== 'default') {
        this.graph.addLabel(edge, relationship.type);
      }
      
      // Store in map for later reference
      this.edgeMap.set(relationship.id, edge);
    }
  }
  
  /**
   * Handle selection changed
   */
  private onSelectionChanged(): void {
    if (!this.nodeSelectionCallback) return;
    
    // Get selected nodes - in yFiles 3.0 we need to filter the selection collection for nodes
    const selectedNodes: INode[] = [];
    this.graphComponent.selection.forEach(item => {
      if (item instanceof INode) {
        selectedNodes.push(item);
      }
    });
    
    // Map to entity IDs
    const selectedNodeIds = selectedNodes.map(node => {
      const entity = node.tag as DataEntity;
      return entity.id;
    });
    
    // Notify via callback
    this.nodeSelectionCallback(selectedNodeIds);
  }
  
  /**
   * Clear all highlights
   */
  private clearHighlights(): void {
    this.graphComponent.highlights.clear();
  }
  
  /**
   * Highlight a specific node
   */
  private highlightNode(node: INode, type: 'path' | 'direct-impact' | 'indirect-impact'): void {
    // Define highlight appearance based on type
    let highlightStyle;
    const margins = new Insets(5);
    
    switch (type) {
      case 'path':
        highlightStyle = new NodeStyleIndicatorRenderer({
          margins,
          // Updated for yFiles 3.0
          nodeStyle: new ShapeNodeStyle({
            stroke: '3px gold',
            fill: 'transparent'
          })
        });
        break;
      case 'direct-impact':
        highlightStyle = new NodeStyleIndicatorRenderer({
          margins,
          // Updated for yFiles 3.0
          nodeStyle: new ShapeNodeStyle({
            stroke: '3px crimson',
            fill: 'transparent'
          })
        });
        break;
      case 'indirect-impact':
        highlightStyle = new NodeStyleIndicatorRenderer({
          margins: new Insets(3),
          // Updated for yFiles 3.0
          nodeStyle: new ShapeNodeStyle({
            stroke: '2px orange',
            fill: 'transparent'
          })
        });
        break;
    }
    
    // Add to highlights
    this.graphComponent.highlights.add(node);
  }
  
  /**
   * Highlight a specific edge
   */
  private highlightEdge(edge: IEdge, type: 'path' | 'impact'): void {
    // Define highlight appearance based on type
    const highlightStyle = new EdgeStyleIndicatorRenderer({
      // Updated for yFiles 3.0
      edgeStyle: new PolylineEdgeStyle({
        stroke: type === 'path' ? '3px gold' : '3px crimson'
      })
    });
    
    // Add edge to highlights
    this.graphComponent.highlights.add(edge);
  }
  
  /**
   * Zoom to a specific node
   */
  private zoomToNode(node: INode): void {
    // Calculate target bounds with padding
    const nodeBounds = node.layout.toRect();
    const targetBounds = nodeBounds.getEnlarged(50);
    
    // Animate to the target bounds
    // Updated for yFiles 3.0 - changed signature
    const viewportAnimation = new ViewportAnimation(this.graphComponent, targetBounds, '0.5s');
    viewportAnimation.animate(0);
  }
  
  /**
   * Get a shape for a node type - always returns circle for consistency
   */
  private getShapeForType(type: string): ShapeNodeShape {
    // Always return ELLIPSE shape for all node types as requested
    return ShapeNodeShape.ELLIPSE;
  }
  
  /**
   * Get a color for a node type - using more vibrant, distinct colors
   */
  private getColorForType(type: string): string {
    // Map entity types to more vibrant colors with better contrast
    const typeToColor: Record<string, string> = {
      'schema': '#4682B4',   // Steel Blue
      'table': '#2ECC71',    // Emerald Green
      'column': '#E74C3C',   // Bright Red
      'view': '#F39C12',     // Orange
      'procedure': '#3498DB', // Bright Blue
      'user': '#9B59B6',     // Amethyst Purple
      'group': '#ECF0F1'     // Light Gray
    };
    
    return typeToColor[type] || '#95A5A6'; // Default to a medium gray if type not found
  }
  
  /**
   * Add a method to export the graph as an image
   */
  async exportAsSVG(): Promise<string> {
    // Create SVG export options
    const exportOptions = {
      margin: new Insets(5),
      scale: 1,
      exportImageElements: true
    };
    
    try {
      // Create an SVG exporter and generate SVG string
      // Note: Implementation details may vary based on yFiles 3.0 API
      // This is a placeholder for the actual implementation
      return '<svg>Placeholder SVG</svg>';
    } catch (error) {
      console.error('Error exporting SVG:', error);
      throw error;
    }
  }
  
  /**
   * Method to fit the graph into the available view
   */
  fitGraph(): void {
    this.graphComponent.fitGraphBounds();
  }
  
  /**
   * Method to center the graph at a specific point
   */
  centerAt(x: number, y: number): void {
    this.graphComponent.center = new Point(x, y);
  }
  
  /**
   * Method to set zoom level
   */
  setZoom(zoomLevel: number): void {
    this.graphComponent.zoom = zoomLevel;
  }
  
  /**
   * Method to get the current zoom level
   */
  getZoom(): number {
    return this.graphComponent.zoom;
  }
  
  /**
   * Adds a new node to the graph
   */
  addNewNode(entity: DataEntity): INode | null {
    if (this.nodeMap.has(entity.id)) {
      console.warn(`Node with ID ${entity.id} already exists`);
      return null;
    }
    
    const node = this.createNodeForEntity(entity, false);
    return node;
  }
  
  /**
   * Adds a new edge to the graph
   */
  addNewEdge(relationship: Relationship): IEdge | null {
    if (this.edgeMap.has(relationship.id)) {
      console.warn(`Edge with ID ${relationship.id} already exists`);
      return null;
    }
    
    const sourceNode = this.nodeMap.get(relationship.source);
    const targetNode = this.nodeMap.get(relationship.target);
    
    if (!sourceNode || !targetNode) {
      console.warn(`Source or target node not found for relationship ${relationship.id}`);
      return null;
    }
    
    // Create edge style
    const edgeStyle = new PolylineEdgeStyle({
      stroke: '1.5px #667788',
      targetArrow: new Arrow({
        type: ArrowType.TRIANGLE,
        cropAtPort: false
      })
    });
    
    // Create edge
    const edge = this.graph.createEdge({
      source: sourceNode,
      target: targetNode,
      style: edgeStyle,
      tag: relationship
    });
    
    // Add label if type is meaningful
    if (relationship.type && relationship.type !== 'default') {
      this.graph.addLabel(edge, relationship.type);
    }
    
    // Store in map for later reference
    this.edgeMap.set(relationship.id, edge);
    
    return edge;
  }
  
  /**
   * Updates an entity's properties and refreshes its visual representation
   */
  updateEntity(entityId: string, updates: Partial<DataEntity>): boolean {
    const node = this.nodeMap.get(entityId);
    if (!node) {
      console.warn(`Node with ID ${entityId} not found`);
      return false;
    }
    
    // Get current entity data
    const entity = node.tag as DataEntity;
    
    // Update entity properties
    Object.assign(entity, updates);
    
    // Update label if it changed
    if (updates.label) {
      // In yFiles 3.0, we need to get the first label differently
      if (node.labels.size > 0) {
        const label = node.labels.first();
        if (label !== null) {
          this.graph.setLabelText(label, updates.label);
        }
      }
    }
    
    // Update style if type changed
    if (updates.type) {
      const isGroup = entity.type === 'group';
      let newStyle;
      
      // Get consistent color for this entity type
      const entityColor = this.getColorForType(entity.type);
      
      if (isGroup) {
        newStyle = new GroupNodeStyle({
          contentAreaPadding: new Insets(10),
          tabBackgroundFill: entityColor,
          tabFill: entityColor,
          stroke: '2px #667788',
          cornerRadius: 8
        });
      } else {
        newStyle = new ShapeNodeStyle({
          shape: ShapeNodeShape.ELLIPSE, // Always use circle shape
          fill: entityColor,
          stroke: '2px #667788'
        });
      }
      
      this.graph.setStyle(node, newStyle);
    }
    
    return true;
  }
  
  /**
   * Remove a node from the graph
   */
  removeNode(entityId: string): boolean {
    const node = this.nodeMap.get(entityId);
    if (!node) {
      console.warn(`Node with ID ${entityId} not found`);
      return false;
    }
    
    // Remove from graph
    this.graph.remove(node);
    
    // Remove from node map
    this.nodeMap.delete(entityId);
    
    return true;
  }
  
  /**
   * Remove an edge from the graph
   */
  removeEdge(relationshipId: string): boolean {
    const edge = this.edgeMap.get(relationshipId);
    if (!edge) {
      console.warn(`Edge with ID ${relationshipId} not found`);
      return false;
    }
    
    // Remove from graph
    this.graph.remove(edge);
    
    // Remove from edge map
    this.edgeMap.delete(relationshipId);
    
    return true;
  }
}