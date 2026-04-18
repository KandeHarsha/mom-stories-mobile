const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export type MedicationType = 'tablet' | 'tonic' | 'powder' | 'drops';
export type MedicationFrequency = 'daily' | 'weekly';

export interface ReminderTime {
  hour: number;
  minute: number;
}

export interface Medication {
  id: string;
  userId: string;
  title: string;
  frequency: MedicationFrequency;
  reminderTime: ReminderTime;
  weekday?: number; // 1=Sunday, 2=Monday, ..., 7=Saturday
  dosage: string;
  type: MedicationType;
  notificationId?: string;
  createdAt: string;
}

export interface CreateMedicationPayload {
  title: string;
  frequency: MedicationFrequency;
  reminderTime: ReminderTime;
  weekday?: number;
  dosage: string;
  type: MedicationType;
}

export interface UpdateMedicationPayload {
  title?: string;
  frequency?: MedicationFrequency;
  reminderTime?: ReminderTime;
  weekday?: number;
  dosage?: string;
  type?: MedicationType;
  notificationId?: string;
}

/**
 * Fetch all medications for the authenticated user
 */
export const getMedications = async (token: string): Promise<Medication[]> => {
  const response = await fetch(`${API_BASE_URL}/medications`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch medications');
  }

  return response.json();
};

/**
 * Create a new medication
 */
export const createMedication = async (
  token: string,
  payload: CreateMedicationPayload
): Promise<{ success: boolean; id: string }> => {
  const response = await fetch(`${API_BASE_URL}/medications`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to create medication');
  }

  return response.json();
};

/**
 * Update an existing medication
 */
export const updateMedication = async (
  token: string,
  medicationId: string,
  payload: UpdateMedicationPayload
): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/medications/${medicationId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to update medication');
  }

  return response.json();
};

/**
 * Delete a medication
 */
export const deleteMedication = async (
  token: string,
  medicationId: string
): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/medications/${medicationId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete medication');
  }

  return response.json();
};
