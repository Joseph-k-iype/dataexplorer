/**
 * Graph Filter Service
 * Provides functionality for filtering graph data based on source and target nodes
 */
import { Dataset, DataEntity, Relationship } from '../../models/data-types';
import { AnalysisService } from '../analysis/AnalysisService';

export class GraphFilterService {
  private analysisService: AnalysisService;
  
  constructor() {
    this.analysisService = new AnalysisService();
  }
  
  /**
   * Filter a dataset based on source and target nodes
   */
  filterDataset(
    dataset: Dataset, 
    sourceIds: string[], 
    targetIds: string[] = [],
    maxDepth: number = 5
  ): Dataset {
    // If no filters provided, return the original dataset
    if (sourceIds.length === 0 && targetIds.length === 0) {
      return dataset;
    }
    
    // Step 1: If we have both source and target nodes, find all paths between them
    if (sourceIds.length > 0 && targetIds.length > 0) {
      const pathResult = this.analysisService.findPaths(dataset, sourceIds, targetIds, maxDepth);
      
      // Only include nodes and edges that are part of the paths
      const nodeIdsInPaths = new Set<string>();
      const edgeIdsInPaths = new Set<string>();
      
      for (const path of pathResult.paths) {
        path.nodes.forEach(nodeId => nodeIdsInPaths.add(nodeId));
        path.edges.forEach(edgeId => edgeIdsInPaths.add(edgeId));
      }
      
      // Filter entities and relationships
      const filteredEntities = dataset.entities.filter(entity => nodeIdsInPaths.has(entity.id));
      const filteredRelationships = dataset.relationships.filter(rel => edgeIdsInPaths.has(rel.id));
      
      return {
        entities: filteredEntities,
        relationships: filteredRelationships
      };
    }
    
    // Step 2: If we only have source nodes, use impact analysis
    if (sourceIds.length > 0) {
      const impactResult = this.analysisService.analyzeImpact(dataset, sourceIds, maxDepth);
      
      // Combine direct and indirect impact nodes
      const impactedNodeIds = new Set<string>([
        ...sourceIds,
        ...impactResult.directImpact,
        ...impactResult.indirectImpact
      ]);
      
      // Filter entities to include only source and impacted nodes
      const filteredEntities = dataset.entities.filter(entity => 
        impactedNodeIds.has(entity.id)
      );
      
      // Filter relationships to include only those between filtered entities
      const filteredRelationships = dataset.relationships.filter(rel => 
        impactedNodeIds.has(rel.source) && impactedNodeIds.has(rel.target)
      );
      
      return {
        entities: filteredEntities,
        relationships: filteredRelationships
      };
    }
    
    // If we get here, return the original dataset (shouldn't happen based on checks)
    return dataset;
  }
  
  /**
   * Filter dataset by node types (useful for filtering by target class)
   */
  filterByNodeTypes(
    dataset: Dataset,
    sourceIds: string[],
    targetTypes: string[] = [],
    maxDepth: number = 5
  ): Dataset {
    // If no source nodes or target types, return the original dataset
    if (sourceIds.length === 0 || targetTypes.length === 0) {
      return dataset;
    }
    
    // Find target node IDs of the specified types
    const targetIds = dataset.entities
      .filter(entity => targetTypes.includes(entity.type))
      .map(entity => entity.id);
    
    // Use the regular filter with the found target IDs
    return this.filterDataset(dataset, sourceIds, targetIds, maxDepth);
  }
  
  /**
   * Extract the subgraph reachable from source nodes up to a certain depth
   */
  extractReachableSubgraph(
    dataset: Dataset,
    sourceIds: string[],
    maxDepth: number = 5
  ): Dataset {
    if (sourceIds.length === 0) {
      return dataset;
    }
    
    // Build an adjacency map for faster graph traversal
    const adjacencyMap = this.buildAdjacencyMap(dataset);
    
    // Perform BFS to find all reachable nodes
    const reachableNodes = new Set<string>(sourceIds);
    const queue: Array<{nodeId: string, depth: number}> = sourceIds.map(id => ({nodeId: id, depth: 0}));
    
    while (queue.length > 0) {
      const {nodeId, depth} = queue.shift()!;
      
      // Stop if we've reached the maximum depth
      if (depth >= maxDepth) {
        continue;
      }
      
      // Get outgoing edges
      const outgoingEdges = adjacencyMap[nodeId]?.outgoing || [];
      
      // Add neighbors to the queue if not already visited
      for (const edge of outgoingEdges) {
        if (!reachableNodes.has(edge.target)) {
          reachableNodes.add(edge.target);
          queue.push({nodeId: edge.target, depth: depth + 1});
        }
      }
    }
    
    // Filter entities and relationships
    const filteredEntities = dataset.entities.filter(entity => reachableNodes.has(entity.id));
    const filteredRelationships = dataset.relationships.filter(rel => 
      reachableNodes.has(rel.source) && reachableNodes.has(rel.target)
    );
    
    return {
      entities: filteredEntities,
      relationships: filteredRelationships
    };
  }
  
  /**
   * Build an adjacency map from the dataset for faster graph traversal
   */
  private buildAdjacencyMap(dataset: Dataset): Record<string, {
    outgoing: Array<{target: string, edgeId: string}>,
    incoming: Array<{source: string, edgeId: string}>
  }> {
    const adjacencyMap: Record<string, {
      outgoing: Array<{target: string, edgeId: string}>,
      incoming: Array<{source: string, edgeId: string}>
    }> = {};
    
    // Initialize map for all entities
    for (const entity of dataset.entities) {
      adjacencyMap[entity.id] = {
        outgoing: [],
        incoming: []
      };
    }
    
    // Add relationships to the map
    for (const relationship of dataset.relationships) {
      const sourceId = relationship.source;
      const targetId = relationship.target;
      
      // Skip invalid relationships
      if (!sourceId || !targetId) {
        continue;
      }
      
      // Add outgoing edge to source node
      if (adjacencyMap[sourceId]) {
        adjacencyMap[sourceId].outgoing.push({
          target: targetId,
          edgeId: relationship.id
        });
      }
      
      // Add incoming edge to target node
      if (adjacencyMap[targetId]) {
        adjacencyMap[targetId].incoming.push({
          source: sourceId,
          edgeId: relationship.id
        });
      }
    }
    
    return adjacencyMap;
  }
}