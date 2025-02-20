import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions, TouchableOpacity, Alert, Modal } from 'react-native';
import { Text, Input, Button, ListItem } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AIService from '../services/AIService';
import FirebaseService, { Conversation, Message as DBMessage } from '../services/FirebaseService';
import { useUser } from '../contexts/UserContext';
import { formatDistance } from 'date-fns';
import { auth } from '../config/firebase';
import { useNavigation, useIsFocused, useFocusEffect } from '@react-navigation/native';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

// Add this type to help with conversion
type FirestoreMessage = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  userId: string;
  conversationId: string;
}

const CounselingScreen = () => {
  const navigation = useNavigation();
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const messagesRef = useRef<Message[]>([]);
  const aiService = AIService.getInstance();
  const [showConversationsModal, setShowConversationsModal] = useState(false);
  const [previousConversations, setPreviousConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const activeConversationRef = useRef<string | null>(null);

  // Update messagesRef whenever messages change
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Audio setup and recording state management
  useEffect(() => {
    setupAudio();
    const unsubscribe = aiService.onRecordingStateChange((isRecording) => {
      console.log('Recording state changed:', isRecording);
      setIsRecording(isRecording);
    });

    return () => {
      unsubscribe();
      aiService.cancelRecording();
      aiService.stopAndUnloadSound();
    };
  }, [currentConversation]);

  // Initial welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      text: "Hello, I'm Solomon. This is a safe space for you. I'm here to listen, support, and help with whatever is on your mind. Feel free to type or start a voice chat.",
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

  // Add this useEffect to load conversations when modal opens
  useEffect(() => {
    if (showConversationsModal && user) {
      loadPreviousConversations();
    }
  }, [showConversationsModal, user]);

  const setupAudio = async () => {
    try {
      console.log('Setting up audio...');
      await Audio.requestPermissionsAsync();
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      console.log('Audio setup complete');
    } catch (error) {
      console.error('Error setting up audio:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      Alert.alert(
        'Audio Setup Error',
        'Failed to set up audio. Please check your device settings and permissions.'
      );
    }
  };

  const createNewConversation = async () => {
    if (!auth.currentUser?.uid) return null;
    try {
      const title = `Counseling Session - ${new Date().toLocaleString()}`;
      const conversation = await FirebaseService.createConversation(
        auth.currentUser.uid,
        title
      );
      setCurrentConversation(conversation);
      activeConversationRef.current = conversation.id;
      return conversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
  };

  const saveMessage = async (message: Message, role: 'user' | 'assistant') => {
    if (!auth.currentUser?.uid) return;

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
        auth.currentUser.uid
      );
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  const handleMessage = async (text: string, useVoice: boolean = false) => {
    if (!auth.currentUser?.uid) {
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
        activeConversationRef.current = conversation.id;
      }

      // Immediately save and display user message
      const userMessageId = Date.now().toString();
      const tempUserMessage: Message = {
        id: userMessageId,
        text: text,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, tempUserMessage]);
      setInputText('');

      // Save user message to Firestore
      const savedUserMessage = await FirebaseService.addMessage(
        conversation.id,
        text,
        'user',
        auth.currentUser.uid
      );

      // Update message with correct ID
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessageId ? { ...msg, id: savedUserMessage.id } : msg
        )
      );

      // Get AI response
      const aiResponseText = await aiService.getCounselingResponse(text, useVoice);

      // Immediately display AI response
      const tempAiMessageId = Date.now().toString();
      const tempAiMessage: Message = {
        id: tempAiMessageId,
        text: aiResponseText,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, tempAiMessage]);

      // Save AI response to Firestore
      const savedAiMessage = await FirebaseService.addMessage(
        conversation.id,
        aiResponseText,
        'assistant',
        auth.currentUser.uid
      );

      // Update AI message with correct ID
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempAiMessageId ? { ...msg, id: savedAiMessage.id } : msg
        )
      );

    } catch (error) {
      console.error('Error in handleMessage:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "I apologize, but I'm having trouble processing your message. Please try again.",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = async () => {
    if (!auth.currentUser?.uid) {
      console.error('No authenticated user found');
      return;
    }

    try {
      if (isRecording) {
        console.log('Stopping recording...');
        setIsLoading(true);
        
        // Get the recording result
        const result = await aiService.stopRecording();
        console.log('Got recording result:', result);
        
        if (!result) {
          console.error('No result from voice recording');
          return;
        }

        const { transcription, aiResponse } = result;
        
        // Ensure we have a conversation
        let conversation = currentConversation;
        if (!conversation) {
          console.log('Creating new conversation...');
          conversation = await createNewConversation();
          if (!conversation) {
            throw new Error('Failed to create conversation');
          }
          console.log('Created new conversation:', conversation);
        }

        // Immediately display user's transcribed message
        const userMessageId = Date.now().toString();
        const userMessage: Message = {
          id: userMessageId,
          text: transcription.trim(),
          sender: 'user',
          timestamp: new Date(),
        };
        console.log('Adding user message to UI:', userMessage);
        setMessages(prev => [...prev, userMessage]);

        // Save transcribed message to Firestore
        console.log('Saving user message to Firestore...');
        const savedUserMessage = await FirebaseService.addMessage(
          conversation.id,
          transcription.trim(),
          'user',
          auth.currentUser.uid
        );
        console.log('Saved user message:', savedUserMessage);

        // Update user message with correct ID
        setMessages(prev => 
          prev.map(msg => 
            msg.id === userMessageId ? { ...msg, id: savedUserMessage.id } : msg
          )
        );

        // Immediately display AI response
        const aiMessageId = Date.now().toString();
        const aiMessage: Message = {
          id: aiMessageId,
          text: aiResponse,
          sender: 'ai',
          timestamp: new Date(),
        };
        console.log('Adding AI response to UI:', aiMessage);
        setMessages(prev => [...prev, aiMessage]);

        // Save AI response to Firestore
        console.log('Saving AI response to Firestore...');
        const savedAiMessage = await FirebaseService.addMessage(
          conversation.id,
          aiResponse,
          'assistant',
          auth.currentUser.uid
        );
        console.log('Saved AI response:', savedAiMessage);

        // Update AI message with correct ID
        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessageId ? { ...msg, id: savedAiMessage.id } : msg
          )
        );
      } else {
        console.log('Starting recording...');
        await aiService.startVoiceRecording();
      }
    } catch (error) {
      console.error('Error in toggleRecording:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "Error in voice chat flow: " + (error instanceof Error ? error.message : 'Unknown error'),
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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

  const loadPreviousConversations = async () => {
    if (!user) return;
    
    try {
      setIsLoadingConversations(true);
      const conversations = await FirebaseService.getConversations(user.id);
      setPreviousConversations(conversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      const isIndexError = error instanceof Error && 
        error.message.includes('The query requires an index');
      
      if (isIndexError) {
        Alert.alert(
          'One-time Setup Required',
          'The database needs a one-time setup. Please wait a few minutes for the database to be optimized, then try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to load previous conversations. Please try again later.');
      }
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      setIsLoading(true);
      const dbMessages = await FirebaseService.getMessages(conversationId);
      
      if (dbMessages.length === 0) {
        Alert.alert('Info', 'This conversation is empty');
        return;
      }

      // Convert Firestore messages to our Message format
      const formattedMessages: Message[] = dbMessages.map(msg => ({
        id: msg.id,
        text: msg.content,
        sender: msg.role === 'user' ? 'user' : 'ai',
        timestamp: new Date(msg.timestamp.toDate()),
      }));

      setMessages(formattedMessages);
      const conversation = previousConversations.find(c => c.id === conversationId);
      if (conversation) {
        setCurrentConversation(conversation);
        activeConversationRef.current = conversation.id;
      }
      setShowConversationsModal(false);
    } catch (error) {
      console.error('Error loading conversation:', error);
      const isIndexError = error instanceof Error && 
        error.message.includes('The query requires an index');
      
      if (isIndexError) {
        Alert.alert(
          'One-time Setup Required',
          'The database needs a one-time setup for messages. Please wait a few minutes for the database to be optimized, then try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to load conversation messages. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!auth.currentUser?.uid) return;

    try {
      setIsLoadingConversations(true);
      await FirebaseService.deleteConversation(conversationId, auth.currentUser.uid);
      
      // Update the local state to remove the deleted conversation
      setPreviousConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // If the deleted conversation was the current one, reset the current conversation
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        activeConversationRef.current = null;
        startNewChat();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      Alert.alert('Error', 'Failed to delete conversation. Please try again later.');
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const renderConversationItem = (conversation: Conversation) => (
    <ListItem
      key={conversation.id}
      containerStyle={styles.conversationItem}
    >
      <ListItem.Content>
        <TouchableOpacity 
          onPress={() => loadConversation(conversation.id)}
          style={{ flex: 1, marginRight: 16 }}
        >
          <ListItem.Title style={styles.conversationTitle}>
            {conversation.title}
          </ListItem.Title>
          <ListItem.Subtitle style={styles.conversationSubtitle}>
            {`${conversation.messageCount} messages • ${formatDistance(conversation.lastUpdated.toDate(), new Date(), { addSuffix: true })}`}
          </ListItem.Subtitle>
        </TouchableOpacity>
      </ListItem.Content>
      <TouchableOpacity
        style={{ padding: 8, marginLeft: 8 }}
        onPress={() => {
          Alert.alert(
            'Delete Conversation',
            'Are you sure you want to delete this conversation? This action cannot be undone.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => handleDeleteConversation(conversation.id),
              },
            ],
          );
        }}
      >
        <Ionicons name="trash-outline" size={20} color="#ff3b30" />
      </TouchableOpacity>
    </ListItem>
  );

  const startNewChat = () => {
    setMessages([{
      id: 'welcome',
      text: "Hello, I'm Solomon. This is a safe space for you. I'm here to listen, support, and help with whatever is on your mind. Feel free to type or start a voice chat.",
      sender: 'ai',
      timestamp: new Date(),
    }]);
    setCurrentConversation(null);
    activeConversationRef.current = null;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#343541',
      position: 'relative',
    },
    messagesContainer: {
      flex: 1,
      marginBottom: 49,
    },
    messagesContent: {
      padding: 10,
      paddingBottom: 10,
    },
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
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
    inputWrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#202123',
      borderTopWidth: 1,
      borderTopColor: '#444654',
      minHeight: 49,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      minHeight: 49,
      backgroundColor: 'transparent',
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
    },
    inputField: {
      borderWidth: 1,
      borderColor: '#444654',
      borderRadius: 16,
      paddingHorizontal: 12,
      backgroundColor: '#343541',
      minHeight: 36,
      maxHeight: 120,
      marginTop: 0,
      marginBottom: 0,
      paddingVertical: 4,
    },
    inputText: {
      color: '#ffffff',
      fontSize: 15,
      textAlign: 'left',
      textAlignVertical: 'center',
      paddingTop: 0,
      paddingBottom: 0,
      lineHeight: 20,
      height: '100%',
    },
    buttonsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
      height: '100%',
    },
    iconButton: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 6,
      borderRadius: 18,
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
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerButton: {
      padding: 8,
      marginLeft: 8,
    },
    browseButton: {
      padding: 8,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: '#343541',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#444654',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#ffffff',
    },
    closeButton: {
      padding: 4,
    },
    conversationsList: {
      padding: 16,
    },
    conversationItem: {
      backgroundColor: '#444654',
      marginBottom: 8,
      borderRadius: 8,
    },
    conversationTitle: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    conversationSubtitle: {
      color: '#666980',
      fontSize: 14,
      marginTop: 4,
    },
    modalLoading: {
      padding: 32,
      alignItems: 'center',
    },
    noConversations: {
      padding: 32,
      alignItems: 'center',
    },
    noConversationsText: {
      color: '#666980',
      fontSize: 16,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={startNewChat}
          >
            <Ionicons name="add-outline" size={24} color="#10a37f" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowConversationsModal(true)}
          >
            <Ionicons name="albums-outline" size={24} color="#10a37f" />
          </TouchableOpacity>
        </View>
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

      {/* Conversations Modal */}
      <Modal
        visible={showConversationsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConversationsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Previous Conversations</Text>
              <TouchableOpacity
                onPress={() => setShowConversationsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666980" />
              </TouchableOpacity>
            </View>
            
            {isLoadingConversations ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#10a37f" />
              </View>
            ) : previousConversations.length > 0 ? (
              <ScrollView style={styles.conversationsList}>
                {previousConversations.map(renderConversationItem)}
              </ScrollView>
            ) : (
              <View style={styles.noConversations}>
                <Text style={styles.noConversationsText}>
                  No previous conversations found
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <View style={[
        styles.inputWrapper,
        inputText.length > 0 && {
          minHeight: Math.min(49 + (inputText.split('\n').length - 1) * 20, 120),
        }
      ]}>
        <View style={styles.inputContainer}>
          <Input
            placeholder="What's on your mind?..."
            value={inputText}
            onChangeText={setInputText}
            containerStyle={styles.input}
            inputContainerStyle={[
              styles.inputField,
              inputText.length > 0 && { height: 'auto' }
            ]}
            inputStyle={styles.inputText}
            multiline={true}
            disabled={isLoading || isRecording}
            placeholderTextColor="#666980"
            textAlignVertical="center"
            style={{ lineHeight: 20 }}
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
      </View>
    </View>
  );
};

export default CounselingScreen; 