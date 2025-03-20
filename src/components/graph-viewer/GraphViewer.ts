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
  LabelStyle,
  ExteriorNodeLabelModel,
  ExteriorNodeLabelModelPosition,
  EdgeLabelPreferredPlacement,
  SvgExport,
  CssFill,
  IFoldingView,
  ILabel
} from '@yfiles/yfiles';

import { 
  Dataset, 
  DataEntity, 
  Relationship, 
  PathAnalysisResult, 
  ImpactAnalysisResult, 
  LayoutType 
} from '../../models/data-types';

import { GraphSettings } from '../../components/graph-settings/GraphSettingsPanel';

export class GraphViewer {
  private graphComponent: GraphComponent;
  private graph: IGraph;
  private nodeMap: Map<string, INode> = new Map();
  private edgeMap: Map<string, IEdge> = new Map();
  private dataset: Dataset | null = null;
  private foldingManager: FoldingManager | null = null;
  private foldingView: IFoldingView | null = null;
  private nodeSelectionCallback: ((nodeIds: string[]) => void) | null = null;
  private settings: GraphSettings = {
    nodeColors: {},
    showGroups: true,
    showEdgeLabels: true,
    highlightEdgeLabels: true
  };
  
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
    
    // Use the collection events to listen for selection changes
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
      
      // Use GraphItemTypes.NODE for yFiles 3.0
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
   * Update graph settings
   */
  updateSettings(settings: GraphSettings): void {
    this.settings = { ...settings };
    this.applySettings();
  }

  /**
   * Apply current settings to the graph
   */
  private applySettings(): void {
    if (!this.graph) return;
    
    // Apply node colors based on type
    this.nodeMap.forEach((node, id) => {
      const entity = node.tag as DataEntity;
      if (entity && entity.type) {
        // Get color from settings or use default
        const color = this.settings.nodeColors[entity.type] || this.getDefaultColorForType(entity.type);
        
        // Get current style
        const currentStyle = node.style;
        
        if (currentStyle instanceof ShapeNodeStyle) {
          // Create new style with updated color
          const newStyle = new ShapeNodeStyle({
            shape: ShapeNodeShape.ELLIPSE, // Always use circle shape
            fill: new CssFill(color),
            stroke: '2px #667788'
          });
          
          // Apply the new style
          this.graph.setStyle(node, newStyle);
        }
      }
    });
    
    // Toggle group node visibility
    if (this.foldingManager && this.foldingView) {
      if (this.settings.showGroups) {
        // Expand all groups
        this.graph.nodes.forEach(node => {
          if (this.graph.isGroupNode(node)) {
            this.foldingView?.expand(node);
          }
        });
      } else {
        // Collapse all groups
        this.graph.nodes.forEach(node => {
          if (this.graph.isGroupNode(node)) {
            this.foldingView?.collapse(node);
          }
        });
      }
    }
    
    // Toggle edge label visibility
    // this.edgeMap.forEach((edge) => {
    //   // Get all labels for this edge
    //   for (let i = 0; i < edge.labels.size; i++) {
    //     const label = edge.labels.get(i);
    //     if (label) {
    //       // Set label visibility
    //       this.graph.set(label, this.settings.showEdgeLabels);
          
    //       // Apply highlight if needed
    //       if (this.settings.showEdgeLabels && this.settings.highlightEdgeLabels) {
    //         // Use a custom style for labels with background
    //         const style = new LabelStyle({
    //           backgroundFill: 'rgba(255, 255, 255, 0.8)',
    //           backgroundStroke: 'rgba(0, 0, 0, 0.1)'
    //         });
    //         this.graph.setStyle(label, style);
    //       } else if (this.settings.showEdgeLabels) {
    //         // Use default style without background
    //         const style = new LabelStyle();
    //         this.graph.setStyle(label, style);
    //       }
    //     }
    //   }
    // });
    
    // Refresh the view
    this.graphComponent.invalidate();
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
    
    // Apply settings
    this.applySettings();
    
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
          nodeDistance: 100,       
          edgeDistance: 30,        
          minimumLayerDistance: 80, 
          nodeLabelPlacement: NodeLabelPlacement.CONSIDER,
          edgeLabelPlacement: EdgeLabelPlacement.INTEGRATED,
        });
        break;
        
      case 'organic':
        layout = new OrganicLayout({
          defaultMinimumNodeDistance: 80,   
          qualityTimeRatio: 0.7,
          nodeLabelPlacement: NodeLabelPlacement.CONSIDER,
          edgeLabelPlacement: EdgeLabelPlacement.INTEGRATED
        });
        break;
        
      case 'radial':
        layout = new RadialLayout({
          minimumNodeDistance: 80,  
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
    this.foldingView = this.foldingManager.createFoldingView();
    
    // Use the folding view instead of the original graph
    if (this.foldingView) {
      this.graph = this.foldingView.graph;
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
    
    // Get color from settings or default
    const entityColor = this.settings.nodeColors[entity.type] || this.getDefaultColorForType(entity.type);
    
    if (isGroup) {
      // Group node style
      nodeStyle = new GroupNodeStyle({
        contentAreaPadding: new Insets(10),
        tabBackgroundFill: new CssFill(entityColor),
        tabFill: new CssFill(entityColor),
        stroke: '2px #667788',
        cornerRadius: 8
      });
    } else {
      // Always use circle shape for regular nodes
      nodeStyle = new ShapeNodeStyle({
        shape: ShapeNodeShape.ELLIPSE, // Always use ellipse (circle) shape
        fill: new CssFill(entityColor),
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
      
      // Add label if type is meaningful and edge labels are enabled
      if (relationship.type && relationship.type !== 'default') {
        const labelStyle = this.settings.highlightEdgeLabels
          ? new LabelStyle({
              backgroundFill: 'rgba(255, 255, 255, 0.8)',
              backgroundStroke: 'rgba(0, 0, 0, 0.1)'
            })
          : new LabelStyle();
        
        // Add label with style and visibility
        const edgeLabel = this.graph.addLabel(edge, relationship.type);
        // this.graph.setLabelVisibility(edgeLabel, this.settings.showEdgeLabels);
        this.graph.setStyle(edgeLabel, labelStyle);
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
    
    // Get selected nodes - in yFiles 3.0 we filter the selection collection for nodes
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
    // Create renderer for node highlighting
    const renderer = new NodeStyleIndicatorRenderer();
    
    // Configure renderer based on highlight type
    const margins = new Insets(5);
    
    // Configure style based on highlight type
    let highlightStyle: ShapeNodeStyle;
    
    switch (type) {
      case 'path':
        highlightStyle = new ShapeNodeStyle({
          stroke: '3px gold',
          fill: 'transparent'
        });
        renderer.margins = margins;
        renderer.nodeStyle = highlightStyle;
        break;
      case 'direct-impact':
        highlightStyle = new ShapeNodeStyle({
          stroke: '3px crimson',
          fill: 'transparent'
        });
        renderer.margins = margins;
        renderer.nodeStyle = highlightStyle;
        break;
      case 'indirect-impact':
        highlightStyle = new ShapeNodeStyle({
          stroke: '2px orange',
          fill: 'transparent'
        });
        renderer.margins = new Insets(3);
        renderer.nodeStyle = highlightStyle;
        break;
    }
    
    // Add to highlights without passing the renderer as a separate argument
    this.graphComponent.highlights.add(node);
  }
  
  /**
   * Highlight a specific edge
   */
  private highlightEdge(edge: IEdge, type: 'path' | 'impact'): void {
    // Create renderer for edge highlighting
    const renderer = new EdgeStyleIndicatorRenderer();
    
    // Configure style based on highlight type
    const highlightStyle = new PolylineEdgeStyle({
      stroke: type === 'path' ? '3px gold' : '3px crimson'
    });
    
    // Set the style on the renderer
    renderer.edgeStyle = highlightStyle;
    
    // Add edge to highlights without passing the renderer as a separate argument
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
    const viewportAnimation = new ViewportAnimation(this.graphComponent, targetBounds, '0.5s');
    viewportAnimation.animate(0);
  }
  
  /**
   * Get a default color for a node type
   * This is only used when no user-specified color is available
   */
  private getDefaultColorForType(type: string): string {
    // We use a deterministic approach to assign colors based on the type string
    // This ensures the same types always get the same color, but allows full customization
    
    // Simple hash function to generate a consistent color
    let hash = 0;
    for (let i = 0; i < type.length; i++) {
      hash = type.charCodeAt(i) + ((hash << 5) - hash);
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
   * Export the graph as an SVG image
   */
  // async exportAsSVG(): Promise<string> {
  //   // Create an SVG export instance
  //   const exporter = new SvgExport({
  //     worldBounds: this.graphComponent.contentRect,
  //     scale: 1
  //   });
    
  //   try {
  //     // Export entire graph or the visible part
  //     const exportRect = this.graphComponent.contentRect;
      
  //     // Perform the export operation
  //     const svgElement = await exporter.exportSvgAsync(this.graphComponent, exportRect);
      
  //     // Convert the SVG element to a string
  //     const serializer = new XMLSerializer();
  //     return serializer.serializeToString(svgElement);
  //   } catch (error) {
  //     console.error('Error exporting SVG:', error);
  //     throw error;
  //   }
  // }
  
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
      const labelStyle = this.settings.highlightEdgeLabels
        ? new LabelStyle({
            backgroundFill: 'rgba(255, 255, 255, 0.8)',
            backgroundStroke: 'rgba(0, 0, 0, 0.1)'
          })
        : new LabelStyle();
      
      const edgeLabel = this.graph.addLabel(edge, relationship.type);
      // this.graph.setLabelVisibility(edgeLabel, this.settings.showEdgeLabels);
      this.graph.setStyle(edgeLabel, labelStyle);
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
      // In yFiles 3.0, we need to get the first label from the collection
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
      
      // Get color from settings or default
      const entityColor = this.settings.nodeColors[entity.type] || this.getDefaultColorForType(entity.type);
      
      if (isGroup) {
        newStyle = new GroupNodeStyle({
          contentAreaPadding: new Insets(10),
          tabBackgroundFill: new CssFill(entityColor),
          tabFill: new CssFill(entityColor),
          stroke: '2px #667788',
          cornerRadius: 8
        });
      } else {
        newStyle = new ShapeNodeStyle({
          shape: ShapeNodeShape.ELLIPSE, // Always use circle shape
          fill: new CssFill(entityColor),
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

  /**
   * Update viewport after layout changes
   */
  updateViewport(): void {
    // In yFiles 3.0, we simply use fitGraphBounds directly
    this.graphComponent.fitGraphBounds();
  }
}