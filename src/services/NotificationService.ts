import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AIService from './AIService';

class NotificationService {
  private static instance: NotificationService;
  private aiService: AIService;

  private constructor() {
    this.aiService = AIService.getInstance();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily-verse', {
        name: 'Daily Bible Verse',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10a37f',
      });
    }

    return true;
  }

  public async scheduleDailyVerseNotification(enabled: boolean): Promise<void> {
    if (enabled) {
      // Cancel any existing notifications first
      await this.cancelDailyVerseNotifications();

      // Get a random Bible verse about wisdom, love, or faith for the first notification
      const verses = await this.aiService.searchBibleVerses('wisdom love faith hope');
      const verse = verses[Math.floor(Math.random() * verses.length)];

      // Schedule the notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Daily Bible Verse',
          body: `${verse.verse}\n\n- ${verse.reference}`,
          data: { type: 'daily-verse' },
        },
        trigger: {
          hour: 9, // 9 AM
          minute: 0,
          repeats: true,
        },
      });
    } else {
      await this.cancelDailyVerseNotifications();
    }
  }

  private async cancelDailyVerseNotifications(): Promise<void> {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const dailyVerseNotifications = scheduledNotifications.filter(
      notification => notification.content.data?.type === 'daily-verse'
    );

    for (const notification of dailyVerseNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  public async setupInitialNotification(): Promise<void> {
    // Configure notification behavior
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
}

export default NotificationService; 