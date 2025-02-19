import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ThemeProvider } from '@rneui/themed';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Import screens (we'll create these next)
import HomeScreen from './src/screens/HomeScreen';
import CounselingScreen from './src/screens/CounselingScreen';
import BibleScreen from './src/screens/BibleScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Tab.Navigator
            screenOptions={{
              headerStyle: {
                backgroundColor: '#f4f4f4',
              },
              headerTintColor: '#333',
              tabBarActiveTintColor: '#6200ee',
              tabBarInactiveTintColor: '#666',
            }}
          >
            <Tab.Screen 
              name="Home" 
              component={HomeScreen}
              options={{
                title: 'Solomon AI',
              }}
            />
            <Tab.Screen 
              name="Counseling" 
              component={CounselingScreen}
              options={{
                title: 'Get Counsel',
              }}
            />
            <Tab.Screen 
              name="Bible" 
              component={BibleScreen}
              options={{
                title: 'Bible',
              }}
            />
            <Tab.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{
                title: 'Profile',
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
