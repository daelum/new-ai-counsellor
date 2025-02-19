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
import { formatDistance } from 'date-fns';

const PrayerBoardScreen = () => {
  const { user } = useUser();
  const [prayerRequests, setPrayerRequests] = useState<Prayer[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPrayer, setNewPrayer] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrayers();
  }, []);

  const loadPrayers = async () => {
    try {
      console.log('Loading prayers...');
      setError(null);
      const prayers = await FirebaseService.getAllPrayers();
      console.log('Prayers loaded:', prayers.length);
      setPrayerRequests(prayers);
    } catch (error) {
      console.error('Error loading prayers:', error);
      setError('Failed to load prayers. Please try again later.');
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
      const prayer: Omit<Prayer, 'id' | 'expiresAt'> = {
        userId: user.id,
        username: user.username,
        content: newPrayer,
        timestamp: Date.now(),
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

  const handleDeletePrayer = async (prayerId: string) => {
    if (!user) return;

    try {
      Alert.alert(
        'Delete Prayer',
        'Are you sure you want to delete this prayer request?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setIsLoading(true);
              await FirebaseService.deletePrayer(prayerId, user.id);
              await loadPrayers();
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error deleting prayer:', error);
      Alert.alert('Error', 'Failed to delete prayer. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatExpirationTime = (expiresAt: any) => {
    if (!expiresAt || !expiresAt.toDate) {
      return 'Expires soon';
    }
    try {
      const expirationDate = expiresAt.toDate();
      return `Expires ${formatDistance(expirationDate, new Date(), { addSuffix: true })}`;
    } catch (error) {
      return 'Expires soon';
    }
  };

  const renderPrayer = (request: Prayer) => (
    <View key={request.id} style={styles.prayerCard}>
      <View style={styles.prayerHeader}>
        <Text style={styles.username}>{request.username}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.timestamp}>
            {new Date(request.timestamp).toLocaleDateString()}
          </Text>
          {request.userId === user?.id && (
            <TouchableOpacity
              onPress={() => handleDeletePrayer(request.id)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={20} color="#dc3545" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={styles.prayerContent}>{request.content}</Text>
      <View style={styles.prayerFooter}>
        <Text style={styles.userName}>{request.username}</Text>
        <Text style={styles.expiresIn}>{formatExpirationTime(request.expiresAt)}</Text>
      </View>
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
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10a37f" />
        <Text style={styles.loadingText}>Loading prayers...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button
          title="Try Again"
          onPress={loadPrayers}
          containerStyle={styles.retryButton}
        />
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

        {prayerRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No prayer requests yet.</Text>
            <Text style={styles.emptySubtext}>Be the first to share a prayer request!</Text>
          </View>
        ) : (
          prayerRequests.map(renderPrayer)
        )}
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
            <Text style={styles.expirationNotice}>
              Your prayer request will be visible for one week. Feel free to repost it if you'd like continued prayers.
            </Text>
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
  expirationNotice: {
    color: '#666980',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  prayerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  userName: {
    color: '#666980',
    fontSize: 12,
  },
  expiresIn: {
    color: '#666980',
    fontSize: 12,
    fontStyle: 'italic',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#343541',
    padding: 20,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    width: 200,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#666980',
    fontSize: 14,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteButton: {
    padding: 5,
  },
});

export default PrayerBoardScreen; 