import os from 'os';
import { execSync } from 'child_process';

export interface SystemHealthMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    cores: number;
    load: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
  processes: {
    active: number;
    nodeProcesses: number;
  };
}

export class SystemHealthMonitor {
  // Get current CPU usage
  static getCPUUsage(): { usage: number; cores: number; load: number[] } {
    const cpus = os.cpus();
    const loadavg = os.loadavg();
    
    // Calculate CPU load percentage (using 1-minute average / number of cores * 100)
    const usage = (loadavg[0] / cpus.length) * 100;
    
    return {
      usage: Math.min(usage, 100), // Cap at 100%
      cores: cpus.length,
      load: loadavg,
    };
  }

  // Get current memory usage
  static getMemoryUsage(): { used: number; total: number; percentage: number } {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    return {
      used: usedMemory,
      total: totalMemory,
      percentage: (usedMemory / totalMemory) * 100,
    };
  }

  // Get disk usage
  static getDiskUsage(): { used: number; total: number; percentage: number } {
    try {
      // This is a simplified approach - in production, you'd want to use a library like 'diskusage'
      const result = execSync('df -B1 / | tail -1').toString().split(/\s+/);
      const total = parseInt(result[1]);
      const used = parseInt(result[2]);
      
      return {
        used,
        total,
        percentage: (used / total) * 100,
      };
    } catch (error) {
      
      return {
        used: 0,
        total: 0,
        percentage: 0,
      };
    }
  }

  // Get system uptime in seconds
  static getUptime(): number {
    return os.uptime();
  }

  // Get process information
  static getProcessInfo(): { active: number; nodeProcesses: number } {
    try {
      const result = execSync('ps aux | wc -l').toString();
      const activeProcesses = parseInt(result.trim()) - 1; // Subtract header
      
      // Count Node.js processes
      const nodeResult = execSync('ps aux | grep -i node | grep -v grep | wc -l').toString();
      const nodeProcesses = parseInt(nodeResult.trim());
      
      return {
        active: activeProcesses,
        nodeProcesses,
      };
    } catch (error) {
      
      return {
        active: 0,
        nodeProcesses: 0,
      };
    }
  }

  // Get overall system health metrics
  static getSystemHealth(): SystemHealthMetrics {
    return {
      timestamp: new Date(),
      cpu: this.getCPUUsage(),
      memory: this.getMemoryUsage(),
      disk: this.getDiskUsage(),
      uptime: this.getUptime(),
      processes: this.getProcessInfo(),
    };
  }

  // Check if system is healthy (thresholds)
  static isHealthy(metrics: SystemHealthMetrics): {
    healthy: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // CPU threshold: 80%
    if (metrics.cpu.usage > 80) {
      issues.push(`High CPU usage: ${metrics.cpu.usage.toFixed(2)}%`);
    }

    // Memory threshold: 85%
    if (metrics.memory.percentage > 85) {
      issues.push(`High memory usage: ${metrics.memory.percentage.toFixed(2)}%`);
    }

    // Disk threshold: 90%
    if (metrics.disk.percentage > 90) {
      issues.push(`Low disk space: ${metrics.disk.percentage.toFixed(2)}% used`);
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  // Format bytes to human readable format
  static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  // Format uptime to readable format
  static formatUptime(uptime: number): string {
    const days = Math.floor(uptime / (24 * 3600));
    const hours = Math.floor((uptime % (24 * 3600)) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
}
