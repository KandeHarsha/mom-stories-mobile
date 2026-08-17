import Healthkit, {
    type QuantityTypeIdentifier,
} from '@kingstinct/react-native-healthkit';
import { Platform } from 'react-native';
import {
    aggregateGroupByPeriod,
    getSdkStatus,
    initialize as initializeHealthConnect,
    requestPermission as requestHealthConnectPermission,
    SdkAvailabilityStatus,
} from 'react-native-health-connect';
import type { RecordType } from 'react-native-health-connect';

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

// ─── Shared helpers ─────────────────────────────────────────────────────────

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

/** Returns the last `days` days (inclusive of today) as local midnight-to-end-of-day bounds. */
const getDayRange = (days: number): { startDate: Date; endDate: Date } => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate };
};

// ─── HealthKit helpers (iOS) ────────────────────────────────────────────────

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

/** Builds one FitnessDataPoint per day in [startDate, endDate] from three daily-sum maps. */
const buildDataPoints = (
  startDate: Date,
  endDate: Date,
  stepsMap: Record<string, number>,
  stairsMap: Record<string, number>,
  caloriesMap: Record<string, number>,
): FitnessDataPoint[] => {
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

/**
 * Fetch step count, flights climbed, and calories burned from HealthKit
 * for the last `days` days (inclusive of today).
 */
export const fetchHealthKitData = async (
  days: number = 7,
): Promise<FitnessDataPoint[]> => {
  const { startDate, endDate } = getDayRange(days);

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

  return buildDataPoints(startDate, endDate, stepsMap, stairsMap, caloriesMap);
};

// ─── Health Connect helpers (Android) ───────────────────────────────────────

/** Returns true only on Android devices where Health Connect is targeted */
export const isHealthConnectAvailable = (): boolean => Platform.OS === 'android';

/**
 * Checks whether the Health Connect provider app is installed and ready.
 * On API < 34 this requires the standalone Health Connect app from the Play
 * Store; on API >= 34 it's built into the OS. Distinct from permission
 * status — this only reflects whether the SDK itself can be used.
 */
export const isHealthConnectSdkAvailable = async (): Promise<boolean> => {
  if (!isHealthConnectAvailable()) return false;
  try {
    const status = await getSdkStatus();
    return status === SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch (error) {
    console.warn('[fitness-service] isHealthConnectSdkAvailable failed', error);
    return false;
  }
};

/**
 * Request Health Connect read permissions for steps, floors climbed, and
 * active calories burned. Resolves to true if every requested permission
 * was granted.
 */
export const requestHealthConnectPermissions = async (): Promise<boolean> => {
  if (!isHealthConnectAvailable()) return false;
  try {
    const initialized = await initializeHealthConnect();
    if (!initialized) return false;

    const requested: { accessType: 'read'; recordType: RecordType }[] = [
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'FloorsClimbed' },
      { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
    ];
    const granted = await requestHealthConnectPermission(requested);

    return requested.every(want =>
      granted.some(
        got => got.accessType === want.accessType && got.recordType === want.recordType,
      ),
    );
  } catch (error) {
    console.warn('[fitness-service] requestHealthConnectPermissions failed', error);
    return false;
  }
};

/**
 * Query a daily sum for a Health Connect record type over a date range,
 * reading `resultKey` (e.g. 'COUNT_TOTAL') off each day's aggregate result.
 * Returns a map of 'YYYY-MM-DD' → numeric value.
 */
const queryDailySumsHealthConnect = async (
  recordType: 'Steps' | 'FloorsClimbed' | 'ActiveCaloriesBurned',
  resultKey: string,
  startDate: Date,
  endDate: Date,
): Promise<Record<string, number>> => {
  const results = await aggregateGroupByPeriod({
    recordType,
    timeRangeFilter: {
      operator: 'between',
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
    },
    timeRangeSlicer: { period: 'DAYS', length: 1 },
  } as Parameters<typeof aggregateGroupByPeriod>[0]);

  const map: Record<string, number> = {};
  for (const group of results) {
    const dateKey = toLocalDateKey(new Date(group.startTime));
    const value = (group.result as Record<string, unknown>)[resultKey];
    if (typeof value === 'number') {
      map[dateKey] = value;
    } else if (value && typeof value === 'object' && 'inKilocalories' in value) {
      map[dateKey] = (value as { inKilocalories: number }).inKilocalories;
    }
  }
  return map;
};

/**
 * Fetch step count, floors climbed, and active calories burned from Health
 * Connect for the last `days` days (inclusive of today).
 */
export const fetchHealthConnectData = async (
  days: number = 7,
): Promise<FitnessDataPoint[]> => {
  const { startDate, endDate } = getDayRange(days);

  const [stepsMap, stairsMap, caloriesMap] = await Promise.all([
    queryDailySumsHealthConnect('Steps', 'COUNT_TOTAL', startDate, endDate),
    queryDailySumsHealthConnect('FloorsClimbed', 'FLOORS_CLIMBED_TOTAL', startDate, endDate),
    queryDailySumsHealthConnect('ActiveCaloriesBurned', 'ACTIVE_CALORIES_TOTAL', startDate, endDate),
  ]);

  return buildDataPoints(startDate, endDate, stepsMap, stairsMap, caloriesMap);
};

// ─── Cross-platform dispatch ────────────────────────────────────────────────

/** Returns true when an on-device health data source (HealthKit or Health Connect) is available. */
export const isDeviceHealthDataAvailable = (): boolean =>
  isHealthKitAvailable() || isHealthConnectAvailable();

/** Requests on-device health permissions for whichever platform source applies. */
export const requestDeviceHealthPermissions = async (): Promise<boolean> => {
  if (isHealthKitAvailable()) return requestHealthKitPermissions();
  if (isHealthConnectAvailable()) return requestHealthConnectPermissions();
  return false;
};

/** Fetches fitness data from whichever on-device health source applies. */
export const fetchDeviceHealthData = async (
  days: number = 7,
): Promise<FitnessDataPoint[]> => {
  if (isHealthKitAvailable()) return fetchHealthKitData(days);
  if (isHealthConnectAvailable()) return fetchHealthConnectData(days);
  return [];
};

// ─── Backend API calls ──────────────────────────────────────────────────────
// Each platform syncs through its own route (`/fitness/ios`, `/fitness/android`),
// but both routes are backed by the same per-user Firestore collections on the
// backend — there's no data split, just separate endpoints per client.

/** Resolves the platform-specific fitness route, e.g. '/fitness/ios' or '/fitness/android'. */
const getFitnessEndpoint = (): string =>
  `${API_BASE_URL}/fitness/${Platform.OS === 'android' ? 'android' : 'ios'}`;

/**
 * POST /fitness/{ios|android} — upsert fitness data points for the
 * authenticated user.
 */
export const syncFitnessData = async (
  token: string,
  data: FitnessDataPoint[],
): Promise<void> => {
  const response = await fetch(getFitnessEndpoint(), {
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
 * GET /fitness/{ios|android}?days=7 — fetch fitness history and step goal
 * for the authenticated user.
 */
export const getFitnessHistory = async (
  token: string,
  days: number = 7,
): Promise<FitnessHistoryResponse> => {
  const response = await fetch(`${getFitnessEndpoint()}?days=${days}`, {
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
 * PUT /fitness/{ios|android} — update the authenticated user's daily step goal.
 */
export const updateStepGoal = async (
  token: string,
  stepGoal: number,
): Promise<void> => {
  const response = await fetch(getFitnessEndpoint(), {
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
