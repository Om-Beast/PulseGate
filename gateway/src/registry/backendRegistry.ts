import { ServiceInstance } from '../types';
import { SERVICES_CONFIG, InstanceConfig } from '../config/services';
import { logger } from '../logging/logger';

/**
 * BackendRegistry maintains the live state of all known backend instances.
 *
 * Responsibilities:
 * - Seed instances from static configuration on startup
 * - Track health state (healthy/unhealthy) for each instance
 * - Track failure and recovery counts for observability
 * - Provide filtered views for the load balancer
 */
export class BackendRegistry {
  private instances: Map<string, ServiceInstance> = new Map();

  constructor(config: Record<string, InstanceConfig[]>) {
    for (const [service, instanceConfigs] of Object.entries(config)) {
      for (const cfg of instanceConfigs) {
        const instance: ServiceInstance = {
          id: cfg.id,
          service,
          host: cfg.host,
          port: cfg.port,
          healthy: true, // All start as healthy; health checker will correct this
          lastChecked: new Date(),
          failureCount: 0,
          recoveryCount: 0,
        };
        this.instances.set(cfg.id, instance);
      }
    }

    logger.info('BackendRegistry initialized', {
      services: Object.keys(config),
      totalInstances: this.instances.size,
    });
  }

  /**
   * Get all instances for a service (healthy and unhealthy).
   */
  getInstances(service: string): ServiceInstance[] {
    return Array.from(this.instances.values()).filter((i) => i.service === service);
  }

  /**
   * Get only healthy instances for a service.
   * These are the only ones eligible to receive traffic.
   */
  getHealthyInstances(service: string): ServiceInstance[] {
    return this.getInstances(service).filter((i) => i.healthy);
  }

  /**
   * Get all instances across all services (for admin API and health checker).
   */
  getAllInstances(): ServiceInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Mark an instance as healthy.
   * Increments recovery count and resets failure count.
   */
  markHealthy(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    const wasUnhealthy = !instance.healthy;
    instance.healthy = true;
    instance.lastChecked = new Date();
    instance.recoveryCount++;
    instance.failureCount = 0;

    if (wasUnhealthy) {
      logger.info('Instance recovered', {
        instanceId,
        service: instance.service,
        recoveryCount: instance.recoveryCount,
      });
    }
  }

  /**
   * Mark an instance as unhealthy.
   * Increments failure count. Instance will not receive traffic.
   */
  markUnhealthy(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    const wasHealthy = instance.healthy;
    instance.healthy = false;
    instance.lastChecked = new Date();
    instance.failureCount++;

    if (wasHealthy) {
      logger.warn('Instance marked unhealthy', {
        instanceId,
        service: instance.service,
        failureCount: instance.failureCount,
      });
    }
  }

  /**
   * Update the last-checked timestamp without changing health state.
   */
  touchInstance(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.lastChecked = new Date();
    }
  }
}

// Singleton — shared across the entire gateway process
export const backendRegistry = new BackendRegistry(SERVICES_CONFIG);
