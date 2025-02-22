import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions, TouchableOpacity, Alert, Modal, TouchableWithoutFeedback } from 'react-native';
import { Text, Input, Button, ListItem } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import Voice from '@react-native-voice/voice';
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
    minHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    paddingTop: 8,
    paddingHorizontal: 12,
    minHeight: 5,
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
    height: 37,
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#444654',
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: '#343541',
    minHeight: 20,
    maxHeight: 120,
    marginTop: 0,
    marginBottom: 0,
    paddingVertical: 0,
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
    paddingVertical: 5,
    backgroundColor: '#202123',
    borderBottomWidth: 1,
    borderBottomColor: '#444654',
  },
  headerTitle: {
    paddingTop: 16,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    paddingTop: 16,
    padding: 8,
    marginLeft: 8,
  },
  browseButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  conversationModalContent: {
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
  recordingModalContent: {
    backgroundColor: '#444654',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
  },
  recordingTimerText: {
    color: '#ffffff',
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    marginBottom: 20,
  },
  recordingModalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
  },
  recordingModalButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingCancelButton: {
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
  },
  recordingSendButton: {
    backgroundColor: 'rgba(16, 163, 127, 0.1)',
  },
});

const RecordingModal = ({ 
  isVisible, 
  duration, 
  onCancel, 
  onSend 
}: { 
  isVisible: boolean; 
  duration: number;
  onCancel: () => void;
  onSend: () => void;
}) => (
  <Modal
    animationType="slide"
    transparent={true}
    visible={isVisible}
    onRequestClose={onCancel}
  >
    <TouchableWithoutFeedback onPress={onCancel}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback>
          <View style={styles.recordingModalContent}>
            <Text style={styles.recordingTimerText}>
              {new Date(duration * 1000).toISOString().substr(14, 5)}
            </Text>
            <View style={styles.recordingModalButtons}>
              <TouchableOpacity onPress={onCancel} style={[styles.recordingModalButton, styles.recordingCancelButton]}>
                <Ionicons name="close" size={24} color="#dc3545" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onSend} style={[styles.recordingModalButton, styles.recordingSendButton]}>
                <Ionicons name="checkmark" size={24} color="#10a37f" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

const CounselingScreen: React.FC = () => {
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
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');

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
      text: "Hello, I'm Solomon. This is a safe space for you. I'm here to listen, support, and help with whatever is on your mind. Feel free to type or say 'Hey Solomon' to start a voice chat.",
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

  // Initialize voice recognition
  const setupVoiceListeners = useCallback(() => {
    Voice.onSpeechStart = () => {
      console.log('Speech started');
      setIsListening(true);
    };

    Voice.onSpeechEnd = () => {
      console.log('Speech ended');
      setIsListening(false);
      // Restart listening after a delay if not recording
      if (!isRecording) {
        setTimeout(startListening, 1000);
      }
    };

    Voice.onSpeechResults = (event: { value?: string[] }) => {
      if (event.value && event.value[0]?.toLowerCase().includes('hey solomon')) {
        console.log('Wake word detected');
        stopListening();
        handleStartRecording();
      }
    };

    Voice.onSpeechError = (error: { error?: { message?: string } }) => {
      console.error('Speech recognition error:', error);
      setIsListening(false);
      // Restart listening after error if not recording
      if (!isRecording) {
        setTimeout(startListening, 2000);
      }
    };
  }, [isRecording]);

  const setupVoiceRecognition = useCallback(async () => {
    try {
      // First, destroy any existing Voice instance
      await Voice.destroy();
      await new Promise(resolve => setTimeout(resolve, 300));

      // Initialize Voice
      const isAvailable = await Voice.isAvailable();
      if (!isAvailable) {
        Alert.alert(
          'Microphone Access Required',
          'Please enable microphone access in your device settings to use voice features.'
        );
        return;
      }

      // Set up voice listeners
      setupVoiceListeners();

      // Start listening with a delay to ensure proper initialization
      setTimeout(startListening, 500);
    } catch (error: unknown) {
      console.error('Error setting up voice recognition:', error);
    }
  }, [setupVoiceListeners]);

  // Start background listening when the screen mounts
  useEffect(() => {
    setupVoiceRecognition();

    // Cleanup when component unmounts
    return () => {
      stopListening().then(() => {
        Voice.destroy().then(Voice.removeAllListeners);
      });
    };
  }, [setupVoiceRecognition]);

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
      const aiResponseText = await aiService.getCounselingResponse(text, false);

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

      setIsLoading(false);

      // Generate voice response after UI is updated
      if (useVoice) {
        try {
          await aiService.generateVoiceResponse(aiResponseText);
        } catch (error) {
          console.error('Error generating voice response:', error);
          // Don't show an error to the user since the text response was successful
        }
      }

    } catch (error) {
      console.error('Error in handleMessage:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "I apologize, but I'm having trouble processing your message. Please try again.",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const startRecordingTimer = () => {
    setRecordingDuration(0);
    recordingTimer.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    setRecordingDuration(0);
  };

  const startListening = async () => {
    try {
      if (isRecording) {
        console.log('Cannot start listening while recording');
        return;
      }

      // Destroy any existing instance first
      await Voice.destroy();
      await new Promise(resolve => setTimeout(resolve, 300));

      await Voice.start('en-US');
      console.log('Voice recognition started');
    } catch (error: unknown) {
      console.error('Error starting voice recognition:', error);
      // If we get the "already started" error, try to recover
      if (error instanceof Error && error.message?.includes('already started')) {
        try {
          await Voice.destroy();
          await new Promise(resolve => setTimeout(resolve, 500));
          await Voice.start('en-US');
        } catch (retryError) {
          console.error('Error in voice recognition retry:', retryError);
        }
      }
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      console.log('Voice recognition stopped');
    } catch (error: unknown) {
      console.error('Error stopping voice recognition:', error);
    } finally {
      // Always try to destroy after stopping
      try {
        await Voice.destroy();
      } catch (error: unknown) {
        console.error('Error destroying voice recognition:', error);
      }
    }
  };

  const handleStartRecording = async () => {
    try {
      await aiService.startVoiceRecording();
      setIsRecording(true);
      setShowRecordingModal(true);
      startRecordingTimer();
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
      // Restart background listening if recording fails
      startListening();
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsLoading(true);
      stopRecordingTimer();
      setShowRecordingModal(false);
      
      const result = await aiService.stopRecording();
      if (!result) {
        console.error('No result from voice recording');
        return;
      }

      const { transcription, aiResponse } = result;
      
      let conversation = currentConversation;
      if (!conversation) {
        console.log('Creating new conversation...');
        conversation = await createNewConversation();
        if (!conversation) {
          throw new Error('Failed to create conversation');
        }
        console.log('Created new conversation:', conversation);
      }

      // Save and display user message
      const userMessageId = Date.now().toString();
      const userMessage: Message = {
        id: userMessageId,
        text: transcription,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      await saveMessage(userMessage, 'user');

      // Save and display AI message
      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: Message = {
        id: aiMessageId,
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      await saveMessage(aiMessage, 'assistant');

      setIsLoading(false);

      // Generate voice response after UI is updated
      try {
        await aiService.generateVoiceResponse(aiResponse);
      } catch (error) {
        console.error('Error generating voice response:', error);
        // Don't show an error to the user since the text response was successful
      }

    } catch (error) {
      console.error('Error handling recording:', error);
      Alert.alert('Error', 'Failed to process recording. Please try again.');
    } finally {
      setIsRecording(false);
      setIsLoading(false);
      // Restart background listening after recording is done
      startListening();
    }
  };

  const handleCancelRecording = async () => {
    try {
      await aiService.cancelRecording();
      stopRecordingTimer();
      setShowRecordingModal(false);
      setIsRecording(false);
      // Restart background listening after canceling
      startListening();
    } catch (error) {
      console.error('Error canceling recording:', error);
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      handleStartRecording();
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
        <View style={styles.modalOverlay}>
          <View style={styles.conversationModalContent}>
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

      <RecordingModal
        isVisible={showRecordingModal}
        duration={recordingDuration}
        onCancel={handleCancelRecording}
        onSend={handleStopRecording}
      />

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