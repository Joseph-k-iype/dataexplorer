/**
 * Analysis Service
 * Provides algorithms for path finding and impact analysis
 */
import { Dataset, PathAnalysisResult, ImpactAnalysisResult } from '../../models/data-types';

export class AnalysisService {
  /**
   * Find all paths between source and target nodes - improved version
   * @param dataset The dataset to analyze
   * @param sourceIds Source node IDs
   * @param targetIds Target node IDs
   * @param maxLength Maximum path length (to prevent infinite loops)
   */
  findPaths(
    dataset: Dataset, 
    sourceIds: string[], 
    targetIds: string[], 
    maxLength: number = 10
  ): PathAnalysisResult {
    console.log("Starting path analysis from", sourceIds, "to", targetIds);
    
    const paths: Array<{nodes: string[], edges: string[], metadata: Record<string, any>}> = [];
    
    // Build an adjacency map for faster lookups
    const adjacencyMap = this.buildAdjacencyMap(dataset);
    
    // For each source node, find paths to all target nodes
    for (const sourceId of sourceIds) {
      for (const targetId of targetIds) {
        // Skip if source and target are the same
        if (sourceId === targetId) {
          console.log("Skipping identical source and target:", sourceId);
          continue;
        }
        
        // Verify both nodes exist in the adjacency map
        if (!adjacencyMap[sourceId]) {
          console.error(`Source node ${sourceId} not found in the graph`);
          continue;
        }
        
        if (!adjacencyMap[targetId]) {
          console.error(`Target node ${targetId} not found in the graph`);
          continue;
        }
        
        console.log(`Finding paths from ${sourceId} to ${targetId}`);
        
        // Find all paths using DFS
        this.findAllPaths(
          adjacencyMap,
          sourceId,
          targetId,
          [sourceId],   // Start with just the source node in the path
          [],           // No edges yet
          new Set<string>([sourceId]),  // Mark source as visited
          paths,
          maxLength
        );
        
        console.log(`Found ${paths.length} paths from ${sourceId} to ${targetId}`);
      }
    }
    
    // Calculate metrics
    const pathLengths = paths.map(path => path.nodes.length);
    const metrics = {
      totalPaths: paths.length,
      shortestPathLength: paths.length ? Math.min(...pathLengths) : 0,
      longestPathLength: paths.length ? Math.max(...pathLengths) : 0
    };
    
    return { paths, metrics };
  }
  
  /**
   * Perform impact analysis from a set of source nodes
   * @param dataset The dataset to analyze
   * @param sourceIds Source node IDs to analyze impact from
   * @param maxDepth Maximum depth for impact analysis
   */
  analyzeImpact(
    dataset: Dataset, 
    sourceIds: string[], 
    maxDepth: number = 5
  ): ImpactAnalysisResult {
    const directImpact: string[] = [];
    const indirectImpact: string[] = [];
    const visited = new Set<string>();
    const criticalPaths: string[][] = [];
    
    // Add source nodes to visited
    for (const sourceId of sourceIds) {
      visited.add(sourceId);
    }
    
    // Build an adjacency map for faster lookups
    const adjacencyMap = this.buildAdjacencyMap(dataset);
    
    // Process each source node
    for (const sourceId of sourceIds) {
      // Verify node exists
      if (!adjacencyMap[sourceId]) {
        console.error(`Source node ${sourceId} not found in the graph`);
        continue;
      }
      
      // Find direct impacts (immediate neighbors)
      const directNeighbors = adjacencyMap[sourceId]?.outgoing || [];
      for (const neighbor of directNeighbors) {
        if (!visited.has(neighbor.target)) {
          directImpact.push(neighbor.target);
          visited.add(neighbor.target);
        }
      }
      
      // Find indirect impacts using BFS
      this.findIndirectImpacts(
        adjacencyMap,
        directNeighbors.map(n => n.target),
        indirectImpact,
        visited,
        criticalPaths,
        1,
        maxDepth,
        [sourceId]
      );
    }
    
    // Calculate metrics
    const metrics = {
      totalImpactedNodes: directImpact.length + indirectImpact.length,
      maxDepth: criticalPaths.length > 0 ? Math.max(...criticalPaths.map(path => path.length - 1)) : 0,
      criticalPaths: criticalPaths.length
    };
    
    return { directImpact, indirectImpact, metrics };
  }
  
  /**
   * Build an adjacency map from the dataset for faster graph traversal - improved version
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
        console.warn("Skipping invalid relationship:", relationship);
        continue;
      }
      
      // Add outgoing edge to source node
      if (adjacencyMap[sourceId]) {
        adjacencyMap[sourceId].outgoing.push({
          target: targetId,
          edgeId: relationship.id
        });
      } else {
        console.warn(`Source node ${sourceId} not found for relationship ${relationship.id}`);
      }
      
      // Add incoming edge to target node
      if (adjacencyMap[targetId]) {
        adjacencyMap[targetId].incoming.push({
          source: sourceId,
          edgeId: relationship.id
        });
      } else {
        console.warn(`Target node ${targetId} not found for relationship ${relationship.id}`);
      }
    }
    
    return adjacencyMap;
  }
  
  /**
   * Recursive DFS to find all paths between source and target - improved version
   */
  private findAllPaths(
    adjacencyMap: Record<string, any>,
    currentNode: string,
    targetNode: string,
    currentPath: string[],
    currentEdges: string[],
    visited: Set<string>,
    allPaths: Array<{nodes: string[], edges: string[], metadata: Record<string, any>}>,
    maxLength: number
  ): void {
    // Base case 1: We've found the target
    if (currentNode === targetNode) {
      // Add this path to the results
      allPaths.push({
        nodes: [...currentPath],
        edges: [...currentEdges],
        metadata: {
          length: currentPath.length,
          hops: currentPath.length - 1
        }
      });
      return;
    }
    
    // Base case 2: We've reached the maximum path length
    if (currentPath.length >= maxLength) {
      return;
    }
    
    // Get all outgoing connections from current node
    const outgoingEdges = adjacencyMap[currentNode]?.outgoing || [];
    
    // Try each connection
    for (const edge of outgoingEdges) {
      const nextNode = edge.target;
      
      // Skip if we've already visited this node in the current path
      if (visited.has(nextNode)) {
        continue;
      }
      
      // Add the next node to our path
      currentPath.push(nextNode);
      currentEdges.push(edge.edgeId);
      visited.add(nextNode);
      
      // Recursively find paths from this new node
      this.findAllPaths(
        adjacencyMap,
        nextNode,
        targetNode,
        currentPath,
        currentEdges,
        visited,
        allPaths,
        maxLength
      );
      
      // Backtrack: remove the node from our path for the next iteration
      currentPath.pop();
      currentEdges.pop();
      visited.delete(nextNode);
    }
  }
  
  /**
   * BFS to find indirect impacts
   */
  private findIndirectImpacts(
    adjacencyMap: Record<string, any>,
    currentLayer: string[],
    indirectImpact: string[],
    visited: Set<string>,
    criticalPaths: string[][],
    currentDepth: number,
    maxDepth: number,
    currentPath: string[]
  ) {
    // Base case: Max depth reached
    if (currentDepth >= maxDepth) {
      return;
    }
    
    const nextLayer: string[] = [];
    
    // Process each node in the current layer
    for (const nodeId of currentLayer) {
      // Skip if node doesn't exist in adjacency map
      if (!adjacencyMap[nodeId]) {
        console.warn(`Node ${nodeId} not found in adjacency map during impact analysis`);
        continue;
      }
      
      const outgoingEdges = adjacencyMap[nodeId]?.outgoing || [];
      
      // Special case: If a node has many outgoing connections, it's a critical node
      if (outgoingEdges.length > 5) {
        criticalPaths.push([...currentPath, nodeId]);
      }
      
      // Add all unvisited neighbors to the next layer
      for (const edge of outgoingEdges) {
        const neighbor = edge.target;
        
        if (!visited.has(neighbor)) {
          // Add to indirect impact
          indirectImpact.push(neighbor);
          visited.add(neighbor);
          nextLayer.push(neighbor);
        }
      }
    }
    
    // Continue BFS with the next layer if not empty
    if (nextLayer.length > 0) {
      this.findIndirectImpacts(
        adjacencyMap,
        nextLayer,
        indirectImpact,
        visited,
        criticalPaths,
        currentDepth + 1,
        maxDepth,
        [...currentPath, ...currentLayer]
      );
    }
  }
}