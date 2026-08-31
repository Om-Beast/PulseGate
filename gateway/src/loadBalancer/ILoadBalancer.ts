import { ServiceInstance } from '../types';

/**
 * ILoadBalancer defines the contract for any load balancing strategy.
 * This interface makes it easy to swap strategies (e.g., add Least Connections later).
 */
export interface ILoadBalancer {
  /**
   * Select a backend instance from the provided list.
   * Implementations MUST only consider healthy instances.
   *
   * @param service - The service name (used to maintain per-service state)
   * @param instances - Candidate instances (may include unhealthy ones)
   * @returns A selected ServiceInstance or null if none are available
   */
  selectInstance(service: string, instances: ServiceInstance[]): ServiceInstance | null;
}
