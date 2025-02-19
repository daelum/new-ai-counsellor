import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button } from '@rneui/themed';

const HomeScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <Card containerStyle={styles.card}>
        <Card.Title h3>Welcome to Solomon AI</Card.Title>
        <Card.Divider />
        <Text style={styles.description}>
          Your personal AI Christian counselor, inspired by the wisdom of King Solomon.
          Get biblical guidance and support for life's challenges.
        </Text>
      </Card>

      <Card containerStyle={styles.card}>
        <Card.Title h4>How can I help you today?</Card.Title>
        <Card.Divider />
        <Button
          title="Start Counseling Session"
          buttonStyle={styles.button}
          onPress={() => {/* Navigation will be added */}}
        />
        <Button
          title="Read Bible Verses"
          buttonStyle={[styles.button, styles.secondaryButton]}
          onPress={() => {/* Navigation will be added */}}
        />
      </Card>

      <Card containerStyle={styles.card}>
        <Card.Title h4>Daily Wisdom</Card.Title>
        <Card.Divider />
        <Text style={styles.verse}>
          "If any of you lacks wisdom, you should ask God, who gives generously to all
          without finding fault, and it will be given to you." - James 1:5 (NIV)
        </Text>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  description: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 24,
  },
  button: {
    borderRadius: 8,
    marginVertical: 5,
    backgroundColor: '#6200ee',
    paddingVertical: 12,
  },
  secondaryButton: {
    backgroundColor: '#03dac6',
  },
  verse: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    marginVertical: 10,
    lineHeight: 24,
  },
});

export default HomeScreen; 