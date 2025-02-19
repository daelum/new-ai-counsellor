import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Text, Button } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useUser } from '../contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { login, signInWithGoogle } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      await login(email.trim().toLowerCase(), password);
      // Navigation is handled by NavigationWrapper in App.tsx
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text h3 style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666980"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor="#666980"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={24}
                color="#666980"
              />
            </TouchableOpacity>
          </View>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={isLoading}
            containerStyle={styles.buttonContainer}
            buttonStyle={styles.button}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <Button
            title="Sign in with Google"
            icon={
              <Ionicons
                name="logo-google"
                size={20}
                color="#ffffff"
                style={{ marginRight: 10 }}
              />
            }
            onPress={handleGoogleSignIn}
            containerStyle={styles.buttonContainer}
            buttonStyle={styles.googleButton}
          />

          <TouchableOpacity 
            onPress={() => navigation.navigate('Register')}
            style={styles.registerLink}
          >
            <Text style={styles.registerText}>
              Don't have an account? <Text style={styles.registerHighlight}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#343541',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    color: '#ffffff',
    marginBottom: 10,
  },
  subtitle: {
    color: '#666980',
    fontSize: 16,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#444654',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    color: '#ffffff',
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 10,
  },
  button: {
    backgroundColor: '#10a37f',
    padding: 15,
    borderRadius: 8,
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    color: '#666980',
    fontSize: 16,
  },
  registerHighlight: {
    color: '#10a37f',
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#666980',
  },
  dividerText: {
    color: '#666980',
    paddingHorizontal: 10,
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444654',
    borderRadius: 8,
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    color: '#ffffff',
    fontSize: 16,
  },
  eyeButton: {
    padding: 15,
  },
});

export default LoginScreen; 