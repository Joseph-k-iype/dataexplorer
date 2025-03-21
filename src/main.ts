import './assets/icons/icons.css'
import './style.css'
import './dialog.css'
import { GraphComponent, GraphViewerInputMode, Command } from '@yfiles/yfiles'
import { enableFolding } from './lib/FoldingSupport'
import loadGraph from './lib/loadGraph'
import './lib/yFilesLicense'
import { initializeGraphOverview } from './graph-overview'
import { initializeTooltips } from './tooltips'
import { exportDiagram } from './diagram-export'
import { ExportFormat } from './lib/ExportSupport'
import { PrintingSupport } from './lib/PrintingSupport'
import { initializeContextMenu } from './context-menu'
import { initializeGraphSearch } from './graph-search'

import './style.css';
import { FileUploadComponent } from './components/file-upload/FileUploadComponent';
import { ConfigurationPanel } from './components/config-panel/ConfigurationPanel';
import { GraphViewer } from './components/graph-viewer/GraphViewer';
import { AnalysisToolsComponent } from './components/analysis-tools/AnalysisToolsComponent';
import { AdvancedImportComponent } from './components/advanced-import/AdvancedImportComponent';
import { GraphSettingsPanel, GraphSettings } from './components/graph-settings/GraphSettingsPanel';
import { GraphBuilderService } from './services/graph-builder/GraphBuilderService';
import { GraphFilterService } from './services/graph-filter/GraphFilterService';
import { RawData, Dataset, MappingConfiguration, ImpactAnalysisResult, PathAnalysisResult } from './models/data-types';

// Application state
let currentRawData: RawData | null = null;
let currentMapping: MappingConfiguration | null = null;
let currentDataset: Dataset | null = null;
let selectedNodes: string[] = [];
let isAdvancedMode: boolean = false;
let filteredDataset: Dataset | null = null;

// Initialize services
const graphBuilder = new GraphBuilderService();
const graphFilter = new GraphFilterService();

// Initialize components
const fileUploadComponent = new FileUploadComponent(
  document.getElementById('file-upload-container') as HTMLElement
);

const configPanel = new ConfigurationPanel(
  document.getElementById('config-panel-container') as HTMLElement
);

const advancedImport = new AdvancedImportComponent(
  document.getElementById('file-upload-container') as HTMLElement
);

const graphViewer = new GraphViewer(
  document.getElementById('graph-component-container') as HTMLElement
);

const analysisTools = new AnalysisToolsComponent(
  document.getElementById('analysis-tools-container') as HTMLElement
);

const graphSettingsPanel = new GraphSettingsPanel(
  document.getElementById('settings-panel-container') as HTMLElement
);

// Initially hide advanced import
advancedImport.onDatasetLoaded((dataset: Dataset) => {
  currentDataset = dataset;
  filteredDataset = dataset;
  
  // Update settings panel with new dataset
  graphSettingsPanel.setDataset(dataset);
  
  // Load dataset into graph viewer
  graphViewer.loadDataset(dataset).then(() => {
    // Make sure graph is fitted to view after loading
    setTimeout(() => {
      graphViewer.fitGraph();
    }, 100);
  });
  
  // Update analysis tools with new dataset
  analysisTools.setDataset(dataset);
  
  // Reset selection
  selectedNodes = [];
  analysisTools.setSelectedNodes([]);
});

// Handle filter changes in advanced mode
advancedImport.onFilterChange((sourceIds: string[], targetIds: string[]) => {
  if (!currentDataset) return;
  
  if (sourceIds.length === 0) {
    // If no source nodes selected, show the full dataset
    filteredDataset = currentDataset;
  } else {
    // Apply filters
    filteredDataset = graphFilter.filterDataset(currentDataset, sourceIds, targetIds, 10);
  }
  
  // Update settings panel with filtered dataset
  graphSettingsPanel.setDataset(filteredDataset);
  
  // Load filtered dataset into graph viewer
  graphViewer.loadDataset(filteredDataset).then(() => {
    // Make sure graph is fitted to view after loading
    setTimeout(() => {
      graphViewer.fitGraph();
    }, 100);
  });
  
  // Update analysis tools with filtered dataset
  analysisTools.setDataset(filteredDataset);
});

// Register event handlers

// File upload events
fileUploadComponent.onDataLoaded((data: RawData) => {
  currentRawData = data;
  
  // Update configuration panel with new data
  configPanel.setData(data);
  
  // Reset dataset and graph
  currentDataset = null;
  graphViewer.clear();
});

// Configuration events
configPanel.onConfigChange((config: MappingConfiguration) => {
  currentMapping = config;
  
  if (currentRawData && currentMapping) {
    // Build dataset from raw data and mapping
    currentDataset = graphBuilder.buildDataset(currentRawData, currentMapping);
    
    // Update settings panel with new dataset
    graphSettingsPanel.setDataset(currentDataset);
    
    // Load dataset into graph viewer
    graphViewer.loadDataset(currentDataset).then(() => {
      // Make sure graph is fitted to view after loading
      setTimeout(() => {
        graphViewer.fitGraph();
      }, 100);
    });
    
    // Update analysis tools with new dataset
    analysisTools.setDataset(currentDataset);
    
    // Reset selection
    selectedNodes = [];
    analysisTools.setSelectedNodes([]);
  }
});

// Graph viewer events
graphViewer.onNodeSelection((nodeIds: string[]) => {
  selectedNodes = nodeIds;
  analysisTools.setSelectedNodes(nodeIds);
});

// Graph settings events
graphSettingsPanel.onSettingsChange((settings: GraphSettings) => {
  if (currentDataset) {
    // Update dataset in settings panel in case it was reset
    graphSettingsPanel.setDataset(currentDataset);
    
    // Apply settings to graph viewer
    graphViewer.updateSettings(settings);
  }
});

// Analysis tools events
analysisTools.onPathAnalysis((result: PathAnalysisResult): void => {
  // Provide default metrics if missing in result
  const completeResult: PathAnalysisResult = {
    ...result,
    metrics: {
      totalPaths: result.paths.length,
      shortestPathLength: result.metrics?.shortestPathLength || 0,
      longestPathLength: result.metrics?.longestPathLength || 0
    }
  };
  graphViewer.highlightPaths(completeResult);
});

analysisTools.onImpactAnalysis((result: ImpactAnalysisResult): void => {
  graphViewer.highlightImpact(result);
});

// Add layout button handlers
document.getElementById('btn-layout-hierarchical')?.addEventListener('click', () => {
  graphViewer.applyLayout('hierarchical').then(() => {
    // After applying layout, fit the graph
    setTimeout(() => graphViewer.fitGraph(), 100);
  });
});

document.getElementById('btn-layout-organic')?.addEventListener('click', () => {
  graphViewer.applyLayout('organic').then(() => {
    // After applying layout, fit the graph
    setTimeout(() => graphViewer.fitGraph(), 100);
  });
});

document.getElementById('btn-layout-radial')?.addEventListener('click', () => {
  graphViewer.applyLayout('radial').then(() => {
    // After applying layout, fit the graph
    setTimeout(() => graphViewer.fitGraph(), 100);
  });
});

// Export button handlers
// document.getElementById('btn-export-svg')?.addEventListener('click', async () => {
//   try {
//     const svgContent = await graphViewer.exportAsSVG();
    
//     // Create a Blob from the SVG content
//     const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    
//     // Create a download link
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = 'graph-export.svg';
    
//     // Trigger download
//     document.body.appendChild(a);
//     a.click();
    
//     // Clean up
//     setTimeout(() => {
//       document.body.removeChild(a);
//       URL.revokeObjectURL(url);
//     }, 100);
//   } catch (error) {
//     console.error('Error exporting SVG:', error);
//     alert('Failed to export as SVG');
//   }
// });

document.getElementById('btn-export-png')?.addEventListener('click', () => {
  // Export PNG functionality - This is a placeholder
  alert('Export to PNG functionality will be implemented');
});

// Reset button handler
document.getElementById('btn-reset')?.addEventListener('click', () => {
  if (confirm('Reset the graph? This will clear all current configurations.')) {
    // Reset application state
    currentRawData = null;
    currentMapping = null;
    currentDataset = null;
    filteredDataset = null;
    selectedNodes = [];
    
    // Reset UI components
    graphViewer.clear();
    configPanel.setData({ columns: [], rows: [] });
    graphSettingsPanel.setDataset({ entities: [], relationships: [] });
    analysisTools.setDataset({ entities: [], relationships: [] });
    analysisTools.setSelectedNodes([]);
    
    // Reload page to reset file upload
    location.reload();
  }
});

// Mode toggle handlers
document.getElementById('btn-standard-mode')?.addEventListener('click', () => {
  if (isAdvancedMode) {
    isAdvancedMode = false;
    toggleModeUI(false);
  }
});

document.getElementById('btn-advanced-mode')?.addEventListener('click', () => {
  if (!isAdvancedMode) {
    isAdvancedMode = true;
    toggleModeUI(true);
  }
});

/**
 * Toggle between standard and advanced modes
 */
function toggleModeUI(advanced: boolean): void {
  // Update mode button states
  const standardBtn = document.getElementById('btn-standard-mode');
  const advancedBtn = document.getElementById('btn-advanced-mode');
  
  if (standardBtn && advancedBtn) {
    if (advanced) {
      standardBtn.classList.remove('active');
      advancedBtn.classList.add('active');
    } else {
      standardBtn.classList.add('active');
      advancedBtn.classList.remove('active');
    }
  }
  
  // Reset graph
  graphViewer.clear();
  
  // Toggle visibility of components
  const fileUploadContainer = document.getElementById('file-upload-container');
  const configPanelContainer = document.getElementById('config-panel-container');
  
  if (fileUploadContainer && configPanelContainer) {
    if (advanced) {
      // Hide standard components
      fileUploadContainer.innerHTML = '';
      fileUploadContainer.appendChild(advancedImport.getElement());
      configPanelContainer.style.display = 'none';
    } else {
      // Show standard components
      fileUploadContainer.innerHTML = '';
      fileUploadContainer.appendChild(fileUploadComponent.getElement());
      configPanelContainer.style.display = 'block';
    }
  }
  
  // Reset data
  currentRawData = null;
  currentMapping = null;
  currentDataset = null;
  filteredDataset = null;
  selectedNodes = [];
  
  // Reset settings panel
  graphSettingsPanel.setDataset({ entities: [], relationships: [] });
  
  // Reset analysis tools
  analysisTools.setDataset({ entities: [], relationships: [] });
  analysisTools.setSelectedNodes([]);
}

// Handle window resize to ensure graph component sizes correctly
window.addEventListener('resize', () => {
  // Allow the DOM to update
  setTimeout(() => {
    if (graphViewer) {
      graphViewer.fitGraph();
    }
  }, 100);
});

// Initialize GraphViewer with additional event handlers
function initializeGraphViewer() {
  // Set up any specific initialization 
  
  // Add a mutation observer to detect changes to the graph container
  const graphContainer = document.getElementById('graph-component-container');
  if (graphContainer) {
    const observer = new ResizeObserver(() => {
      // When container size changes, update the graph
      if (graphViewer) {
        setTimeout(() => {
          graphViewer.fitGraph();
        }, 100);
      }
    });
    
    // Start observing the container
    observer.observe(graphContainer);
  }
  
  console.log('Graph viewer initialized');
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  console.log('Data Network Visualizer initialized');
  initializeGraphViewer();
  
  // Ensure the graph fits the view on initial load
  setTimeout(() => {
    if (graphViewer) {
      graphViewer.fitGraph();
    }
  }, 500);
});

// Extend GraphViewer interface to include updateViewport method via module augmentation
declare module './components/graph-viewer/GraphViewer' {
  interface GraphViewer {
    updateViewport(): void;
  }
}

// Add updateViewport method to GraphViewer prototype if needed
if (!GraphViewer.prototype.hasOwnProperty('updateViewport')) {
  GraphViewer.prototype.updateViewport = function() {
    const graphComponent = (this as any).graphComponent;
    if (graphComponent) {
      graphComponent.updateContentRect();
      graphComponent.fitGraphBounds();
    }
  };
}