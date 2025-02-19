import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, Switch, Button } from '@rneui/themed';
import DateTimePicker from '@react-native-community/datetimepicker';
import NotificationService from '../services/NotificationService';

const DevotionalSettingsScreen = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);

  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await notificationService.getNotificationSettings();
      if (settings) {
        setIsEnabled(settings.enabled);
        const savedTime = new Date();
        savedTime.setHours(settings.hour);
        savedTime.setMinutes(settings.minute);
        setTime(savedTime);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = async (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setTime(selectedTime);
      if (isEnabled) {
        await updateNotification(selectedTime);
      }
    }
  };

  const toggleSwitch = async () => {
    try {
      const newState = !isEnabled;
      setIsEnabled(newState);
      
      if (newState) {
        await updateNotification(time);
      } else {
        await notificationService.cancelDevotionalReminder();
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      setIsEnabled(!isEnabled); // Revert on error
    }
  };

  const updateNotification = async (selectedTime: Date) => {
    try {
      await notificationService.scheduleDevotionalReminder(
        selectedTime.getHours(),
        selectedTime.getMinutes()
      );
    } catch (error) {
      console.error('Error updating notification:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>Daily Devotional Reminder</Text>
        <Text style={styles.description}>
          Receive a daily notification to remind you to read your devotional and
          spend time in prayer.
        </Text>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Enable Notifications</Text>
        <Switch
          value={isEnabled}
          onValueChange={toggleSwitch}
          color="#10a37f"
        />
      </View>

      <View style={[styles.settingRow, !isEnabled && styles.disabled]}>
        <Text style={styles.settingLabel}>Reminder Time</Text>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={time}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={handleTimeChange}
            disabled={!isEnabled}
            style={styles.timePicker}
          />
        ) : (
          <>
            <Button
              title={time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              onPress={() => setShowTimePicker(true)}
              disabled={!isEnabled}
              type="clear"
            />
            {showTimePicker && (
              <DateTimePicker
                value={time}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={handleTimeChange}
                disabled={!isEnabled}
              />
            )}
          </>
        )}
      </View>

      <Text style={styles.note}>
        Note: Make sure notifications are enabled in your device settings for the app.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#343541',
  },
  section: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666980',
    lineHeight: 22,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#444654',
  },
  settingLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  disabled: {
    opacity: 0.5,
  },
  timePicker: {
    width: 100,
  },
  note: {
    marginTop: 24,
    fontSize: 14,
    color: '#666980',
    fontStyle: 'italic',
  },
});

export default DevotionalSettingsScreen; 