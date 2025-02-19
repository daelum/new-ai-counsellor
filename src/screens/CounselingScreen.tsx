import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Input, Button } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AIService from '../services/AIService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const CounselingScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const aiService = AIService.getInstance();

  useEffect(() => {
    setupAudio();
    const unsubscribe = aiService.onRecordingStateChange(async (isRecording) => {
      console.log('Recording state changed:', isRecording);
      setIsRecording(isRecording);
      
      if (!isRecording) {
        try {
          setIsLoading(true);
          console.log('Stopping recording and waiting for result...');
          const result = await aiService.stopRecording();
          console.log('Got recording result:', result);
          
          if (result) {
            const { transcription, aiResponse } = result;
            console.log('Adding messages to chat:', { transcription, aiResponse });
            
            setMessages(prev => [
              ...prev,
              {
                id: Date.now().toString(),
                text: transcription.trim(),
                sender: 'user',
                timestamp: new Date(),
              },
              {
                id: (Date.now() + 1).toString(),
                text: aiResponse,
                sender: 'ai',
                timestamp: new Date(),
              }
            ]);
          }
        } catch (error) {
          console.error('Error handling recording stop:', error);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: "I apologize, but I'm experiencing some difficulty processing your message. Please try again.",
            sender: 'ai',
            timestamp: new Date(),
          }]);
        } finally {
          setIsLoading(false);
        }
      }
    });

    return () => {
      unsubscribe();
      aiService.cancelRecording();
      aiService.stopAndUnloadSound();
    };
  }, []);

  useEffect(() => {
    // Show initial welcome message when component mounts
    const welcomeMessage: Message = {
      id: 'welcome',
      text: "Hello, I'm Solomon. This is a safe space for you. I'm here to listen, support, and help with whatever is on your mind. Feel free to type or start a voice chat.",
      sender: 'ai',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const setupAudio = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await aiService.cancelRecording();
    } else {
      try {
        setIsLoading(true);
        const result = await aiService.startVoiceRecording();
        
        if (result) {
          const { transcription, aiResponse } = result;
          console.log('Got voice conversation result:', { transcription, aiResponse });
          
          // Add user's transcribed message
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              text: transcription.trim(),
              sender: 'user',
              timestamp: new Date(),
            },
            {
              id: (Date.now() + 1).toString(),
              text: aiResponse,
              sender: 'ai',
              timestamp: new Date(),
            }
          ]);
        }
      } catch (error) {
        console.error('Failed to start recording:', error);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: "I apologize, but I'm experiencing some difficulty processing your message. Please try again.",
          sender: 'ai',
          timestamp: new Date(),
        }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleMessage = async (text: string, useVoice: boolean = false) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const aiResponse = await aiService.getCounselingResponse(userMessage.text, useVoice);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I apologize, but I'm experiencing some difficulty. Please try again.",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsRecording(false);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    handleMessage(inputText);
  };

  const renderMessage = (message: Message) => (
    <View
      key={message.id}
      style={[
        styles.messageContainer,
        message.sender === 'user' ? styles.userMessageContainer : styles.aiMessageContainer
      ]}
    >
      <View style={styles.messageContent}>
        <Text style={[
          styles.messageText,
          message.sender === 'user' ? styles.userMessageText : styles.aiMessageText
        ]}>
          {message.text}
        </Text>
      </View>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#343541',
    },
    messagesContainer: {
      flex: 1,
    },
    messagesContent: {
      padding: 10,
      paddingBottom: 20,
    },
    messageContainer: {
      marginVertical: 5,
      paddingHorizontal: 15,
      paddingVertical: 10,
    },
    userMessageContainer: {
      backgroundColor: '#444654',
    },
    aiMessageContainer: {
      backgroundColor: '#343541',
    },
    messageContent: {
      maxWidth: '100%',
    },
    messageText: {
      fontSize: 16,
      lineHeight: 24,
    },
    userMessageText: {
      color: '#ffffff',
    },
    aiMessageText: {
      color: '#ffffff',
    },
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      paddingHorizontal: 12,
      backgroundColor: '#202123',
      borderTopWidth: 1,
      borderTopColor: '#444654',
    },
    input: {
      flex: 1,
      paddingRight: 8,
      backgroundColor: 'transparent',
      paddingHorizontal: 0,
      marginHorizontal: 0,
      paddingVertical: 0,
      marginVertical: 0,
      borderBottomWidth: 0,
      height: 40,
    },
    inputField: {
      borderWidth: 1,
      borderColor: '#444654',
      borderRadius: 20,
      paddingHorizontal: 15,
      backgroundColor: '#343541',
      minHeight: 40,
      maxHeight: 100,
      marginTop: 0,
      marginBottom: 0,
    },
    inputText: {
      color: '#ffffff',
      fontSize: 16,
    },
    buttonsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
      height: 40,
    },
    iconButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
      borderRadius: 20,
      backgroundColor: '#343541',
      borderWidth: 1,
      borderColor: '#444654',
    },
    recordingButton: {
      backgroundColor: 'rgba(255, 59, 48, 0.1)',
      borderColor: '#ff3b30',
    },
    activeIconButton: {
      backgroundColor: '#10a37f',
      borderColor: '#10a37f',
    },
    disabledIconButton: {
      backgroundColor: '#343541',
      borderColor: '#444654',
      opacity: 0.5,
    },
  });

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(renderMessage)}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#10a37f" />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <Input
          placeholder="What's On Your Mind?"
          value={inputText}
          onChangeText={setInputText}
          containerStyle={styles.input}
          inputContainerStyle={styles.inputField}
          inputStyle={styles.inputText}
          multiline
          disabled={isLoading || isRecording}
          placeholderTextColor="#666980"
        />
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              isRecording && styles.recordingButton,
              isLoading && styles.disabledIconButton
            ]}
            onPress={toggleRecording}
            disabled={isLoading}
          >
            <Ionicons 
              name={isRecording ? "stop-circle" : "mic"} 
              size={22} 
              color={isRecording ? "#ff3b30" : isLoading ? "#666980" : "#10a37f"} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              inputText.trim() && !isLoading && !isRecording && styles.activeIconButton,
              (isLoading || !inputText.trim() || isRecording) && styles.disabledIconButton
            ]}
            onPress={handleSend}
            disabled={isLoading || !inputText.trim() || isRecording}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={(!inputText.trim() || isLoading || isRecording) ? "#666980" : "#ffffff"} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default CounselingScreen; 