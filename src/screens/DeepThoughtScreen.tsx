import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Text, Input } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import AIService from '../services/AIService';
import FirebaseService from '../services/FirebaseService';
import { useUser } from '../contexts/UserContext';
import { formatDistance } from 'date-fns';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  reasoning?: string[];
}

const DeepThoughtScreen = () => {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentConversation, setCurrentConversation] = useState<any>(null);

  // Initial welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      text: "Welcome to Deep Thought. This is a space for exploring profound questions about faith, existence, purpose, and understanding. I'll help you analyze complex ideas by breaking down my reasoning process step by step. What's on your mind?",
      sender: 'ai',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const createNewConversation = async () => {
    if (!user?.id) return null;
    try {
      const title = `Deep Thought - ${new Date().toLocaleString()}`;
      const conversation = await FirebaseService.createConversation(
        user.id,
        title
      );
      setCurrentConversation(conversation);
      return conversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
  };

  const saveMessage = async (message: Message, role: 'user' | 'assistant') => {
    if (!user?.id) return;

    try {
      let conversation = currentConversation;
      if (!conversation) {
        conversation = await createNewConversation();
        if (!conversation) return;
      }

      await FirebaseService.addMessage(
        conversation.id,
        message.text,
        role,
        user.id
      );
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  const handleMessage = async (text: string) => {
    if (!user?.id) {
      console.error('No authenticated user');
      return;
    }

    setIsLoading(true);
    try {
      // Ensure we have a conversation
      let conversation = currentConversation;
      if (!conversation) {
        conversation = await createNewConversation();
        if (!conversation) {
          throw new Error('Failed to create conversation');
        }
        setCurrentConversation(conversation);
      }

      // Add and save user message
      const userMessage: Message = {
        id: Date.now().toString(),
        text: text,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      setInputText('');
      await saveMessage(userMessage, 'user');

      // Create a placeholder AI message
      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: Message = {
        id: aiMessageId,
        text: 'Thinking...',
        sender: 'ai',
        timestamp: new Date(),
        reasoning: [],
      };
      setMessages(prev => [...prev, aiMessage]);

      // Get AI response
      const aiService = AIService.getInstance();
      const response = await aiService.getDeepThoughtResponse(text);

      // Update the message with the response
      setMessages(prev => {
        const messageIndex = prev.findIndex(m => m.id === aiMessageId);
        if (messageIndex === -1) return prev;

        const updatedMessages = [...prev];
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          text: response.answer,
          reasoning: response.reasoning,
        };
        return updatedMessages;
      });

      // Save the final message
      await saveMessage({
        id: aiMessageId,
        text: response.answer,
        sender: 'ai',
        timestamp: new Date(),
        reasoning: response.reasoning,
      }, 'assistant');

    } catch (error) {
      console.error('Error in handleMessage:', error);
      Alert.alert('Error', 'Failed to process your message. Please try again.');
      setMessages(prev => prev.filter(m => m.sender !== 'ai' || m.text !== 'Thinking...'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    handleMessage(inputText.trim());
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
        
        {message.reasoning && message.reasoning.length > 0 && (
          <View style={styles.reasoningContainer}>
            <Text style={styles.reasoningTitle}>Reasoning Process:</Text>
            {message.reasoning.map((step, index) => (
              <View key={index} style={styles.reasoningStep}>
                <Text style={styles.stepNumber}>{index + 1}.</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Deep Thought</Text>
      </View>

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

      <View style={styles.inputWrapper}>
        <View style={styles.inputContainer}>
          <Input
            placeholder="Ask a deep question..."
            value={inputText}
            onChangeText={setInputText}
            containerStyle={styles.input}
            inputContainerStyle={styles.inputField}
            inputStyle={styles.inputText}
            multiline={true}
            disabled={isLoading}
            placeholderTextColor="#666980"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.disabledButton
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={(!inputText.trim() || isLoading) ? "#666980" : "#ffffff"} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#343541',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#202123',
    borderBottomWidth: 1,
    borderBottomColor: '#444654',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  messagesContainer: {
    flex: 1,
    marginBottom: 49,
  },
  messagesContent: {
    padding: 10,
    paddingBottom: 10,
  },
  messageContainer: {
    marginVertical: 5,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  userMessageContainer: {
    backgroundColor: '#444654',
  },
  aiMessageContainer: {
    backgroundColor: '#343541',
    borderWidth: 1,
    borderColor: '#444654',
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
  reasoningContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#444654',
  },
  reasoningTitle: {
    color: '#10a37f',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  reasoningStep: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
  },
  stepNumber: {
    color: '#10a37f',
    fontSize: 14,
    marginRight: 8,
    minWidth: 20,
  },
  stepText: {
    color: '#666980',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  inputWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#202123',
    borderTopWidth: 1,
    borderTopColor: '#444654',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    marginHorizontal: 0,
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#444654',
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: '#343541',
    minHeight: 36,
    maxHeight: 120,
  },
  inputText: {
    color: '#ffffff',
    fontSize: 15,
  },
  sendButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 18,
    backgroundColor: '#10a37f',
  },
  disabledButton: {
    backgroundColor: '#343541',
    borderWidth: 1,
    borderColor: '#444654',
  },
});

export default DeepThoughtScreen; 