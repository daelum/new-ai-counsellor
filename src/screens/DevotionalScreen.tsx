import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Share } from 'react-native';
import { Text } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import AIService from '../services/AIService';

type RootStackParamList = {
  Home: undefined;
  Counseling: undefined;
  Bible: undefined;
  Devotional: undefined;
  Profile: undefined;
};

type NavigationProp = BottomTabNavigationProp<RootStackParamList>;

interface Devotional {
  id: string;
  date: string;
  title: string;
  verse: {
    text: string;
    reference: string;
  };
  message: string;
  prayer: string;
  isPersonalized: boolean;
}

const DevotionalScreen = () => {
  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const aiService = AIService.getInstance();
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    loadDailyDevotional();
  }, []);

  const loadDailyDevotional = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const todaysDevotional = await aiService.getPersonalizedDevotional();
      setDevotional(todaysDevotional);
    } catch (err) {
      console.error('Error loading devotional:', err);
      setError('Unable to load today\'s devotional. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await aiService.refreshDevotional();
      await loadDailyDevotional();
    } catch (err) {
      console.error('Error refreshing devotional:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleShare = async () => {
    if (!devotional) return;

    try {
      const shareContent = `${devotional.title}\n\n${devotional.verse.text}\n- ${devotional.verse.reference}\n\nToday's Message:\n${devotional.message}\n\nPrayer:\n${devotional.prayer}\n\nShared from Solomon AI`;

      await Share.share({
        message: shareContent,
        title: 'Daily Devotional'
      });
    } catch (error) {
      console.error('Error sharing devotional:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10a37f" />
          <Text style={styles.loadingText}>Loading today's devotional...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color="#ff4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadDailyDevotional}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text h3 style={styles.title}>Daily Devotional</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  (isRefreshing || isLoading) && styles.iconButtonDisabled
                ]}
                onPress={handleRefresh}
                disabled={isRefreshing || isLoading}
              >
                <Ionicons 
                  name="refresh" 
                  size={24} 
                  color={isRefreshing || isLoading ? "#666980" : "#10a37f"} 
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleShare}
                disabled={!devotional}
              >
                <Ionicons 
                  name="share-outline" 
                  size={24} 
                  color="#10a37f" 
                />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.date}>{devotional?.date}</Text>
          {devotional?.isPersonalized && (
            <View style={styles.personalizedBadge}>
              <Ionicons name="heart" size={16} color="#ffffff" />
              <Text style={styles.personalizedText}>Personalized for You</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{devotional?.title}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.verseContainer}>
              <Text style={styles.verseText}>{devotional?.verse.text}</Text>
              <Text style={styles.verseReference}>{devotional?.verse.reference}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Message</Text>
            <Text style={styles.messageText}>{devotional?.message}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prayer</Text>
            <Text style={styles.prayerText}>{devotional?.prayer}</Text>
          </View>

          {!devotional?.isPersonalized && (
            <TouchableOpacity
              style={styles.counselingPrompt}
              onPress={() => navigation.navigate('Counseling')}
            >
              <Ionicons name="chatbubbles-outline" size={24} color="#10a37f" />
              <View style={styles.counselingPromptTextContainer}>
                <Text style={styles.counselingPromptTitle}>Want a personalized devotional?</Text>
                <Text style={styles.counselingPromptDescription}>
                  Start a conversation with Solomon to receive devotionals tailored to your journey.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#10a37f" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#343541',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: '#202123',
    borderBottomWidth: 1,
    borderBottomColor: '#444654',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#ffffff',
    marginBottom: 8,
  },
  date: {
    color: '#666980',
    fontSize: 16,
  },
  content: {
    padding: 15,
  },
  section: {
    backgroundColor: '#444654',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10a37f',
    marginBottom: 12,
  },
  verseContainer: {
    marginBottom: 8,
  },
  verseText: {
    fontSize: 18,
    color: '#ffffff',
    lineHeight: 26,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  verseReference: {
    fontSize: 16,
    color: '#10a37f',
  },
  messageText: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
  },
  prayerText: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#10a37f',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  personalizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10a37f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  personalizedText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  counselingPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444654',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  counselingPromptTextContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  counselingPromptTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  counselingPromptDescription: {
    color: '#666980',
    fontSize: 14,
    lineHeight: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
});

export default DevotionalScreen; 