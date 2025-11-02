/**
 * Report Metric Configuration Service
 * Manages custom formulas and settings for report metrics
 */

import { storage } from '../legacy/storage';
import { ReportMetricConfig, DEFAULT_METRIC_CONFIGS } from '../../../configs/report-metric-defaults';

export class ReportMetricConfigService {
  /**
   * Get all metric configurations
   */
  async getAllConfigs(): Promise<ReportMetricConfig[]> {
    return storage.getReportMetricConfigs();
  }

  /**
   * Get specific metric configuration
   */
  async getConfig(metricId: string): Promise<ReportMetricConfig | null> {
    return storage.getReportMetricConfig(metricId);
  }

  /**
   * Update metric configuration
   */
  async updateConfig(
    metricId: string,
    updates: Partial<ReportMetricConfig>
  ): Promise<ReportMetricConfig> {
    return storage.updateReportMetricConfig(metricId, updates);
  }

  /**
   * Reset metric configuration to default
   */
  async resetConfig(metricId: string): Promise<ReportMetricConfig> {
    return storage.resetReportMetricConfig(metricId);
  }

  /**
   * Get the active formula for a metric (manual if set, otherwise default)
   */
  async getActiveFormula(metricId: string): Promise<string | null> {
    const config = await this.getConfig(metricId);
    if (!config) return null;

    // Return manual formula if set, otherwise default
    return config.manualFormula || config.defaultFormula;
  }

  /**
   * Check if metric has custom formula
   */
  async hasCustomFormula(metricId: string): Promise<boolean> {
    const config = await this.getConfig(metricId);
    return !!(config?.manualFormula);
  }

  /**
   * Get all metrics with custom formulas
   */
  async getCustomizedMetrics(): Promise<ReportMetricConfig[]> {
    const allConfigs = await this.getAllConfigs();
    return allConfigs.filter(config => !!config.manualFormula);
  }
}

export const reportMetricConfigService = new ReportMetricConfigService();
