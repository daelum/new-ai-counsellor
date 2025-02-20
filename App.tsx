import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider, createTheme } from '@rneui/themed';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import CounselingScreen from './src/screens/CounselingScreen';
import BibleScreen from './src/screens/BibleScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DevotionalScreen from './src/screens/DevotionalScreen';
import PrayerBoardScreen from './src/screens/PrayerBoardScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DeepThoughtScreen from './src/screens/DeepThoughtScreen';

// Import context
import { UserProvider, useUser } from './src/contexts/UserContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

// Update TabParamList type
type TabParamList = {
  Home: undefined;
  Counseling: undefined;
  Bible: undefined;
  Devotional: undefined;
  DeepThought: undefined;
  Profile: undefined;
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#202123',
        },
        headerTintColor: '#ffffff',
      }}
    >
      <AuthStack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{ headerShown: false }}
      />
    </AuthStack.Navigator>
  );
}

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

function TabNavigator() {
  return (
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
          } else if (route.name === 'DeepThought') {
            iconName = focused ? 'bulb' : 'bulb-outline';
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
          headerShown: false,
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
        name="DeepThought" 
        component={DeepThoughtScreen}
        options={{
          title: 'Deep Thought',
          headerShown: false,
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
  );
}

function NavigationWrapper() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#343541' }}>
        <ActivityIndicator size="large" color="#10a37f" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style="light" />
      {user ? <TabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
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
        <UserProvider>
          <NavigationWrapper />
        </UserProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
