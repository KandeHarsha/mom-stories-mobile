import Healthkit, {
    type QuantityTypeIdentifier,
} from '@kingstinct/react-native-healthkit';
import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export const DEFAULT_STEP_GOAL = 7000;
export const MIN_STEP_GOAL = 1000;
export const MAX_STEP_GOAL = 100000;

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
  stepGoal: number;
}

// ─── HealthKit helpers ──────────────────────────────────────────────────────

/**
 * Formats a Date as a 'YYYY-MM-DD' key using its *local* calendar day.
 * `toISOString()` converts to UTC first, which shifts the date backward
 * for any timezone ahead of UTC — use this instead when the Date already
 * represents local midnight or a local-day boundary.
 */
const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Returns true only on iOS devices where HealthKit is available */
export const isHealthKitAvailable = (): boolean => Platform.OS === 'ios';

/**
 * Request HealthKit read permissions for step count, flights climbed, and
 * active energy burned. Resolves to true if authorization was granted.
 */
export const requestHealthKitPermissions = async (): Promise<boolean> => {
  if (!isHealthKitAvailable()) return false;
  try {
    return await Healthkit.requestAuthorization({
      toRead: [
        'HKQuantityTypeIdentifierStepCount',
        'HKQuantityTypeIdentifierFlightsClimbed',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
      ],
    });
  } catch (error) {
    console.warn('[fitness-service] requestHealthKitPermissions failed', error);
    return false;
  }
};

/**
 * Query a daily sum for a QuantityTypeIdentifier over a date range.
 * Returns a map of 'YYYY-MM-DD' → numeric value.
 */
const queryDailySums = async (
  identifier: QuantityTypeIdentifier,
  unit: string,
  startDate: Date,
  endDate: Date,
): Promise<Record<string, number>> => {
  const results = await Healthkit.queryStatisticsCollectionForQuantity(
    identifier,
    ['cumulativeSum'],
    startDate,
    { day: 1 },
    { unit, filter: { date: { startDate, endDate } } },
  );

  const map: Record<string, number> = {};
  for (const stat of results) {
    if (!stat.startDate) continue;
    const dateKey = toLocalDateKey(stat.startDate);
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
      'HKQuantityTypeIdentifierStepCount',
      'count',
      startDate,
      endDate,
    ),
    queryDailySums(
      'HKQuantityTypeIdentifierFlightsClimbed',
      'count',
      startDate,
      endDate,
    ),
    queryDailySums(
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      'kcal',
      startDate,
      endDate,
    ),
  ]);

  const dataPoints: FitnessDataPoint[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const dateKey = toLocalDateKey(cursor);
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
// Fitness sync is currently iOS/HealthKit only — Android is handled separately.

/**
 * POST /fitness/ios — upsert fitness data points for the authenticated user.
 */
export const syncFitnessData = async (
  token: string,
  data: FitnessDataPoint[],
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/fitness/ios`, {
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
 * GET /fitness/ios?days=7 — fetch fitness history and step goal for the
 * authenticated user.
 */
export const getFitnessHistory = async (
  token: string,
  days: number = 7,
): Promise<FitnessHistoryResponse> => {
  const response = await fetch(`${API_BASE_URL}/fitness/ios?days=${days}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch fitness history');
  }

  return response.json();
};

/**
 * PUT /fitness/ios — update the authenticated user's daily step goal.
 */
export const updateStepGoal = async (
  token: string,
  stepGoal: number,
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/fitness/ios`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ stepGoal }),
  });

  if (!response.ok) {
    throw new Error('Failed to update step goal');
  }
};
