import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider, createTheme } from '@rneui/themed';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import CounselingScreen from './src/screens/CounselingScreen';
import BibleScreen from './src/screens/BibleScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DevotionalScreen from './src/screens/DevotionalScreen';
import PrayerBoardScreen from './src/screens/PrayerBoardScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#202123',
        },
        headerTintColor: '#ffffff',
      }}
    >
      <Stack.Screen 
        name="HomeScreen" 
        component={HomeScreen}
        options={{
          title: 'Solomon AI',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="PrayerBoard" 
        component={PrayerBoardScreen}
        options={{
          title: 'Prayer Board',
        }}
      />
    </Stack.Navigator>
  );
}

// Custom theme that matches ChatGPT's aesthetic
const theme = createTheme({
  lightColors: {
    primary: '#10a37f',
    secondary: '#202123',
    background: '#343541',
    white: '#ffffff',
    grey0: '#444654',
    grey1: '#343541',
    grey2: '#202123',
    grey3: '#444654',
    grey4: '#565869',
    grey5: '#666980',
  },
  darkColors: {
    primary: '#10a37f',
    secondary: '#202123',
    background: '#343541',
    white: '#ffffff',
    grey0: '#444654',
    grey1: '#343541',
    grey2: '#202123',
    grey3: '#444654',
    grey4: '#565869',
    grey5: '#666980',
  },
  mode: 'dark',
});

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#10a37f',
    background: '#343541',
    card: '#202123',
    text: '#ffffff',
    border: '#444654',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider theme={theme}>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="light" />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerStyle: {
                backgroundColor: '#202123',
                borderBottomWidth: 1,
                borderBottomColor: '#444654',
              },
              headerTintColor: '#ffffff',
              tabBarStyle: {
                backgroundColor: '#202123',
                borderTopColor: '#444654',
                borderTopWidth: 1,
                paddingBottom: 5,
                height: 60,
              },
              tabBarActiveTintColor: '#10a37f',
              tabBarInactiveTintColor: '#666980',
              tabBarIcon: ({ focused, color, size }) => {
                let iconName: keyof typeof Ionicons.glyphMap;
                
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
                } else {
                  iconName = 'help-outline';
                }
                
                return <Ionicons name={iconName} size={size} color={color} />;
              },
            })}
          >
            <Tab.Screen 
              name="Home" 
              component={HomeStack}
              options={{
                headerShown: false,
              }}
            />
            <Tab.Screen 
              name="Counseling" 
              component={CounselingScreen}
              options={{
                title: 'Chat',
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
              name="Devotional" 
              component={DevotionalScreen}
              options={{
                title: 'Devotional',
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
