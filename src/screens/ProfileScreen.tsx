import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Text, Switch, Button } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import NotificationService from '../services/NotificationService';
import { useUser } from '../contexts/UserContext';

const ProfileScreen = () => {
  const [devotionalEnabled, setDevotionalEnabled] = useState(false);
  const [wisdomEnabled, setWisdomEnabled] = useState(false);
  const [devotionalTime, setDevotionalTime] = useState(new Date());
  const [wisdomTime, setWisdomTime] = useState(new Date());
  const [showDevotionalTimePicker, setShowDevotionalTimePicker] = useState(false);
  const [showWisdomTimePicker, setShowWisdomTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);

  const notificationService = NotificationService.getInstance();
  const { user, logout } = useUser();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const devotionalSettings = await notificationService.getNotificationSettings('devotional');
      const wisdomSettings = await notificationService.getNotificationSettings('wisdom');
      
      if (devotionalSettings) {
        setDevotionalEnabled(devotionalSettings.enabled);
        const savedTime = new Date();
        savedTime.setHours(devotionalSettings.hour);
        savedTime.setMinutes(devotionalSettings.minute);
        setDevotionalTime(savedTime);
      }

      if (wisdomSettings) {
        setWisdomEnabled(wisdomSettings.enabled);
        const savedTime = new Date();
        savedTime.setHours(wisdomSettings.hour);
        savedTime.setMinutes(wisdomSettings.minute);
        setWisdomTime(savedTime);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDevotionalTimeChange = async (event: any, selectedTime?: Date) => {
    setShowDevotionalTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setDevotionalTime(selectedTime);
      if (devotionalEnabled) {
        await updateNotification('devotional', selectedTime);
      }
    }
  };

  const handleWisdomTimeChange = async (event: any, selectedTime?: Date) => {
    setShowWisdomTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setWisdomTime(selectedTime);
      if (wisdomEnabled) {
        await updateNotification('wisdom', selectedTime);
      }
    }
  };

  const toggleDevotionalSwitch = async () => {
    try {
      const newState = !devotionalEnabled;
      setDevotionalEnabled(newState);
      
      if (newState) {
        await updateNotification('devotional', devotionalTime);
      } else {
        await notificationService.cancelReminder('devotional');
      }
    } catch (error) {
      console.error('Error toggling devotional notifications:', error);
      setDevotionalEnabled(!devotionalEnabled); // Revert on error
    }
  };

  const toggleWisdomSwitch = async () => {
    try {
      const newState = !wisdomEnabled;
      setWisdomEnabled(newState);
      
      if (newState) {
        await updateNotification('wisdom', wisdomTime);
      } else {
        await notificationService.cancelReminder('wisdom');
      }
    } catch (error) {
      console.error('Error toggling wisdom notifications:', error);
      setWisdomEnabled(!wisdomEnabled); // Revert on error
    }
  };

  const updateNotification = async (type: 'devotional' | 'wisdom', selectedTime: Date) => {
    try {
      await notificationService.scheduleReminder(
        type,
        selectedTime.getHours(),
        selectedTime.getMinutes()
      );
    } catch (error) {
      console.error('Error updating notification:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Navigation will be handled automatically by NavigationWrapper
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  const renderTimePicker = (
    type: 'devotional' | 'wisdom',
    time: Date,
    isEnabled: boolean,
    showPicker: boolean,
    handleTimeChange: any,
    setShowPicker: (show: boolean) => void
  ) => {
    const timeString = time.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    if (Platform.OS === 'ios') {
      return (
        <View style={styles.timePickerWrapper}>
          {!showPicker ? (
            <TouchableOpacity
              onPress={() => isEnabled && setShowPicker(true)}
              disabled={!isEnabled}
            >
              <Text style={[styles.timeLabel, !isEnabled && styles.disabled]}>
                {timeString}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.inlinePickerContainer}>
              <View style={styles.pickerWrapper}>
                <DateTimePicker
                  value={time}
                  mode="time"
                  display="spinner"
                  onChange={(event, selectedTime) => {
                    handleTimeChange(event, selectedTime);
                    if (event.type === 'set') {
                      setShowPicker(false);
                    }
                  }}
                  style={styles.inlineTimePicker}
                  textColor="#ffffff"
                />
              </View>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    return (
      <>
        <TouchableOpacity
          onPress={() => isEnabled && setShowPicker(true)}
          disabled={!isEnabled}
          style={styles.timeButton}
        >
          <Text style={[styles.timeLabel, !isEnabled && styles.disabled]}>
            {timeString}
          </Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display="spinner"
            onChange={(event, selectedTime) => {
              setShowPicker(false);
              handleTimeChange(event, selectedTime);
            }}
          />
        )}
      </>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color="#10a37f" />
        </View>
        <Text style={styles.welcomeText}>Welcome to Solomon AI</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        
        {/* Daily Devotional Settings */}
        <View style={[styles.settingCard, styles.marginBottom]}>
          <View style={styles.settingHeader}>
            <Ionicons name="notifications-outline" size={24} color="#10a37f" />
            <Text style={styles.settingTitle}>Daily Devotional Reminder</Text>
          </View>
          <Text style={styles.settingDescription}>
            Receive a daily notification to remind you to read your devotional and
            spend time in prayer.
          </Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Enable Notifications</Text>
            <Switch
              value={devotionalEnabled}
              onValueChange={toggleDevotionalSwitch}
              color="#10a37f"
            />
          </View>

          <View style={[styles.settingRow, !devotionalEnabled && styles.disabled]}>
            <Text style={styles.settingLabel}>Reminder Time</Text>
            {renderTimePicker(
              'devotional',
              devotionalTime,
              devotionalEnabled,
              showDevotionalTimePicker,
              handleDevotionalTimeChange,
              setShowDevotionalTimePicker
            )}
          </View>
        </View>

        {/* Daily Wisdom Settings */}
        <View style={styles.settingCard}>
          <View style={styles.settingHeader}>
            <Ionicons name="book-outline" size={24} color="#10a37f" />
            <Text style={styles.settingTitle}>Daily Wisdom Verse</Text>
          </View>
          <Text style={styles.settingDescription}>
            Receive a daily Bible verse about wisdom, love, and faith to inspire your day.
          </Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Enable Notifications</Text>
            <Switch
              value={wisdomEnabled}
              onValueChange={toggleWisdomSwitch}
              color="#10a37f"
            />
          </View>

          <View style={[styles.settingRow, !wisdomEnabled && styles.disabled]}>
            <Text style={styles.settingLabel}>Reminder Time</Text>
            {renderTimePicker(
              'wisdom',
              wisdomTime,
              wisdomEnabled,
              showWisdomTimePicker,
              handleWisdomTimeChange,
              setShowWisdomTimePicker
            )}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.settingCard}>
          <View style={styles.settingHeader}>
            <Ionicons name="information-circle-outline" size={24} color="#10a37f" />
            <Text style={styles.settingTitle}>App Information</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Log Out"
          onPress={handleLogout}
          buttonStyle={styles.logoutButton}
          titleStyle={styles.logoutButtonText}
          icon={
            <Ionicons
              name="log-out-outline"
              size={20}
              color="#ffffff"
              style={{ marginRight: 10 }}
            />
          }
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#343541',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 30,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  settingCard: {
    backgroundColor: '#444654',
    borderRadius: 12,
    padding: 16,
  },
  marginBottom: {
    marginBottom: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingTitle: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666980',
    marginBottom: 16,
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#343541',
  },
  settingLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  timePickerWrapper: {
    alignItems: 'flex-end',
    position: 'relative',
  },
  inlinePickerContainer: {
    position: 'absolute',
    right: 0,
    top: -160,
    backgroundColor: '#343541',
    borderRadius: 8,
    overflow: 'hidden',
    width: 280,
    zIndex: 1000,
  },
  pickerWrapper: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineTimePicker: {
    width: 280,
    height: 160,
    backgroundColor: 'transparent',
  },
  doneButton: {
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#444654',
  },
  doneButtonText: {
    color: '#10a37f',
    fontSize: 16,
    fontWeight: '600',
  },
  timeButton: {
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: '#666980',
    textAlign: 'right',
  },
  disabled: {
    opacity: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  infoValue: {
    fontSize: 16,
    color: '#666980',
  },
  loadingText: {
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 20,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    marginTop: 20,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen; 