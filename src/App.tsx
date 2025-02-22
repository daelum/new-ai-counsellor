import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import NotificationService from './services/NotificationService';
import HomeScreen from './screens/HomeScreen';
import CounselingScreen from './screens/CounselingScreen';
import BibleScreen from './screens/BibleScreen';
import BibleReaderScreen from './screens/BibleReaderScreen';
import DevotionalScreen from './screens/DevotionalScreen';
import ProfileScreen from './screens/ProfileScreen';
import { RootStackParamList, TabParamList } from './types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Counseling') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Bible') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Devotional') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#10a37f',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#343541',
        },
        headerTintColor: '#ffffff',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Counseling" component={CounselingScreen} />
      <Tab.Screen name="Bible" component={BibleScreen} />
      <Tab.Screen name="Devotional" component={DevotionalScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const notificationService = NotificationService.getInstance();
        await notificationService.initialize();
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initializeNotifications();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#343541',
          },
          headerTintColor: '#ffffff',
          headerBackTitle: 'Back',
          gestureEnabled: true,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BibleReader"
          component={BibleReaderScreen}
          options={{
            title: 'Bible Reader',
            headerShown: true,
            animation: 'slide_from_right'
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
} 