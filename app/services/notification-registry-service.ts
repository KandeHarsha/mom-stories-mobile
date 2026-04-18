const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export interface NotificationRegistryTrigger {
  hour: number;
  minute: number;
  repeats: boolean;
  weekday?: number;
}

export interface CreateNotificationRegistryPayload {
  expoNotificationId: string;
  sourceType: 'medicine';
  sourceId: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  trigger: NotificationRegistryTrigger;
  scheduledAt: string;
  repeats: boolean;
  status: 'active' | 'cancelled';
  deviceId: string;
}

export interface UpdateNotificationRegistryPayload {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  trigger?: NotificationRegistryTrigger;
  scheduledAt?: string;
  repeats?: boolean;
  status?: 'active' | 'cancelled';
  deviceId?: string;
}

export const createNotificationRegistry = async (
  token: string,
  payload: CreateNotificationRegistryPayload
): Promise<{ success: boolean; id: string }> => {
  const response = await fetch(`${API_BASE_URL}/notification-registry`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to create notification registry entry');
  }

  return response.json();
};

/**
 * Update a notification registry entry identified by the medication's sourceId.
 * Backend route: PATCH /api/notification-registry/by-source/:medicationId
 */
export const updateNotificationRegistryBySourceId = async (
  token: string,
  medicationId: string,
  payload: UpdateNotificationRegistryPayload
): Promise<{ success: boolean }> => {
  const response = await fetch(
    `${API_BASE_URL}/notification-registry/by-source/${medicationId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update notification registry entry');
  }

  return response.json();
};
