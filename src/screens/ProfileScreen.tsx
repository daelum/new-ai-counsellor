import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Switch } from 'react-native';
import { Text, Card, Button, ListItem } from '@rneui/themed';

const ProfileScreen = () => {
  const [notifications, setNotifications] = useState(true);
  const [dailyVerse, setDailyVerse] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <ScrollView style={styles.container}>
      <Card containerStyle={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Text h4 style={styles.welcomeText}>
            Welcome to Solomon
          </Text>
          <Text style={styles.subtitle}>
            Your AI Christian Counselor
          </Text>
        </View>
      </Card>

      <Card containerStyle={styles.settingsCard}>
        <Card.Title>Settings</Card.Title>
        <Card.Divider />
        
        <ListItem bottomDivider>
          <ListItem.Content>
            <ListItem.Title>Push Notifications</ListItem.Title>
            <ListItem.Subtitle>Receive important updates</ListItem.Subtitle>
          </ListItem.Content>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
          />
        </ListItem>

        <ListItem bottomDivider>
          <ListItem.Content>
            <ListItem.Title>Daily Verse</ListItem.Title>
            <ListItem.Subtitle>Receive daily Bible verses</ListItem.Subtitle>
          </ListItem.Content>
          <Switch
            value={dailyVerse}
            onValueChange={setDailyVerse}
          />
        </ListItem>

        <ListItem bottomDivider>
          <ListItem.Content>
            <ListItem.Title>Dark Mode</ListItem.Title>
            <ListItem.Subtitle>Toggle dark theme</ListItem.Subtitle>
          </ListItem.Content>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
          />
        </ListItem>
      </Card>

      <Card containerStyle={styles.aboutCard}>
        <Card.Title>About Solomon</Card.Title>
        <Card.Divider />
        <Text style={styles.aboutText}>
          Solomon is an AI-powered Christian counseling app designed to provide
          biblical guidance and support. Drawing inspiration from King Solomon's
          wisdom, we aim to help you navigate life's challenges through the lens
          of Scripture.
        </Text>
        <Text style={styles.versionText}>
          Version 1.0.0
        </Text>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          title="Privacy Policy"
          type="outline"
          buttonStyle={styles.button}
          containerStyle={styles.buttonWrapper}
        />
        <Button
          title="Terms of Service"
          type="outline"
          buttonStyle={styles.button}
          containerStyle={styles.buttonWrapper}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileCard: {
    borderRadius: 15,
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
  },
  welcomeText: {
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    color: '#666',
    fontSize: 16,
  },
  settingsCard: {
    borderRadius: 15,
    padding: 0,
    marginTop: 10,
  },
  aboutCard: {
    borderRadius: 15,
    marginTop: 10,
  },
  aboutText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 15,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 5,
  },
  button: {
    borderColor: '#6200ee',
    borderRadius: 10,
  },
});

export default ProfileScreen; 