import { ServiceInstance } from '../types';
import { ILoadBalancer } from './ILoadBalancer';

/**
 * RoundRobinLoadBalancer distributes requests evenly across healthy instances.
 *
 * Algorithm:
 * - Maintain an independent counter per service
 * - On each call: filter healthy instances, pick (counter % count), increment counter
 * - Counter wraps naturally via modulo — no explicit reset needed
 *
 * Why Round Robin?
 * - Simple and predictable
 * - Even distribution when backends have similar capacity
 * - No need for runtime metrics collection (unlike Least Connections)
 * - Easy to explain and debug: repeated requests visibly cycle through instances
 *
 * Example with 3 user-service instances:
 *   Request 1 -> user-service-1
 *   Request 2 -> user-service-2
 *   Request 3 -> user-service-3
 *   Request 4 -> user-service-1
 */
export class RoundRobinLoadBalancer implements ILoadBalancer {
  private counters: Map<string, number> = new Map();

  selectInstance(service: string, instances: ServiceInstance[]): ServiceInstance | null {
    const healthy = instances.filter((i) => i.healthy);

    if (healthy.length === 0) {
      return null;
    }

    const current = this.counters.get(service) ?? 0;
    const selected = healthy[current % healthy.length];
    this.counters.set(service, current + 1);

    return selected;
  }

  /**
   * Reset counter for a specific service.
   * Useful for testing; not needed in production.
   */
  resetCounter(service: string): void {
    this.counters.delete(service);
  }
}

// Singleton
export const roundRobinLB = new RoundRobinLoadBalancer();
