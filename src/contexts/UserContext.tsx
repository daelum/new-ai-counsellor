import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FirebaseService, { User } from '../services/FirebaseService';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '618629379654-a8ajlooqgh1uudt9g013b8kdkgmd195q.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    redirectUri: `https://auth.expo.io/@daelum/solomon-app`
  });

  useEffect(() => {
    if (request) {
      console.log('Auth Request URL:', request);
    }
  }, [request]);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleSignIn(id_token);
    }
  }, [response]);

  const handleGoogleSignIn = async (idToken: string) => {
    try {
      const user = await FirebaseService.signInWithGoogle(idToken);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      setUser(user);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const loadUser = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const userData = JSON.parse(userJson);
        const user = await FirebaseService.getUserById(userData.id);
        if (user) {
          setUser(user);
        } else {
          await AsyncStorage.removeItem('user');
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const user = await FirebaseService.login(email, password);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const register = async (email: string, password: string, username: string) => {
    const user = await FirebaseService.register(email, password, username);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const logout = async () => {
    await FirebaseService.logout();
    await AsyncStorage.removeItem('user');
    setUser(null);
  };

  const signInWithGoogle = async () => {
    try {
      await promptAsync();
    } catch (error) {
      console.error('Error initiating Google sign in:', error);
      throw error;
    }
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      register, 
      logout,
      signInWithGoogle 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext; 