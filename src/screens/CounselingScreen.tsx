import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { Text, Input, Button } from '@rneui/themed';
import AIService from '../services/AIService';
import { Ionicons } from '@expo/vector-icons';

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
  const scrollViewRef = useRef<ScrollView>(null);
  const aiService = AIService.getInstance();

  useEffect(() => {
    // Show initial welcome message when component mounts
    const welcomeMessage: Message = {
      id: 'welcome',
      text: "Hello, I am Solomon. This is a safe space for you to share anything that is on your mind. I am here to listen, support, and help you with whatever you would like to discuss.",
      sender: 'ai',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const aiResponse = await aiService.getCounselingResponse(userMessage.text);
      
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
    }
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
          placeholder="Message Solomon..."
          value={inputText}
          onChangeText={setInputText}
          containerStyle={styles.input}
          inputContainerStyle={styles.inputField}
          inputStyle={styles.inputText}
          multiline
          disabled={isLoading}
          placeholderTextColor="#666980"
        />
        <Button
          icon={
            <Ionicons 
              name="send" 
              size={24} 
              color={inputText.trim() ? "#10a37f" : "#666980"} 
            />
          }
          type="clear"
          onPress={handleSend}
          disabled={isLoading || !inputText.trim()}
          containerStyle={styles.sendButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

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
    padding: 10,
    backgroundColor: '#202123',
    borderTopWidth: 1,
    borderTopColor: '#444654',
  },
  input: {
    flex: 1,
    paddingRight: 10,
    backgroundColor: 'transparent',
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#444654',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#343541',
    minHeight: 40,
  },
  inputText: {
    color: '#ffffff',
  },
  sendButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CounselingScreen; 