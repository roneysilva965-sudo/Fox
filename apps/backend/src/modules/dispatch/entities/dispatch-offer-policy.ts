export interface CourierScoreInput {
  courierId: string;
  distanceKm: number;
  acceptanceRate: number;
  completionRate: number;
  activeTasks: number;
  zoneMatch: boolean;
  vehicleMatch: boolean;
}

export function calculateDispatchScore(input: CourierScoreInput): number {
  const base = 100;
  const distancePenalty = input.distanceKm * 7;
  const acceptanceBoost = input.acceptanceRate * 0.2;
  const completionBoost = input.completionRate * 0.2;
  const loadPenalty = input.activeTasks * 15;
  const zoneBoost = input.zoneMatch ? 10 : -25;
  const vehicleBoost = input.vehicleMatch ? 8 : -50;

  return Math.max(
    0,
    base - distancePenalty - loadPenalty + acceptanceBoost + completionBoost + zoneBoost + vehicleBoost,
  );
}
