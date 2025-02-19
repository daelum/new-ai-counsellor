import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, SearchBar } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import AIService from '../services/AIService';

interface BibleVerse {
  verse: string;
  reference: string;
}

const BibleScreen = () => {
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<BibleVerse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const aiService = AIService.getInstance();

  const handleSearch = async () => {
    if (!search.trim()) return;
    
    console.log('Starting search for:', search.trim());
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Calling AIService.searchBibleVerses');
      const results = await aiService.searchBibleVerses(search.trim());
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

  const renderSearchResults = () => {
    console.log('Rendering search results:', { 
      isLoading, 
      error, 
      resultsLength: searchResults.length,
      searchTerm: search.trim()
    });

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
      <View key={index} style={styles.resultCard}>
        <Text style={styles.verseText}>{result.verse}</Text>
        <Text style={styles.referenceText}>{result.reference}</Text>
      </View>
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
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          style={[
            styles.searchButton,
            (!search.trim() || isLoading) && styles.searchButtonDisabled
          ]}
          onPress={handleSearch}
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
              Examples:
            </Text>
            <View style={styles.exampleContainer}>
              <TouchableOpacity 
                style={styles.exampleButton}
                onPress={() => {
                  setSearch('love your neighbor');
                  handleSearch();
                }}
              >
                <Text style={styles.exampleText}>love your neighbor</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.exampleButton}
                onPress={() => {
                  setSearch('peace in difficult times');
                  handleSearch();
                }}
              >
                <Text style={styles.exampleText}>peace in difficult times</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.exampleButton}
                onPress={() => {
                  setSearch('wisdom and guidance');
                  handleSearch();
                }}
              >
                <Text style={styles.exampleText}>wisdom and guidance</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          renderSearchResults()
        )}
      </ScrollView>
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
    textAlign: 'right',
    fontStyle: 'italic',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666980',
    marginTop: 10,
    fontSize: 16,
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
    fontSize: 16,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#666980',
    fontSize: 16,
  },
});

export default BibleScreen; 