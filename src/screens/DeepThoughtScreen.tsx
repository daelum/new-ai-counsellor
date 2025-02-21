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
  Share,
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

const thinkingMessages = [
  "Consulting the burning bush... 🔥",
  "Walking around Jericho... (6 more laps to go) 🚶‍♂️",
  "Checking if the whale has any messages from Jonah... 🐋",
  "Gathering manna for thought... 🍞",
  "Parting the sea of knowledge... 🌊",
  "Climbing Mount Sinai for better reception... ⛰️",
  "Counting stars like Abraham... ✨",
  "Tuning David's harp... 🎵",
  "Consulting Solomon's wisdom... 👑",
  "Building an ark of understanding... 🚢",
  "Turning water into divine insight... 🍷",
  "Preparing a feast of knowledge... 🍽️",
  "Polishing the armor of God... ⚔️",
  "Checking the Good Book... 📖",
  "Loading divine wisdom... 🕊️"
];

const ThinkingIndicator = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % thinkingMessages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.thinkingContainer}>
      <Text style={styles.thinkingText}>{thinkingMessages[messageIndex]}</Text>
      <ActivityIndicator size="large" color="#10a37f" style={styles.thinkingSpinner} />
    </View>
  );
};

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
      console.log('Starting message handling for:', text);
      
      // Ensure we have a conversation
      let conversation = currentConversation;
      if (!conversation) {
        console.log('Creating new conversation...');
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
      console.log('Adding user message:', userMessage);
      setMessages(prev => [...prev, userMessage]);
      setInputText('');
      await saveMessage(userMessage, 'user');

      // Get AI response
      console.log('Getting AI response...');
      const aiService = AIService.getInstance();
      const response = await aiService.getDeepThoughtResponse(text);
      console.log('Received AI response:', response);

      // Add the AI response
      const aiMessage: Message = {
        id: Date.now().toString(),
        text: response.answer,
        sender: 'ai',
        timestamp: new Date(),
        reasoning: response.reasoning,
      };
      console.log('Adding AI message:', aiMessage);
      setMessages(prev => [...prev, aiMessage]);

      // Save the final message
      await saveMessage(aiMessage, 'assistant');

    } catch (error) {
      console.error('Error in handleMessage:', error);
      Alert.alert('Error', 'Failed to process your message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    handleMessage(inputText.trim());
  };

  const handleShare = async () => {
    try {
      // Filter out the welcome message
      const conversationMessages = messages.filter(m => m.id !== 'welcome');
      
      if (conversationMessages.length === 0) {
        Alert.alert('Nothing to Share', 'Start a conversation first to share insights!');
        return;
      }

      // Format the conversation
      const formattedConversation = conversationMessages.map(message => {
        if (message.sender === 'user') {
          return `Question:\n${message.text}\n\n`;
        } else {
          let formattedMessage = `Answer:\n${message.text}\n\n`;
          if (message.reasoning && message.reasoning.length > 0) {
            formattedMessage += 'Reasoning Process:\n';
            message.reasoning.forEach((step, index) => {
              formattedMessage += `${index + 1}. ${step}\n`;
            });
            formattedMessage += '\n';
          }
          return formattedMessage;
        }
      }).join('');

      const shareMessage = `Deep Thought Conversation\n\n${formattedConversation}\nShared from Solomon App`;

      await Share.share({
        message: shareMessage,
        title: 'Deep Thought Conversation',
      });
    } catch (error) {
      console.error('Error sharing conversation:', error);
      Alert.alert('Error', 'Failed to share the conversation. Please try again.');
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
        {message.text ? (
          message.sender === 'user' ? (
            <Text style={[styles.messageText, styles.userMessageText]}>
              {message.text}
            </Text>
          ) : (
            <View>
              {message.text.split('\n\n').map((section, index) => {
                if (section.startsWith('Final Answer:')) {
                  return (
                    <View key={index} style={styles.section}>
                      <Text style={styles.sectionTitle}>Final Answer</Text>
                      <Text style={[styles.messageText, styles.aiMessageText]}>
                        {section.replace('Final Answer:', '').trim()}
                      </Text>
                    </View>
                  );
                } else if (section.startsWith('Biblical Foundation:')) {
                  const content = section.replace('Biblical Foundation:', '').trim();
                  
                  // Split into verse blocks (each containing reference, text, and explanation)
                  const verseBlocks = content.split(/(?=\n[A-Za-z]+\s+\d+:\d+)/).filter(Boolean);
                  
                  return (
                    <View key={index} style={styles.section}>
                      <Text style={styles.sectionTitle}>Biblical Foundation</Text>
                      {verseBlocks.map((block, verseIndex) => {
                        // Split the block into lines
                        const lines = block.trim().split('\n');
                        
                        // First line contains verse reference and text
                        const verseContent = lines[0];
                        // Remaining lines form the explanation
                        const explanation = lines.slice(1).join('\n').trim();
                        
                        return (
                          <View key={verseIndex} style={styles.verseContainer}>
                            <Text style={[styles.messageText, styles.aiMessageText, styles.verseText]}>
                              {verseContent}
                            </Text>
                            {explanation && (
                              <Text style={[styles.messageText, styles.aiMessageText, styles.verseExplanation]}>
                                {explanation}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  );
                } else {
                  return (
                    <Text key={index} style={[styles.messageText, styles.aiMessageText]}>
                      {section}
                    </Text>
                  );
                }
              })}
            </View>
          )
        ) : (
          <Text style={styles.errorText}>Error: Message text is missing</Text>
        )}
        
        {message.reasoning && message.reasoning.length > 0 && (
          <View style={styles.reasoningContainer}>
            <Text style={styles.reasoningTitle}>Reasoning Process</Text>
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
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(renderMessage)}
        {isLoading && <ThinkingIndicator />}
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
    justifyContent: 'space-between',
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
    flex: 1,
    textAlign: 'center',
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
    marginTop: 24,
    paddingTop: 16,
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
  thinkingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 10,
  },
  thinkingText: {
    fontSize: 16,
    color: '#666980',
    marginBottom: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  thinkingSpinner: {
    marginTop: 10,
  },
  shareButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  errorText: {
    color: '#ff4444',
    fontStyle: 'italic',
    fontSize: 14,
  },
  section: {
    marginVertical: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444654',
  },
  sectionTitle: {
    color: '#10a37f',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  verseContainer: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#444654',
  },
  verseText: {
    marginBottom: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  verseExplanation: {
    color: '#666980',
    fontSize: 15,
    lineHeight: 22,
  },
});

export default DeepThoughtScreen; 