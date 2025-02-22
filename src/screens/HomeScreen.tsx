import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Button } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

type RootStackParamList = {
  HomeScreen: undefined;
  PrayerBoard: undefined;
};

type TabParamList = {
  Home: undefined;
  Counseling: undefined;
  Bible: undefined;
  Devotional: undefined;
  DeepThought: undefined;
  Profile: undefined;
};

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<TabParamList>
>;

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.welcomeContainer}>
          <View style={styles.welcomeTextContainer}>
            <Text h2 style={styles.welcomeTitle}>Welcome to</Text>
            <Text h1 style={styles.solomonTitle}>Solomon AI</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.welcomeSubtitle}>
          Your Christian faith-based counselor inspired by King Solomon, powered by AI.
          </Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('Counseling')}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="chatbubbles" size={24} color="#10a37f" />
          </View>
          <Text style={styles.actionTitle}>Start Counseling</Text>
          <Text style={styles.actionDescription}>
            Begin a conversation with Solomon for guidance and support
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('Bible')}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="book" size={24} color="#10a37f" />
          </View>
          <Text style={styles.actionTitle}>Explore Scripture</Text>
          <Text style={styles.actionDescription}>
            Search and study Bible verses for inspiration
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('Devotional')}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="heart" size={24} color="#10a37f" />
          </View>
          <Text style={styles.actionTitle}>Daily Devotional</Text>
          <Text style={styles.actionDescription}>
            Start your day with spiritual reflection and prayer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('DeepThought')}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="bulb" size={24} color="#10a37f" />
          </View>
          <Text style={styles.actionTitle}>Deep Thought</Text>
          <Text style={styles.actionDescription}>
            Explore profound questions about faith, existence, and purpose
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('PrayerBoard')}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="people" size={24} color="#10a37f" />
          </View>
          <Text style={styles.actionTitle}>Prayer Board</Text>
          <Text style={styles.actionDescription}>
            Share prayer requests and pray for others in the community
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quoteContainer}>
        <Text style={styles.quoteTitle}>Daily Wisdom</Text>
        <Text style={styles.quoteText}>
          "If any of you lacks wisdom, you should ask God, who gives generously to all
          without finding fault, and it will be given to you."
        </Text>
        <Text style={styles.quoteReference}>James 1:5 (NIV)</Text>
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Features</Text>
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Ionicons name="heart" size={20} color="#10a37f" />
            <Text style={styles.featureText}>AI-Powered Biblical Counseling</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="book" size={20} color="#10a37f" />
            <Text style={styles.featureText}>Scripture Search & Study</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="mic" size={20} color="#10a37f" />
            <Text style={styles.featureText}>Voice Interaction & Response</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="calendar" size={20} color="#10a37f" />
            <Text style={styles.featureText}>Personalized Daily Devotionals</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="bulb" size={20} color="#10a37f" />
            <Text style={styles.featureText}>Deep Theological Insights</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="people" size={20} color="#10a37f" />
            <Text style={styles.featureText}>Community Prayer Board</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="shield" size={20} color="#10a37f" />
            <Text style={styles.featureText}>Private & Secure Conversations</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="infinite" size={20} color="#10a37f" />
            <Text style={styles.featureText}>Available 24/7</Text>
          </View>
        </View>
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
    paddingTop: 45,
    paddingBottom: 25,
    backgroundColor: '#3a3b47',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  welcomeContainer: {
    paddingHorizontal: 25,
  },
  welcomeTextContainer: {
    marginBottom: 10,
  },
  welcomeTitle: {
    color: '#10a37f',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 2,
  },
  solomonTitle: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  divider: {
    height: 2,
    width: 50,
    backgroundColor: '#10a37f',
    marginVertical: 12,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#9999a5',
    lineHeight: 22,
    marginTop: 3,
  },
  actionsContainer: {
    padding: 15,
  },
  actionCard: {
    backgroundColor: '#444654',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 163, 127, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666980',
    lineHeight: 20,
  },
  quoteContainer: {
    backgroundColor: '#444654',
    margin: 15,
    padding: 20,
    borderRadius: 12,
  },
  quoteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  quoteText: {
    fontSize: 16,
    color: '#ffffff',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  quoteReference: {
    fontSize: 14,
    color: '#10a37f',
    textAlign: 'center',
  },
  featuresContainer: {
    padding: 15,
    paddingTop: 5,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  featuresList: {
    backgroundColor: '#444654',
    borderRadius: 12,
    padding: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#343541',
  },
  featureText: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 12,
  },
});

export default HomeScreen; 