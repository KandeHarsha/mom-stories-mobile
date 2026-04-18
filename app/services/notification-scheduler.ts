import * as Notifications from 'expo-notifications';
import { MedicationFrequency, ReminderTime } from './medication-service';

export interface MedicationReminderParams {
  medicationId: string;
  title: string;
  dosage: string;
  frequency: MedicationFrequency;
  reminderTime: ReminderTime;
  weekday?: number; // 1=Sunday, 2=Monday, ..., 7=Saturday
}

/**
 * Schedules a repeating local notification for a medication.
 * Returns the expo notification identifier.
 */
export const scheduleMedicationNotification = async (
  params: MedicationReminderParams
): Promise<string> => {
  const { title, dosage, frequency, reminderTime, weekday } = params;
  const { hour, minute } = reminderTime;

  const body =
    frequency === 'daily'
      ? `Time to take ${title} (${dosage})`
      : `Weekly reminder: Take ${title} (${dosage})`;

  const trigger: Notifications.NotificationTriggerInput =
    frequency === 'daily'
      ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute }
      : {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: weekday!,
          hour,
          minute,
        };

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '💊 Medication Reminder',
      body,
      data: { medicineId: params.medicationId, screen: 'MedicineDetail' },
    },
    trigger,
  });

  return id;
};

/**
 * Cancels a previously scheduled medication notification.
 */
export const cancelMedicationNotification = async (
  notificationId: string
): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

/**
 * Computes the ISO string for the next occurrence of the given time/weekday.
 */
export const getNextScheduledAt = (
  hour: number,
  minute: number,
  frequency: MedicationFrequency,
  weekday?: number
): string => {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);

  if (frequency === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (frequency === 'weekly' && weekday !== undefined) {
    // getDay() returns 0=Sunday; registry weekday: 1=Sunday, ..., 7=Saturday
    const currentDay = now.getDay() + 1;
    let daysUntil = (weekday - currentDay + 7) % 7;
    if (daysUntil === 0 && next <= now) daysUntil = 7;
    next.setDate(next.getDate() + daysUntil);
  }

  return next.toISOString();
};
