import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, SearchBar, Card, Button } from '@rneui/themed';

const BibleScreen = () => {
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!search.trim()) return;
    
    setIsLoading(true);
    // TODO: Implement Bible API integration
    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <SearchBar
        placeholder="Search Bible verses..."
        onChangeText={setSearch}
        value={search}
        platform="default"
        containerStyle={styles.searchContainer}
        inputContainerStyle={styles.searchInputContainer}
      />
      
      <Button
        title="Search"
        onPress={handleSearch}
        loading={isLoading}
        disabled={!search.trim() || isLoading}
        buttonStyle={styles.searchButton}
        containerStyle={styles.searchButtonContainer}
      />

      <ScrollView style={styles.resultsContainer}>
        {searchResults.length === 0 ? (
          <Card containerStyle={styles.welcomeCard}>
            <Text style={styles.welcomeText}>
              Search for Bible verses by keywords, book names, or specific references.
              Example: "love", "John 3:16", or "wisdom"
            </Text>
            
            <Card.Divider style={styles.divider} />
            
            <Text style={styles.featuredTitle}>Featured Verse</Text>
            <Text style={styles.verse}>
              "For God so loved the world that he gave his one and only Son, 
              that whoever believes in him shall not perish but have eternal life."
            </Text>
            <Text style={styles.reference}>- John 3:16 (NIV)</Text>
          </Card>
        ) : (
          searchResults.map((result, index) => (
            <Card key={index} containerStyle={styles.resultCard}>
              <Text style={styles.verse}>{result.text}</Text>
              <Text style={styles.reference}>{result.reference}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  searchInputContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  searchButton: {
    backgroundColor: '#6200ee',
    borderRadius: 10,
    paddingVertical: 12,
  },
  searchButtonContainer: {
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  resultsContainer: {
    flex: 1,
    padding: 10,
  },
  welcomeCard: {
    borderRadius: 15,
    padding: 15,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 24,
  },
  divider: {
    marginVertical: 15,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  resultCard: {
    borderRadius: 10,
    marginBottom: 10,
  },
  verse: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 8,
  },
  reference: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    fontStyle: 'italic',
  },
});

export default BibleScreen; 