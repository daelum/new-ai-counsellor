import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Switch, Alert } from 'react-native';
import { Text, ListItem } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import NotificationService from '../services/NotificationService';

const ProfileScreen = () => {
  const [notifications, setNotifications] = useState(true);
  const [dailyVerse, setDailyVerse] = useState(true);
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    setupNotifications();
  }, []);

  const setupNotifications = async () => {
    await notificationService.setupInitialNotification();
  };

  const handleDailyVerseToggle = async (value: boolean) => {
    try {
      const hasPermission = await notificationService.requestPermissions();
      
      if (hasPermission) {
        setDailyVerse(value);
        await notificationService.scheduleDailyVerseNotification(value);
      } else {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive daily Bible verses.',
          [{ text: 'OK' }]
        );
        setDailyVerse(false);
      }
    } catch (error) {
      console.error('Error toggling daily verse:', error);
      Alert.alert(
        'Error',
        'Unable to set up daily Bible verse notifications. Please try again.',
        [{ text: 'OK' }]
      );
      setDailyVerse(false);
    }
  };

  const handleNotificationsToggle = async (value: boolean) => {
    try {
      const hasPermission = await notificationService.requestPermissions();
      
      if (hasPermission) {
        setNotifications(value);
        // If turning off notifications, also turn off daily verse
        if (!value && dailyVerse) {
          handleDailyVerseToggle(false);
        }
      } else {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings.',
          [{ text: 'OK' }]
        );
        setNotifications(false);
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert(
        'Error',
        'Unable to update notification settings. Please try again.',
        [{ text: 'OK' }]
      );
      setNotifications(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color="#10a37f" />
        </View>
        <Text h4 style={styles.welcomeText}>
          Welcome to Solomon
        </Text>
        <Text style={styles.subtitle}>
          Your AI Christian Counselor
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsContainer}>
          <ListItem
            containerStyle={styles.listItem}
          >
            <ListItem.Content>
              <ListItem.Title style={styles.listItemTitle}>Push Notifications</ListItem.Title>
              <ListItem.Subtitle style={styles.listItemSubtitle}>Receive important updates</ListItem.Subtitle>
            </ListItem.Content>
            <Switch
              value={notifications}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: '#666980', true: '#10a37f' }}
              thumbColor="#ffffff"
            />
          </ListItem>

          <ListItem
            containerStyle={styles.listItem}
          >
            <ListItem.Content>
              <ListItem.Title style={styles.listItemTitle}>Daily Verse</ListItem.Title>
              <ListItem.Subtitle style={styles.listItemSubtitle}>Receive daily Bible verses at 9 AM</ListItem.Subtitle>
            </ListItem.Content>
            <Switch
              value={dailyVerse}
              onValueChange={handleDailyVerseToggle}
              trackColor={{ false: '#666980', true: '#10a37f' }}
              thumbColor="#ffffff"
              disabled={!notifications}
            />
          </ListItem>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About Solomon</Text>
        <View style={styles.aboutContainer}>
          <Text style={styles.aboutText}>
            Solomon is an AI-powered Christian counseling app designed to provide
            biblical guidance and support. Drawing inspiration from King Solomon's
            wisdom, we aim to help you navigate life's challenges through the lens
            of Scripture.
          </Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="heart" size={20} color="#10a37f" />
              <Text style={styles.featureText}>Compassionate Guidance</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="book" size={20} color="#10a37f" />
              <Text style={styles.featureText}>Biblical Integration</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="shield" size={20} color="#10a37f" />
              <Text style={styles.featureText}>Private & Secure</Text>
            </View>
          </View>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLink}>Privacy Policy</Text>
        <Text style={styles.footerDot}>•</Text>
        <Text style={styles.footerLink}>Terms of Service</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#343541',
  },
  profileHeader: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#444654',
    borderBottomWidth: 1,
    borderBottomColor: '#202123',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  welcomeText: {
    color: '#ffffff',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    color: '#666980',
    fontSize: 16,
    textAlign: 'center',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    marginLeft: 5,
  },
  settingsContainer: {
    backgroundColor: '#444654',
    borderRadius: 12,
    overflow: 'hidden',
  },
  listItem: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#202123',
    paddingVertical: 12,
  },
  listItemTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  listItemSubtitle: {
    color: '#666980',
    fontSize: 14,
    marginTop: 4,
  },
  aboutContainer: {
    backgroundColor: '#444654',
    borderRadius: 12,
    padding: 15,
  },
  aboutText: {
    fontSize: 15,
    color: '#ffffff',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  featuresList: {
    marginTop: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  featureText: {
    color: '#ffffff',
    marginLeft: 10,
    fontSize: 15,
  },
  versionText: {
    fontSize: 14,
    color: '#666980',
    textAlign: 'center',
    marginTop: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 10,
  },
  footerLink: {
    color: '#10a37f',
    fontSize: 14,
  },
  footerDot: {
    color: '#666980',
    marginHorizontal: 8,
  },
});

export default ProfileScreen; 