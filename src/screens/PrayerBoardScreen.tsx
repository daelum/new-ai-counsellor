import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, Button } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import FirebaseService, { Prayer } from '../services/FirebaseService';
import { useUser } from '../contexts/UserContext';

const PrayerBoardScreen = () => {
  const { user } = useUser();
  const [prayerRequests, setPrayerRequests] = useState<Prayer[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPrayer, setNewPrayer] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPrayers();
  }, []);

  const loadPrayers = async () => {
    try {
      const prayers = await FirebaseService.getAllPrayers();
      setPrayerRequests(prayers);
    } catch (error) {
      console.error('Error loading prayers:', error);
      Alert.alert('Error', 'Failed to load prayers. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPrayer = async () => {
    if (!user) return;
    
    if (newPrayer.trim() === '') {
      Alert.alert('Error', 'Please enter your prayer request');
      return;
    }

    try {
      setIsLoading(true);
      const prayer: Omit<Prayer, 'id'> = {
        userId: user.id,
        username: user.username,
        content: newPrayer,
        timestamp: new Date(),
        prayerCount: 0,
        prayedBy: [],
      };

      await FirebaseService.addPrayer(prayer);
      await loadPrayers();
      setNewPrayer('');
      setModalVisible(false);
    } catch (error) {
      console.error('Error adding prayer:', error);
      Alert.alert('Error', 'Failed to add prayer. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrayerReaction = async (id: string) => {
    if (!user) return;

    try {
      const prayer = prayerRequests.find(p => p.id === id);
      if (!prayer) return;

      const hasPrayed = prayer.prayedBy.includes(user.id);
      
      await FirebaseService.updatePrayerCount(id, user.id, !hasPrayed);
      await loadPrayers();
    } catch (error) {
      console.error('Error updating prayer reaction:', error);
      Alert.alert('Error', 'Failed to update prayer reaction. Please try again later.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10a37f" />
      </View>
    );
  }

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
                request.prayedBy.includes(user?.id || '') && styles.prayButtonActive,
              ]}
              onPress={() => handlePrayerReaction(request.id)}
            >
              <Ionicons
                name="hand-right"
                size={20}
                color={request.prayedBy.includes(user?.id || '') ? '#10a37f' : '#666980'}
              />
              <Text
                style={[
                  styles.prayButtonText,
                  request.prayedBy.includes(user?.id || '') && styles.prayButtonTextActive,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#343541',
  },
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