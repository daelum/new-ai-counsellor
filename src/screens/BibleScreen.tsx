import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Platform } from 'react-native';
import { Text, SearchBar } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import AIService from '../services/AIService';

interface BibleVerse {
  verse: string;
  reference: string;
}

interface DetailedVerse {
  verse: string;
  reference: string;
  meaning: string;
  application: string;
}

const PLACEHOLDER_TOPICS = [
  'love and compassion',
  'faith and trust',
  'hope in difficult times',
  'wisdom and guidance',
  'peace and comfort',
  'forgiveness and mercy',
  'strength and courage',
  'joy and happiness',
  'patience and perseverance',
  'gratitude and thanksgiving',
  'healing and restoration',
  'purpose and destiny',
  'prayer and meditation',
  'friendship and relationships',
  'success and prosperity'
];

const BibleScreen = () => {
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<BibleVerse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [selectedVerse, setSelectedVerse] = useState<DetailedVerse | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const aiService = AIService.getInstance();

  useEffect(() => {
    // Randomly select 3 unique topics for placeholders
    const shuffled = [...PLACEHOLDER_TOPICS].sort(() => 0.5 - Math.random());
    setPlaceholders(shuffled.slice(0, 3));
  }, []);

  const handleSearch = async (searchTerm: string = search) => {
    if (!searchTerm.trim()) return;
    
    console.log('Starting search for:', searchTerm.trim());
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Calling AIService.searchBibleVerses');
      const results = await aiService.searchBibleVerses(searchTerm.trim());
      console.log('Search results:', results);
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      setError('Unable to find verses at this time. Please try again.');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVersePress = async (verse: BibleVerse) => {
    setIsLoading(true);
    setSelectedVerse({
      verse: verse.verse,
      reference: verse.reference,
      meaning: "Loading analysis...",
      application: "Loading application..."
    });
    setIsDetailModalVisible(true);

    try {
      const analysis = await aiService.analyzeBibleVerse(verse.verse);
      setSelectedVerse({
        verse: verse.verse,
        reference: verse.reference,
        meaning: analysis.meaning,
        application: analysis.application
      });
    } catch (error) {
      console.error('Error analyzing verse:', error);
      setSelectedVerse({
        verse: verse.verse,
        reference: verse.reference,
        meaning: "Unable to load verse analysis at this time. Please try again.",
        application: "Unable to load application insights at this time. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderDetailModal = () => (
    <Modal
      visible={isDetailModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsDetailModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setIsDetailModalVisible(false)}
            >
              <Ionicons name="chevron-back" size={24} color="#10a37f" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsDetailModalVisible(false)}
            >
              <Ionicons name="close-circle" size={28} color="#10a37f" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10a37f" />
                <Text style={styles.loadingText}>Loading verse analysis...</Text>
              </View>
            ) : (
              <>
                <View style={styles.verseSection}>
                  <Text style={styles.sectionTitle}>Verse</Text>
                  <Text style={styles.verseText}>{selectedVerse?.verse}</Text>
                  <Text style={styles.referenceText}>{selectedVerse?.reference}</Text>
                </View>
                
                <View style={styles.meaningSection}>
                  <Text style={styles.sectionTitle}>Meaning</Text>
                  <Text style={styles.meaningText}>{selectedVerse?.meaning}</Text>
                </View>
                
                <View style={styles.applicationSection}>
                  <Text style={styles.sectionTitle}>Life Application</Text>
                  <Text style={styles.applicationText}>{selectedVerse?.application}</Text>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderSearchResults = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10a37f" />
          <Text style={styles.loadingText}>Searching for verses...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color="#ff4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }

    if (searchResults.length === 0 && search.trim()) {
      return (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No verses found for your search.</Text>
        </View>
      );
    }

    return searchResults.map((result, index) => (
      <TouchableOpacity
        key={index}
        style={styles.resultCard}
        onPress={() => handleVersePress(result)}
      >
        <Text style={styles.verseText}>{result.verse}</Text>
        <Text style={styles.referenceText}>{result.reference}</Text>
      </TouchableOpacity>
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder="Search Bible verses..."
          onChangeText={setSearch}
          value={search}
          platform="default"
          containerStyle={styles.searchBarContainer}
          inputContainerStyle={styles.searchBarInputContainer}
          inputStyle={styles.searchBarInput}
          placeholderTextColor="#666980"
          onSubmitEditing={() => handleSearch()}
        />
        <TouchableOpacity
          style={[
            styles.searchButton,
            (!search.trim() || isLoading) && styles.searchButtonDisabled
          ]}
          onPress={() => handleSearch()}
          disabled={!search.trim() || isLoading}
        >
          <Ionicons 
            name="search" 
            size={24} 
            color={!search.trim() || isLoading ? "#666980" : "#10a37f"} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.resultsContainer}
        contentContainerStyle={styles.resultsContent}
      >
        {searchResults.length === 0 && !search.trim() && !isLoading ? (
          <View style={styles.welcomeContainer}>
            <Ionicons name="book-outline" size={48} color="#10a37f" />
            <Text style={styles.welcomeTitle}>Bible Verse Search</Text>
            <Text style={styles.welcomeText}>
              Search for Bible verses by keywords, themes, or references.
              Tap any suggestion to explore:
            </Text>
            <View style={styles.exampleContainer}>
              {placeholders.map((topic, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.exampleButton}
                  onPress={() => {
                    setSearch(topic);
                    handleSearch(topic);
                  }}
                >
                  <Text style={styles.exampleText}>{topic}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          renderSearchResults()
        )}
      </ScrollView>
      {renderDetailModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#343541',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#202123',
    borderBottomWidth: 1,
    borderBottomColor: '#444654',
  },
  searchBarContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
    padding: 0,
    marginVertical: 0,
  },
  searchBarInputContainer: {
    backgroundColor: '#343541',
    borderRadius: 8,
    height: 40,
  },
  searchBarInput: {
    color: '#ffffff',
  },
  searchButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    padding: 15,
  },
  welcomeContainer: {
    alignItems: 'center',
    padding: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666980',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  exampleContainer: {
    width: '100%',
  },
  exampleButton: {
    backgroundColor: '#444654',
    padding: 12,
    borderRadius: 8,
    marginVertical: 5,
  },
  exampleText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 16,
  },
  resultCard: {
    backgroundColor: '#444654',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  verseText: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
    marginBottom: 8,
  },
  referenceText: {
    fontSize: 14,
    color: '#10a37f',
    fontStyle: 'italic',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 10,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  errorText: {
    color: '#ff4444',
    marginLeft: 10,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#666980',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#343541',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#343541',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#444654',
    backgroundColor: '#202123',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backButtonText: {
    color: '#10a37f',
    fontSize: 17,
    fontWeight: '500',
    marginLeft: 4,
  },
  closeButton: {
    padding: 8,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  verseSection: {
    marginBottom: 24,
    backgroundColor: '#444654',
    padding: 16,
    borderRadius: 12,
  },
  meaningSection: {
    marginBottom: 24,
    backgroundColor: '#444654',
    padding: 16,
    borderRadius: 12,
  },
  applicationSection: {
    marginBottom: 24,
    backgroundColor: '#444654',
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10a37f',
    marginBottom: 12,
  },
  meaningText: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
  },
  applicationText: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
  },
});

export default BibleScreen; 