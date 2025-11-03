/**
 * Report Metric Configuration Service
 * Manages custom formulas and settings for report metrics
 */

import { storage } from '../legacy-stub';
import { ReportMetricConfig, DEFAULT_METRIC_CONFIGS } from '../../../configs/report-metric-defaults';

export class ReportMetricConfigService {
  /**
   * Get all metric configurations
   * Phase 39+: Uses default configs directly (legacy storage replaced)
   */
  async getAllConfigs(): Promise<ReportMetricConfig[]> {
    return Object.values(DEFAULT_METRIC_CONFIGS);
  }

  /**
   * Get specific metric configuration
   * Phase 39+: Uses default configs directly (legacy storage replaced)
   */
  async getConfig(metricId: string): Promise<ReportMetricConfig | null> {
    return DEFAULT_METRIC_CONFIGS[metricId] || null;
  }

  /**
   * Update metric configuration
   * Phase 39+: Not yet implemented (TODO: Use Supabase for custom configs)
   */
  async updateConfig(
    metricId: string,
    updates: Partial<ReportMetricConfig>
  ): Promise<ReportMetricConfig> {
    console.warn('[ReportMetricConfigService] updateConfig not yet implemented in Phase 39+');
    const config = DEFAULT_METRIC_CONFIGS[metricId];
    if (!config) {
      throw new Error(`Metric config not found: ${metricId}`);
    }
    // TODO: Save custom configs to Supabase
    return { ...config, ...updates };
  }

  /**
   * Reset metric configuration to default
   * Phase 39+: Returns default config directly
   */
  async resetConfig(metricId: string): Promise<ReportMetricConfig> {
    const config = DEFAULT_METRIC_CONFIGS[metricId];
    if (!config) {
      throw new Error(`Metric config not found: ${metricId}`);
    }
    return config;
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
