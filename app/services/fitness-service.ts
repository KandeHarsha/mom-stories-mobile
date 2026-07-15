import Healthkit, {
    HKQuantityTypeIdentifier,
    HKStatisticsOptions,
} from '@kingstinct/react-native-healthkit';
import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// ─── Types ─────────────────────────────────────────────────────────────────

export interface FitnessDataPoint {
  date: string; // ISO date string: 'YYYY-MM-DD'
  steps: number;
  stairsClimbed: number;
  caloriesBurned: number;
}

export interface FitnessSyncPayload {
  data: FitnessDataPoint[];
}

export interface FitnessHistoryResponse {
  data: FitnessDataPoint[];
}

// ─── HealthKit helpers ──────────────────────────────────────────────────────

/** Returns true only on iOS devices where HealthKit is available */
export const isHealthKitAvailable = (): boolean => Platform.OS === 'ios';

/**
 * Request HealthKit read permissions for step count, flights climbed, and
 * active energy burned. Resolves to true if authorization was granted.
 */
export const requestHealthKitPermissions = async (): Promise<boolean> => {
  if (!isHealthKitAvailable()) return false;
  try {
    await Healthkit.requestAuthorization([
      HKQuantityTypeIdentifier.stepCount,
      HKQuantityTypeIdentifier.flightsClimbed,
      HKQuantityTypeIdentifier.activeEnergyBurned,
    ]);
    return true;
  } catch {
    return false;
  }
};

/**
 * Query a daily sum for a HKQuantityTypeIdentifier over a date range.
 * Returns a map of 'YYYY-MM-DD' → numeric value.
 */
const queryDailySums = async (
  identifier: HKQuantityTypeIdentifier,
  unit: string,
  startDate: Date,
  endDate: Date,
): Promise<Record<string, number>> => {
  const results = await Healthkit.queryStatisticsCollection(
    identifier,
    {
      anchorDate: startDate,
      intervalComponents: { day: 1 },
    },
    startDate,
    endDate,
    HKStatisticsOptions.cumulativeSum,
  );

  const map: Record<string, number> = {};
  for (const stat of results) {
    const dateKey = stat.startDate.toISOString().split('T')[0];
    map[dateKey] = stat.sumQuantity?.quantity ?? 0;
  }
  return map;
};

/**
 * Fetch step count, flights climbed, and calories burned from HealthKit
 * for the last `days` days (inclusive of today).
 */
export const fetchHealthKitData = async (
  days: number = 7,
): Promise<FitnessDataPoint[]> => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  const [stepsMap, stairsMap, caloriesMap] = await Promise.all([
    queryDailySums(
      HKQuantityTypeIdentifier.stepCount,
      'count',
      startDate,
      endDate,
    ),
    queryDailySums(
      HKQuantityTypeIdentifier.flightsClimbed,
      'count',
      startDate,
      endDate,
    ),
    queryDailySums(
      HKQuantityTypeIdentifier.activeEnergyBurned,
      'kcal',
      startDate,
      endDate,
    ),
  ]);

  const dataPoints: FitnessDataPoint[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const dateKey = cursor.toISOString().split('T')[0];
    dataPoints.push({
      date: dateKey,
      steps: Math.round(stepsMap[dateKey] ?? 0),
      stairsClimbed: Math.round(stairsMap[dateKey] ?? 0),
      caloriesBurned: Math.round(caloriesMap[dateKey] ?? 0),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return dataPoints;
};

// ─── Backend API calls ──────────────────────────────────────────────────────

/**
 * POST /fitness/sync — upsert fitness data points for the authenticated user.
 */
export const syncFitnessData = async (
  token: string,
  data: FitnessDataPoint[],
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/fitness/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data } satisfies FitnessSyncPayload),
  });

  if (!response.ok) {
    throw new Error('Failed to sync fitness data');
  }
};

/**
 * GET /fitness?days=7 — fetch fitness history for the authenticated user.
 */
export const getFitnessHistory = async (
  token: string,
  days: number = 7,
): Promise<FitnessDataPoint[]> => {
  const response = await fetch(`${API_BASE_URL}/fitness?days=${days}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch fitness history');
  }

  const json: FitnessHistoryResponse = await response.json();
  return json.data;
};
