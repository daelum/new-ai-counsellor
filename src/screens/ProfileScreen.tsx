import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Platform, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Text, Switch, Button, Overlay } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import NotificationService from '../services/NotificationService';
import { useUser } from '../contexts/UserContext';
import FirebaseService from '../services/FirebaseService';

const ProfileScreen = () => {
  const [devotionalEnabled, setDevotionalEnabled] = useState(false);
  const [wisdomEnabled, setWisdomEnabled] = useState(false);
  const [devotionalTime, setDevotionalTime] = useState(new Date());
  const [wisdomTime, setWisdomTime] = useState(new Date());
  const [showDevotionalTimePicker, setShowDevotionalTimePicker] = useState(false);
  const [showWisdomTimePicker, setShowWisdomTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
  const [editedDisplayName, setEditedDisplayName] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const notificationService = NotificationService.getInstance();
  const { user, logout, updateProfile } = useUser();

  useEffect(() => {
    loadSettings();
    if (user) {
      setEditedUsername(user.username);
      setEditedDisplayName(user.displayName || '');
      setEditedBio(user.bio || '');
    }
  }, [user]);

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

  const handleSaveProfile = async () => {
    if (!user) return;

    if (!editedUsername.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      await updateProfile({
        username: editedUsername.trim(),
        displayName: editedDisplayName.trim() || undefined,
        bio: editedBio.trim() || undefined,
      });

      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearMemory = async () => {
    if (!user) return;
    
    setIsClearing(true);
    try {
      await FirebaseService.clearUserData(user.id);
      setShowClearConfirmation(false);
      Alert.alert('Success', 'All your data has been cleared successfully.');
    } catch (error) {
      console.error('Error clearing user data:', error);
      Alert.alert('Error', 'Failed to clear data. Please try again.');
    } finally {
      setIsClearing(false);
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
        {!isEditing ? (
          <>
            <Text style={styles.displayName}>{user?.displayName || user?.username}</Text>
            {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
            <Button
              title="Edit Profile"
              onPress={() => setIsEditing(true)}
              buttonStyle={styles.editButton}
              icon={
                <Ionicons
                  name="pencil"
                  size={20}
                  color="#ffffff"
                  style={{ marginRight: 10 }}
                />
              }
            />
          </>
        ) : (
          <View style={styles.editForm}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#666980"
              value={editedUsername}
              onChangeText={setEditedUsername}
            />
            <TextInput
              style={styles.input}
              placeholder="Display Name (optional)"
              placeholderTextColor="#666980"
              value={editedDisplayName}
              onChangeText={setEditedDisplayName}
            />
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Bio (optional)"
              placeholderTextColor="#666980"
              value={editedBio}
              onChangeText={setEditedBio}
              multiline
              numberOfLines={3}
            />
            <View style={styles.editButtons}>
              <Button
                title="Cancel"
                type="outline"
                onPress={() => setIsEditing(false)}
                containerStyle={styles.editButtonContainer}
              />
              <Button
                title="Save"
                onPress={handleSaveProfile}
                loading={isSaving}
                containerStyle={styles.editButtonContainer}
              />
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.settingCard}>
          <View style={styles.settingHeader}>
            <Ionicons name="person-outline" size={24} color="#10a37f" />
            <Text style={styles.settingTitle}>Account Information</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>
              {user?.createdAt.toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
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

      <View style={styles.section}>
        <View style={styles.settingCard}>
          <View style={styles.settingHeader}>
            <Ionicons name="trash-outline" size={24} color="#e74c3c" />
            <Text style={styles.settingTitle}>Clear Memory</Text>
          </View>
          <Text style={styles.settingDescription}>
            Clear all your conversations, prayers, and other data. This action cannot be undone.
          </Text>
          <TouchableOpacity
            style={[styles.clearButton, isClearing && styles.clearButtonDisabled]}
            onPress={() => setShowClearConfirmation(true)}
            disabled={isClearing}
          >
            <Text style={styles.clearButtonText}>Clear All Data</Text>
          </TouchableOpacity>
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

      <Overlay
        isVisible={showClearConfirmation}
        onBackdropPress={() => !isClearing && setShowClearConfirmation(false)}
        overlayStyle={styles.overlay}
      >
        <View style={styles.overlayContent}>
          <Text style={styles.overlayTitle}>Clear All Data?</Text>
          <Text style={styles.overlayDescription}>
            This will permanently delete all your conversations, prayers, and other data. This action cannot be undone.
          </Text>
          <View style={styles.overlayButtons}>
            <TouchableOpacity
              style={[styles.overlayButton, styles.cancelButton]}
              onPress={() => setShowClearConfirmation(false)}
              disabled={isClearing}
            >
              <Text style={styles.overlayButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.overlayButton, styles.confirmButton, isClearing && styles.clearButtonDisabled]}
              onPress={handleClearMemory}
              disabled={isClearing}
            >
              <Text style={[styles.overlayButtonText, styles.confirmButtonText]}>
                {isClearing ? 'Clearing...' : 'Clear All'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Overlay>
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
    backgroundColor: '#444654',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  section: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 0,
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
    borderTopWidth: 1,
    borderTopColor: '#343541',
  },
  infoLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  infoValue: {
    fontSize: 16,
    color: '#666980',
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
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
  displayName: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
    marginTop: 10,
  },
  bio: {
    fontSize: 16,
    color: '#666980',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  editButton: {
    backgroundColor: '#10a37f',
    paddingHorizontal: 20,
    marginTop: 15,
    borderRadius: 8,
  },
  editForm: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#343541',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    color: '#ffffff',
    fontSize: 16,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  editButtonContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  clearButton: {
    backgroundColor: '#e74c3c',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  clearButtonDisabled: {
    opacity: 0.6,
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  overlay: {
    backgroundColor: '#343541',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  overlayContent: {
    alignItems: 'center',
  },
  overlayTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  overlayDescription: {
    color: '#666980',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  overlayButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  overlayButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#444654',
  },
  confirmButton: {
    backgroundColor: '#e74c3c',
  },
  overlayButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#ffffff',
  },
  loadingText: {
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ProfileScreen; 