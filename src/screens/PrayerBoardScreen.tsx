import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Text, Button } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';

// Temporary type for prayer requests until we set up the backend
type PrayerRequest = {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  prayerCount: number;
  hasPrayed: boolean;
};

const PrayerBoardScreen = () => {
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPrayer, setNewPrayer] = useState('');

  // Temporary mock data - replace with actual API calls later
  useEffect(() => {
    setPrayerRequests([
      {
        id: '1',
        userId: 'user1',
        username: 'John Doe',
        content: 'Please pray for my upcoming surgery next week.',
        timestamp: new Date(),
        prayerCount: 5,
        hasPrayed: false,
      },
      {
        id: '2',
        userId: 'user2',
        username: 'Jane Smith',
        content: 'Seeking prayers for my family as we go through a difficult time.',
        timestamp: new Date(),
        prayerCount: 3,
        hasPrayed: false,
      },
    ]);
  }, []);

  const handleAddPrayer = () => {
    if (newPrayer.trim() === '') {
      Alert.alert('Error', 'Please enter your prayer request');
      return;
    }

    const newRequest: PrayerRequest = {
      id: Date.now().toString(),
      userId: 'currentUser', // Replace with actual user ID
      username: 'Current User', // Replace with actual username
      content: newPrayer,
      timestamp: new Date(),
      prayerCount: 0,
      hasPrayed: false,
    };

    setPrayerRequests([newRequest, ...prayerRequests]);
    setNewPrayer('');
    setModalVisible(false);
  };

  const handlePrayerReaction = (id: string) => {
    setPrayerRequests(
      prayerRequests.map((request) =>
        request.id === id
          ? {
              ...request,
              prayerCount: request.hasPrayed ? request.prayerCount - 1 : request.prayerCount + 1,
              hasPrayed: !request.hasPrayed,
            }
          : request
      )
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <Text h4 style={styles.title}>Prayer Board</Text>
          <Text style={styles.subtitle}>Share and pray for others in the community</Text>
        </View>

        {prayerRequests.map((request) => (
          <View key={request.id} style={styles.prayerCard}>
            <View style={styles.prayerHeader}>
              <Text style={styles.username}>{request.username}</Text>
              <Text style={styles.timestamp}>
                {new Date(request.timestamp).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.prayerContent}>{request.content}</Text>
            <TouchableOpacity
              style={[
                styles.prayButton,
                request.hasPrayed && styles.prayButtonActive,
              ]}
              onPress={() => handlePrayerReaction(request.id)}
            >
              <Ionicons
                name="hand-right"
                size={20}
                color={request.hasPrayed ? '#10a37f' : '#666980'}
              />
              <Text
                style={[
                  styles.prayButtonText,
                  request.hasPrayed && styles.prayButtonTextActive,
                ]}
              >
                🙏 {request.prayerCount} Praying
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={24} color="#ffffff" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Share Your Prayer Request</Text>
            <TextInput
              style={styles.input}
              placeholder="What would you like prayer for?"
              placeholderTextColor="#666980"
              multiline
              value={newPrayer}
              onChangeText={setNewPrayer}
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                type="outline"
                onPress={() => setModalVisible(false)}
                containerStyle={styles.modalButton}
              />
              <Button
                title="Share"
                onPress={handleAddPrayer}
                containerStyle={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#343541',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 30,
    alignItems: 'center',
  },
  title: {
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666980',
    textAlign: 'center',
  },
  prayerCard: {
    backgroundColor: '#444654',
    margin: 15,
    padding: 20,
    borderRadius: 12,
  },
  prayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  username: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  timestamp: {
    color: '#666980',
    fontSize: 12,
  },
  prayerContent: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 15,
  },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 163, 127, 0.1)',
    padding: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  prayButtonActive: {
    backgroundColor: 'rgba(16, 163, 127, 0.2)',
  },
  prayButtonText: {
    color: '#666980',
    marginLeft: 5,
  },
  prayButtonTextActive: {
    color: '#10a37f',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10a37f',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#444654',
    width: '90%',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#343541',
    borderRadius: 8,
    padding: 15,
    color: '#ffffff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
  },
});

export default PrayerBoardScreen; 