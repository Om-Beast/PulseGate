import { RoundRobinLoadBalancer } from '../../src/loadBalancer/roundRobin';
import { ServiceInstance } from '../../src/types';

function makeInstance(id: string, healthy = true): ServiceInstance {
  return {
    id,
    service: 'test-service',
    host: 'localhost',
    port: 4000,
    healthy,
    lastChecked: new Date(),
    failureCount: 0,
    recoveryCount: 0,
  };
}

describe('RoundRobinLoadBalancer', () => {
  let lb: RoundRobinLoadBalancer;

  beforeEach(() => {
    lb = new RoundRobinLoadBalancer();
  });

  it('cycles through healthy instances in order', () => {
    const instances = [
      makeInstance('svc-1'),
      makeInstance('svc-2'),
      makeInstance('svc-3'),
    ];

    expect(lb.selectInstance('svc', instances)?.id).toBe('svc-1');
    expect(lb.selectInstance('svc', instances)?.id).toBe('svc-2');
    expect(lb.selectInstance('svc', instances)?.id).toBe('svc-3');
    expect(lb.selectInstance('svc', instances)?.id).toBe('svc-1'); // Wraps
  });

  it('skips unhealthy instances', () => {
    const instances = [
      makeInstance('svc-1'),
      makeInstance('svc-2', false), // Unhealthy
      makeInstance('svc-3'),
    ];

    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const inst = lb.selectInstance('svc', instances);
      if (inst) seen.add(inst.id);
    }

    expect(seen.has('svc-1')).toBe(true);
    expect(seen.has('svc-2')).toBe(false); // Never selected
    expect(seen.has('svc-3')).toBe(true);
  });

  it('returns null when no healthy instances', () => {
    const instances = [
      makeInstance('svc-1', false),
      makeInstance('svc-2', false),
    ];

    expect(lb.selectInstance('svc', instances)).toBeNull();
  });

  it('returns null for empty instance list', () => {
    expect(lb.selectInstance('svc', [])).toBeNull();
  });

  it('maintains independent counters per service', () => {
    const usersInstances = [makeInstance('u-1'), makeInstance('u-2')];
    const ordersInstances = [makeInstance('o-1'), makeInstance('o-2')];

    expect(lb.selectInstance('users', usersInstances)?.id).toBe('u-1');
    expect(lb.selectInstance('orders', ordersInstances)?.id).toBe('o-1');
    expect(lb.selectInstance('users', usersInstances)?.id).toBe('u-2');
    expect(lb.selectInstance('orders', ordersInstances)?.id).toBe('o-2');
  });

  it('handles single instance correctly', () => {
    const instances = [makeInstance('only-one')];

    for (let i = 0; i < 5; i++) {
      expect(lb.selectInstance('svc', instances)?.id).toBe('only-one');
    }
  });
});
