import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Text } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AIService from '../services/AIService';

interface DevotionalHistoryItem {
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
  savedAt: string;
}

const DevotionalHistoryScreen = () => {
  const [history, setHistory] = useState<DevotionalHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();
  const aiService = AIService.getInstance();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const devotionalHistory = await aiService.getDevotionalHistory();
      setHistory(devotionalHistory);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderHistoryItem = ({ item }: { item: DevotionalHistoryItem }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => {
        // Navigate to detail view with the devotional data
      }}
    >
      <View style={styles.historyItemHeader}>
        <Text style={styles.historyItemDate}>{item.date}</Text>
        {item.isPersonalized && (
          <View style={styles.personalizedBadge}>
            <Ionicons name="heart" size={12} color="#ffffff" />
            <Text style={styles.personalizedText}>Personalized</Text>
          </View>
        )}
      </View>
      <Text style={styles.historyItemTitle}>{item.title}</Text>
      <Text style={styles.historyItemVerse}>{item.verse.reference}</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10a37f" />
          <Text style={styles.loadingText}>Loading devotional history...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        renderItem={renderHistoryItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={48} color="#666980" />
            <Text style={styles.emptyText}>No devotional history yet</Text>
            <Text style={styles.emptySubtext}>
              Your daily devotionals will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#343541',
  },
  listContent: {
    padding: 15,
  },
  historyItem: {
    backgroundColor: '#444654',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyItemDate: {
    color: '#666980',
    fontSize: 14,
  },
  historyItemTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  historyItemVerse: {
    color: '#10a37f',
    fontSize: 14,
    fontStyle: 'italic',
  },
  personalizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10a37f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  personalizedText: {
    color: '#ffffff',
    fontSize: 12,
    marginLeft: 4,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666980',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default DevotionalHistoryScreen; 