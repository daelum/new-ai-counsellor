import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AIService from './AIService';

type NotificationType = 'devotional' | 'wisdom';

interface NotificationSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  notificationId: string | null;
}

class NotificationService {
  private static instance: NotificationService;
  private static NOTIFICATION_SETTINGS_PREFIX = 'notification_settings_';
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

  public async initialize() {
    await this.requestPermissions();
    await this.configureNotifications();
  }

  private async requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
  }

  private async configureNotifications() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10a37f',
      });
    }
  }

  private getSettingsKey(type: NotificationType): string {
    return `${NotificationService.NOTIFICATION_SETTINGS_PREFIX}${type}`;
  }

  public async scheduleReminder(type: NotificationType, hour: number, minute: number) {
    // Cancel any existing reminder of this type
    await this.cancelReminder(type);

    // Schedule new reminder
    const trigger: Notifications.DailyTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hour,
      minute: minute
    };

    let content: Notifications.NotificationContentInput;

    if (type === 'devotional') {
      content = {
        title: "Daily Devotional",
        body: "Start your day with a moment of spiritual reflection 🙏",
        data: { screen: 'Devotional', type: 'devotional' },
      };
    } else {
      // For wisdom notifications, get a random verse
      const verses = await this.aiService.searchBibleVerses('wisdom love faith hope');
      const verse = verses[Math.floor(Math.random() * verses.length)];
      
      content = {
        title: "Daily Wisdom",
        body: `${verse.verse}\n\n- ${verse.reference}`,
        data: { type: 'wisdom' },
      };
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });

    // Save notification settings
    await AsyncStorage.setItem(this.getSettingsKey(type), JSON.stringify({
      enabled: true,
      hour,
      minute,
      notificationId,
    }));

    return notificationId;
  }

  public async cancelReminder(type: NotificationType) {
    const settings = await this.getNotificationSettings(type);
    if (settings?.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(settings.notificationId);
    }
    await AsyncStorage.setItem(this.getSettingsKey(type), JSON.stringify({
      enabled: false,
      hour: 0,
      minute: 0,
      notificationId: null,
    }));
  }

  public async getNotificationSettings(type: NotificationType): Promise<NotificationSettings | null> {
    const settings = await AsyncStorage.getItem(this.getSettingsKey(type));
    return settings ? JSON.parse(settings) : null;
  }
}

export default NotificationService; 