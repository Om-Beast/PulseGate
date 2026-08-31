import * as http from 'http';
import { BackendRegistry, backendRegistry as defaultRegistry } from '../registry/backendRegistry';
import { ServiceInstance } from '../types';
import { config } from '../config/settings';
import { logger } from '../logging/logger';

/**
 * HealthChecker actively polls all backend instances on a fixed interval.
 *
 * State machine per instance:
 *   HEALTHY -> (3 consecutive failures) -> UNHEALTHY
 *   UNHEALTHY -> (2 consecutive successes) -> HEALTHY
 *
 * The hysteresis (failure/success thresholds) prevents flapping:
 * a briefly slow backend won't be removed and re-added rapidly.
 *
 * Unhealthy instances receive NO traffic from the load balancer.
 */
export class HealthChecker {
  private registry: BackendRegistry;
  private interval: ReturnType<typeof setInterval> | null = null;

  // Track consecutive failures and successes per instance
  private failureStreak: Map<string, number> = new Map();
  private successStreak: Map<string, number> = new Map();

  private readonly FAILURE_THRESHOLD = 3;
  private readonly RECOVERY_THRESHOLD = 2;
  private readonly HEALTH_CHECK_TIMEOUT_MS = 3000;

  constructor(registry: BackendRegistry) {
    this.registry = registry;
  }

  start(): void {
    if (this.interval) return; // Already running

    const intervalMs = config.gateway.healthCheckInterval;

    logger.info('HealthChecker starting', { intervalMs });

    // Run immediately, then on interval
    void this.checkAll();
    this.interval = setInterval(() => void this.checkAll(), intervalMs);

    // Don't block process exit
    if (this.interval.unref) {
      this.interval.unref();
    }
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('HealthChecker stopped');
    }
  }

  private async checkAll(): Promise<void> {
    const instances = this.registry.getAllInstances();
    await Promise.allSettled(instances.map((instance) => this.checkInstance(instance)));
  }

  private checkInstance(instance: ServiceInstance): Promise<void> {
    return new Promise((resolve) => {
      const url = `http://${instance.host}:${instance.port}/health`;

      const req = http.get(
        url,
        { timeout: this.HEALTH_CHECK_TIMEOUT_MS },
        (res) => {
          // Consume response body to free socket
          res.resume();

          if (res.statusCode === 200) {
            this.recordSuccess(instance);
          } else {
            this.recordFailure(instance, `HTTP ${res.statusCode}`);
          }
          resolve();
        },
      );

      req.on('error', (err) => {
        this.recordFailure(instance, err.message);
        resolve();
      });

      req.on('timeout', () => {
        req.destroy();
        this.recordFailure(instance, 'timeout');
        resolve();
      });
    });
  }

  private recordSuccess(instance: ServiceInstance): void {
    const streak = (this.successStreak.get(instance.id) ?? 0) + 1;
    this.successStreak.set(instance.id, streak);
    this.failureStreak.set(instance.id, 0);

    this.registry.touchInstance(instance.id);

    if (!instance.healthy && streak >= this.RECOVERY_THRESHOLD) {
      this.registry.markHealthy(instance.id);
      this.successStreak.set(instance.id, 0);
    }
  }

  private recordFailure(instance: ServiceInstance, reason: string): void {
    const streak = (this.failureStreak.get(instance.id) ?? 0) + 1;
    this.failureStreak.set(instance.id, streak);
    this.successStreak.set(instance.id, 0);

    this.registry.touchInstance(instance.id);

    if (instance.healthy && streak >= this.FAILURE_THRESHOLD) {
      this.registry.markUnhealthy(instance.id);
      this.failureStreak.set(instance.id, 0);
      logger.warn('Instance health check failed repeatedly', {
        instanceId: instance.id,
        service: instance.service,
        reason,
        failureStreak: streak,
      });
    } else if (!instance.healthy) {
      logger.debug('Instance still unhealthy', {
        instanceId: instance.id,
        reason,
        successStreak: this.successStreak.get(instance.id) ?? 0,
      });
    }
  }
}

// Singleton
export const healthChecker = new HealthChecker(defaultRegistry);
