import { cacheStampedeSimulation } from "./cache-stampede";
import { circuitBreakerSimulation } from "./circuit-breaker";
import { loadBalancingSimulation } from "./load-balancing";
import { queueProcessingSimulation } from "./queue-processing";
import { rateLimitingSimulation } from "./rate-limiting";
import { retryBackoffSimulation } from "./retry-backoff";
import type { SimulationDefinition } from "./simulation";

/** Simuladores disponibles, en el orden en que se presentan. */
export const SIMULATIONS: readonly SimulationDefinition[] = [
  loadBalancingSimulation,
  retryBackoffSimulation,
  cacheStampedeSimulation,
  rateLimitingSimulation,
  circuitBreakerSimulation,
  queueProcessingSimulation,
];

export function findSimulation(slug: string): SimulationDefinition | undefined {
  return SIMULATIONS.find((s) => s.slug === slug);
}
