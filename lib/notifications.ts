import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = (await Notifications.getPermissionsAsync()) as any;
  if (existing.granted === true) return true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (await Notifications.requestPermissionsAsync()) as any;
  return result.granted === true;
}

const FEEDING_NOTIFICATION_ID = 'feeding-reminder';
const MILESTONE_ID_PREFIX = 'milestone-';

export async function scheduleFeedingReminder(
  lastFeedingTime: Date,
  intervalHours: number
): Promise<void> {
  if (Platform.OS === 'web') return;

  await cancelFeedingReminder();

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  // Notificar 15 minutos antes de completar o intervalo
  const triggerMs = lastFeedingTime.getTime() + (intervalHours * 60 - 15) * 60 * 1000;
  const triggerDate = new Date(triggerMs);

  if (triggerDate <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: FEEDING_NOTIFICATION_ID,
    content: {
      title: 'Hora da mamada se aproxima!',
      body: `Faltam 15 minutos para completar ${intervalHours}h desde a última mamada.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

export async function cancelFeedingReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(FEEDING_NOTIFICATION_ID);
  } catch {
    // ignora se não existe
  }
}

export interface MilestoneGroup {
  id: string;
  label: string;
  diasMin: number;
}

export async function scheduleUpcomingMilestoneNotifications(
  birthDate: Date,
  babyName: string,
  grupos: MilestoneGroup[]
): Promise<void> {
  if (Platform.OS === 'web') return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await cancelMilestoneNotifications();

  const now = new Date();

  for (const grupo of grupos) {
    // Data em que o bebê entra nesta fase
    const phaseDate = new Date(birthDate.getTime() + grupo.diasMin * 24 * 60 * 60 * 1000);
    phaseDate.setHours(9, 0, 0, 0);

    if (phaseDate > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${MILESTONE_ID_PREFIX}${grupo.id}`,
        content: {
          title: `Novo marco: ${grupo.label}`,
          body: `${babyName} está entrando na fase "${grupo.label}"! Confira os marcos no app.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: phaseDate,
        },
      });
    }
  }
}

export async function cancelMilestoneNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(MILESTONE_ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}
