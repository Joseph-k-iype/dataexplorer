/**
 * Utility helper functions
 */

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  
  /**
   * Format file size to human-readable string
   */
  export function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} bytes`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
  }
  
  /**
   * Debounce function to limit the rate at which a function can fire
   */
  export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    
    return function(this: any, ...args: Parameters<T>): void {
      const later = () => {
        timeout = null;
        func.apply(this, args);
      };
      
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(later, wait);
    };
  }
  
  /**
   * Deep clone an object
   */
  export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
  
  /**
   * Convert RGB color to HSL
   */
  export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      
      h /= 6;
    }
    
    return [h * 360, s * 100, l * 100];
  }
  
  /**
   * Convert any color string to RGBA
   */
  export function parseColor(color: string): { r: number, g: number, b: number, a: number } {
    // Create a temporary element to compute the color
    const temp = document.createElement('div');
    temp.style.color = color;
    document.body.appendChild(temp);
    
    // Get computed color
    const style = window.getComputedStyle(temp);
    const computedColor = style.color;
    
    document.body.removeChild(temp);
    
    // Parse the computed color
    const match = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: match[4] ? parseFloat(match[4]) : 1
      };
    }
    
    // Default fallback
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  
  /**
   * Generate a random pastel color
   */
  export function generatePastelColor(): string {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 80%)`;
  }
  
  /**
   * Truncate text with ellipsis
   */
  export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength) + '...';
  }
  
  /**
   * Convert camelCase to Title Case
   */
  export function camelCaseToTitleCase(text: string): string {
    const result = text.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  }
  
  /**
   * Get file extension from filename
   */
  export function getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }
  
  /**
   * Check if a string is a valid JSON
   */
  export function isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Create a throttled function that only invokes func at most once per every wait milliseconds
   */
  export function throttle<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return function(this: any, ...args: Parameters<T>): void {
      const now = Date.now();
      
      if (now - lastCall >= wait) {
        func.apply(this, args);
        lastCall = now;
      }
    };
  }