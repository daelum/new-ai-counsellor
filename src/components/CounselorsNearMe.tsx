import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Alert, PermissionsAndroid, ScrollView, Image, Linking, Dimensions } from 'react-native';
import { Text } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import Geolocation from 'react-native-geolocation-service';
import Config from 'react-native-config';

interface Counselor {
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

const CounselorsNearMe = () => {
  const [showInitialScreen, setShowInitialScreen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);

  useEffect(() => {
    console.log('Current state:', {
      showInitialScreen,
      loading,
      counselorsCount: counselors.length
    });
  }, [showInitialScreen, loading, counselors]);

  const fetchNearbyCounselors = async (latitude: number, longitude: number) => {
    try {
      const keywords = encodeURIComponent('christian counselor therapist');
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=5000&type=health&keyword=${keywords}&key=${Config.GOOGLE_PLACES_API_KEY}`
      );
      
      const data = await response.json();
      console.log('Places API response:', data);

      if (data.status === 'OK') {
        const counselorList = data.results.map((place: any) => {
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
        
        counselorList.sort((a: Counselor, b: Counselor) => 
          parseFloat(a.distance) - parseFloat(b.distance)
        );
        
        console.log('Processed counselors:', counselorList);
        setCounselors(counselorList);
        setShowInitialScreen(false);
      } else {
        console.error('Places API error:', data.status);
        Alert.alert(
          'Error',
          'Unable to fetch nearby counselors. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert(
        'Error',
        'Unable to fetch nearby counselors. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
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
          message: 'Solomon needs access to your location to find counselors near you.',
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
    setLoading(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please enable location services to find counselors near you.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      Geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            setUserLocation({ latitude, longitude });
            await fetchNearbyCounselors(latitude, longitude);
          } catch (error) {
            console.error('Error in location callback:', error);
            Alert.alert(
              'Error',
              'Unable to fetch counselors. Please try again.',
              [{ text: 'OK' }]
            );
            setLoading(false);
            setShowInitialScreen(true);
          }
        },
        (error) => {
          console.error('Location error:', error);
          Alert.alert(
            'Location Error',
            'Unable to get your location. Please try again.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          setShowInitialScreen(true);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000
        }
      );
    } catch (error) {
      console.error('Error:', error);
      Alert.alert(
        'Error',
        'Unable to get your location. Please try again.',
        [{ text: 'OK' }]
      );
      setLoading(false);
      setShowInitialScreen(true);
    }
  };

  const openMaps = (counselor: Counselor) => {
    const query = encodeURIComponent(counselor.address);
    const url = Platform.select({
      ios: `maps://maps.apple.com/?q=${query}`,
      android: `geo:0,0?q=${query}`,
    });
    if (url) {
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Christian Counselors Near Me</Text>
        <View style={styles.enableLocationContainer}>
          <Text style={styles.subtitle}>Finding Christian counselors near you...</Text>
        </View>
      </View>
    );
  }

  if (showInitialScreen) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Christian Counselors Near Me</Text>
        <View style={styles.enableLocationContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="people" size={48} color="#10a37f" />
          </View>
          <Text style={styles.subtitle}>
            Find Christian counselors and therapists in your area.
          </Text>
          <TouchableOpacity
            style={styles.enableButton}
            onPress={handleEnableLocation}
            disabled={loading}
          >
            <Ionicons name="navigate" size={24} color="#ffffff" />
            <Text style={styles.enableButtonText}>
              {loading ? 'Finding Counselors...' : 'Enable Location'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Christian Counselors Near Me</Text>
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.counselorList}
      >
        {counselors.map((counselor) => (
          <TouchableOpacity
            key={counselor.id}
            style={[styles.counselorCard, { width: CARD_WIDTH }]}
            onPress={() => openMaps(counselor)}
          >
            <View style={styles.counselorInfo}>
              <View style={styles.counselorHeader}>
                <Text style={styles.counselorName} numberOfLines={1}>
                  {counselor.name}
                </Text>
                <Text style={styles.distance}>
                  {counselor.distance}
                </Text>
              </View>
              <Text style={styles.address} numberOfLines={2}>
                {counselor.address}
              </Text>
              {counselor.rating !== undefined && (
                <Text style={styles.rating}>
                  Rating: {counselor.rating} ★
                </Text>
              )}
              {counselor.isOpen !== undefined && (
                <Text style={[styles.status, { color: counselor.isOpen ? '#10a37f' : '#ff6b6b' }]}>
                  {counselor.isOpen ? 'Open Now' : 'Closed'}
                </Text>
              )}
            </View>
            <View style={styles.directionsButton}>
              <Ionicons name="navigate" size={24} color="#10a37f" />
              <Text style={styles.directionsText}>Get Directions</Text>
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
  counselorList: {
    flexGrow: 0,
  },
  counselorCard: {
    backgroundColor: '#444654',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: CARD_MARGIN,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  counselorInfo: {
    flex: 1,
  },
  counselorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  counselorName: {
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
  directionsText: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 8,
  },
});

export default CounselorsNearMe; 