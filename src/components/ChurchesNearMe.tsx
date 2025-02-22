import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Alert, PermissionsAndroid, ScrollView, Image, Linking, Dimensions } from 'react-native';
import { Text } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import Geolocation from 'react-native-geolocation-service';
import Config from 'react-native-config';

interface Church {
  id: string;
  name: string;
  distance: string;
  address: string;
  rating?: number;
  isOpen?: boolean;
}

const CARD_WIDTH = Dimensions.get('window').width * 0.7; // 70% of screen width
const CARD_MARGIN = 8;

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const ChurchesNearMe = () => {
  const [showInitialScreen, setShowInitialScreen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [churches, setChurches] = useState<Church[]>([]);
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);

  useEffect(() => {
    console.log('Current state:', {
      showInitialScreen,
      loading,
      churchesCount: churches.length
    });
  }, [showInitialScreen, loading, churches]);

  const fetchNearbyChurches = async (latitude: number, longitude: number) => {
    try {
      const keywords = encodeURIComponent('christian church');
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=5000&type=church&keyword=${keywords}&key=${Config.GOOGLE_PLACES_API_KEY}`
      );
      
      const data = await response.json();
      console.log('Places API response:', data);

      if (data.status === 'OK') {
        const churchList = data.results.map((place: any) => {
          const distance = calculateDistance(
            latitude,
            longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          );
          
          return {
            id: place.place_id,
            name: place.name,
            distance: `${distance.toFixed(1)} mi`,
            address: place.vicinity,
            rating: place.rating,
            isOpen: place.opening_hours?.open_now
          };
        });
        
        churchList.sort((a: Church, b: Church) => 
          parseFloat(a.distance) - parseFloat(b.distance)
        );
        
        console.log('Processed churches:', churchList);
        setChurches(churchList);
      } else {
        console.error('Places API error:', data.status);
        Alert.alert(
          'Error',
          'Unable to fetch nearby churches. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert(
        'Error',
        'Unable to fetch nearby churches. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      const auth = await Geolocation.requestAuthorization('whenInUse');
      return auth === 'granted';
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Solomon needs access to your location to find churches near you.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return false;
  };

  const handleEnableLocation = async () => {
    console.log('Starting location request...');
    setLoading(true);
    try {
      const hasPermission = await requestLocationPermission();
      console.log('Permission status:', hasPermission);
      
      if (!hasPermission) {
        Alert.alert(
          'Location Permission Denied',
          'Please enable location services to find churches near you.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      Geolocation.getCurrentPosition(
        async (position) => {
          console.log('Got position:', position);
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          await fetchNearbyChurches(latitude, longitude);
          setLoading(false);
          setShowInitialScreen(false);
        },
        (error) => {
          console.error('Location error:', error);
          Alert.alert(
            'Error',
            'Unable to get your location. Please try again.',
            [{ text: 'OK' }]
          );
          setLoading(false);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 10000,
          distanceFilter: 0,
          forceRequestLocation: true
        }
      );
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const openMaps = (church: Church) => {
    const query = encodeURIComponent(church.address);
    const url = Platform.select({
      ios: `maps://maps.apple.com/?q=${query}`,
      android: `geo:0,0?q=${query}`,
    });
    Linking.openURL(url!);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Churches Near Me</Text>
        <View style={styles.enableLocationContainer}>
          <Text style={styles.subtitle}>Finding Christian churches near you...</Text>
        </View>
      </View>
    );
  }

  if (showInitialScreen) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Churches Near Me</Text>
        <View style={styles.enableLocationContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="people" size={48} color="#10a37f" />
          </View>
          <Text style={styles.subtitle}>
            Find Christian churches in your area.
          </Text>
          <TouchableOpacity
            style={styles.enableButton}
            onPress={handleEnableLocation}
            disabled={loading}
          >
            <Ionicons name="navigate" size={24} color="#ffffff" />
            <Text style={styles.enableButtonText}>
              {loading ? 'Finding Churches...' : 'Enable Location'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Churches Near Me</Text>
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.churchList}
      >
        {churches.map((church) => (
          <TouchableOpacity
            key={church.id}
            style={[styles.churchCard, { width: CARD_WIDTH }]}
            onPress={() => openMaps(church)}
          >
            <View style={styles.churchInfo}>
              <View style={styles.churchHeader}>
                <Text style={styles.churchName} numberOfLines={1}>{church.name}</Text>
                <Text style={styles.distance}>{church.distance}</Text>
              </View>
              <Text style={styles.address} numberOfLines={2}>{church.address}</Text>
              {church.rating && (
                <Text style={styles.rating}>
                  Rating: {church.rating} ★
                </Text>
              )}
              {church.isOpen !== undefined && (
                <Text style={[styles.status, { color: church.isOpen ? '#10a37f' : '#ff6b6b' }]}>
                  {church.isOpen ? 'Open Now' : 'Closed'}
                </Text>
              )}
            </View>
            <View style={styles.directionsButton}>
              <Ionicons name="navigate" size={24} color="#10a37f" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
    paddingTop: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  enableLocationContainer: {
    backgroundColor: '#444654',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 15,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 163, 127, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10a37f',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
  },
  enableButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 7,
  },
  churchList: {
    flexGrow: 0,
  },
  churchCard: {
    backgroundColor: '#444654',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: CARD_MARGIN,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  churchInfo: {
    flex: 1,
  },
  churchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  churchName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  distance: {
    fontSize: 14,
    color: '#10a37f',
  },
  address: {
    fontSize: 14,
    color: '#666980',
    marginBottom: 8,
    lineHeight: 20,
  },
  rating: {
    fontSize: 14,
    color: '#ffd700',
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    marginBottom: 4,
  },
  directionsButton: {
    alignSelf: 'flex-end',
    padding: 8,
    marginTop: 8,
  },
});

export default ChurchesNearMe; 