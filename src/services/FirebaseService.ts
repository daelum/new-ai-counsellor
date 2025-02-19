import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  getDoc,
  where,
  Timestamp,
  deleteDoc,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  lastLogin: Date;
  bio?: string;
  displayName?: string;
}

export interface Prayer {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: number;
  prayerCount: number;
  prayedBy: string[];
  expiresAt: {
    toDate: () => Date;
  };
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  messageCount: number;
}

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  timestamp: Timestamp;
  role: MessageRole;
  userId: string;
}

class FirebaseService {
  private static instance: FirebaseService;
  private constructor() {}

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  async register(email: string, password: string, username: string): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { user: firebaseUser } = userCredential;

    const userData: Omit<User, 'id'> = {
      email: email,
      username: username,
      createdAt: new Date(),
      lastLogin: new Date(),
    };

    await addDoc(collection(db, 'users'), {
      firebaseId: firebaseUser.uid,
      ...userData,
    });

    return {
      id: firebaseUser.uid,
      ...userData,
    };
  }

  async login(email: string, password: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const { user: firebaseUser } = userCredential;

    const usersRef = collection(db, 'users');
    const q = query(usersRef);
    const querySnapshot = await getDocs(q);
    const userDoc = querySnapshot.docs.find(
      doc => doc.data().firebaseId === firebaseUser.uid
    );

    if (!userDoc) {
      throw new Error('User data not found');
    }

    const userData = userDoc.data();
    return {
      id: firebaseUser.uid,
      email: userData.email,
      username: userData.username,
      createdAt: userData.createdAt.toDate(),
      lastLogin: new Date(),
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const usersRef = collection(db, 'users');
    const q = query(usersRef);
    const querySnapshot = await getDocs(q);
    const userDoc = querySnapshot.docs.find(
      doc => doc.data().firebaseId === id
    );

    if (!userDoc) {
      return null;
    }

    const userData = userDoc.data();
    return {
      id: id,
      email: userData.email,
      username: userData.username,
      createdAt: userData.createdAt.toDate(),
      lastLogin: userData.lastLogin.toDate(),
    };
  }

  async getAllPrayers(): Promise<Prayer[]> {
    try {
      console.log('Fetching prayers from Firestore...');
      const prayersRef = collection(db, 'prayers');
      const q = query(prayersRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      
      console.log('Found prayers:', querySnapshot.size);
      
      const prayers = querySnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            username: data.username,
            content: data.content,
            timestamp: data.timestamp,
            prayerCount: data.prayerCount || 0,
            prayedBy: data.prayedBy || [],
            expiresAt: data.expiresAt,
          } as Prayer;
        })
        .filter(prayer => prayer.content && prayer.content.trim() !== ''); // Filter out empty prayers

      console.log('Processed prayers:', prayers.length);
      return prayers;
    } catch (error) {
      console.error('Error in getAllPrayers:', error);
      throw error;
    }
  }

  async addPrayer(prayer: Omit<Prayer, 'id' | 'expiresAt'>): Promise<void> {
    try {
      console.log('Adding new prayer:', prayer);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const newPrayer = {
        ...prayer,
        timestamp: now.getTime(),
        expiresAt: Timestamp.fromDate(expiresAt),
        prayerCount: 0,
        prayedBy: [],
      };

      console.log('Formatted prayer for Firestore:', newPrayer);
      const docRef = await addDoc(collection(db, 'prayers'), newPrayer);
      console.log('Prayer added with ID:', docRef.id);
    } catch (error) {
      console.error('Error in addPrayer:', error);
      console.error('Error adding prayer:', error);
      throw error;
    }
  }

  async getPrayers(): Promise<Prayer[]> {
    try {
      const now = new Date();
      const q = query(
        collection(db, 'prayers'),
        where('expiresAt', '>', Timestamp.fromDate(now)),
        orderBy('expiresAt', 'asc'),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Prayer[];
    } catch (error) {
      console.error('Error getting prayers:', error);
      throw error;
    }
  }

  async updatePrayerCount(prayerId: string, userId: string, isPraying: boolean): Promise<void> {
    const prayerRef = doc(db, 'prayers', prayerId);
    const prayerDoc = await getDoc(prayerRef);
    
    if (!prayerDoc.exists()) {
      throw new Error('Prayer not found');
    }

    const prayer = prayerDoc.data() as Prayer;
    const prayedBy = new Set(prayer.prayedBy);

    if (isPraying) {
      prayedBy.add(userId);
    } else {
      prayedBy.delete(userId);
    }

    await updateDoc(prayerRef, {
      prayerCount: prayedBy.size,
      prayedBy: Array.from(prayedBy),
    });
  }

  async deletePrayer(prayerId: string, userId: string): Promise<void> {
    try {
      const prayerRef = doc(db, 'prayers', prayerId);
      const prayerDoc = await getDoc(prayerRef);
      
      if (!prayerDoc.exists()) {
        throw new Error('Prayer not found');
      }

      const prayer = prayerDoc.data() as Prayer;
      
      // Verify the user owns this prayer
      if (prayer.userId !== userId) {
        throw new Error('Unauthorized: You can only delete your own prayers');
      }

      await deleteDoc(prayerRef);
      console.log('Prayer deleted successfully:', prayerId);
    } catch (error) {
      console.error('Error deleting prayer:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    await signOut(auth);
  }

  async signInWithGoogle(idToken: string): Promise<User> {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const { user: firebaseUser } = userCredential;

    // Check if user exists in our users collection
    const usersRef = collection(db, 'users');
    const q = query(usersRef);
    const querySnapshot = await getDocs(q);
    const userDoc = querySnapshot.docs.find(
      doc => doc.data().firebaseId === firebaseUser.uid
    );

    if (!userDoc) {
      // Create new user document if it doesn't exist
      const userData: Omit<User, 'id'> = {
        email: firebaseUser.email!,
        username: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      await addDoc(collection(db, 'users'), {
        firebaseId: firebaseUser.uid,
        ...userData,
      });

      return {
        id: firebaseUser.uid,
        ...userData,
      };
    }

    // Return existing user data
    const userData = userDoc.data();
    return {
      id: firebaseUser.uid,
      email: userData.email,
      username: userData.username,
      createdAt: userData.createdAt.toDate(),
      lastLogin: new Date(),
    };
  }

  async updateUserProfile(userId: string, updates: Partial<Omit<User, 'id' | 'email' | 'createdAt'>>): Promise<User> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      const userDoc = querySnapshot.docs.find(
        doc => doc.data().firebaseId === userId
      );

      if (!userDoc) {
        throw new Error('User not found');
      }

      const currentData = userDoc.data();
      const updatedData = {
        ...updates,
        lastLogin: new Date(),
      };

      await updateDoc(doc(db, 'users', userDoc.id), updatedData);

      // Return complete user object with all fields
      return {
        id: userId,
        email: currentData.email,
        username: updates.username || currentData.username,
        displayName: updates.displayName || currentData.displayName,
        bio: updates.bio || currentData.bio,
        createdAt: currentData.createdAt.toDate(),
        lastLogin: new Date(),
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async createConversation(userId: string, title: string): Promise<Conversation> {
    try {
      // Add detailed auth logging
      console.log('Creating conversation with auth state:', {
        currentUser: auth.currentUser ? {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          isAnonymous: auth.currentUser.isAnonymous,
        } : null,
        providedUserId: userId,
        isAuthenticated: !!auth.currentUser
      });

      if (!auth.currentUser?.uid) {
        throw new Error('User must be authenticated to create a conversation');
      }

      // Verify the passed userId matches the authenticated user
      if (userId !== auth.currentUser.uid) {
        console.warn('Passed userId does not match authenticated user', {
          passedUserId: userId,
          authenticatedUserId: auth.currentUser.uid
        });
      }

      const now = Timestamp.now();
      const conversationData = {
        userId: auth.currentUser.uid, // Always use the authenticated user's ID
        title,
        createdAt: now,
        lastUpdated: now,
        messageCount: 0,
      };

      console.log('Attempting to create conversation with data:', conversationData);

      const docRef = await addDoc(collection(db, 'conversations'), conversationData);
      console.log('Successfully created conversation with ID:', docRef.id);
      
      return {
        id: docRef.id,
        ...conversationData,
      };
    } catch (error) {
      console.error('Error creating conversation:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      throw error;
    }
  }

  async addMessage(
    conversationId: string,
    content: string,
    role: MessageRole,
    userId: string
  ): Promise<Message> {
    try {
      if (!auth.currentUser?.uid) {
        throw new Error('User must be authenticated to add a message');
      }

      const messageData = {
        conversationId,
        content,
        timestamp: Timestamp.now(),
        role,
        userId: auth.currentUser.uid,
      };

      const docRef = await addDoc(collection(db, 'messages'), messageData);
      
      // Update conversation's lastUpdated and messageCount
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        lastUpdated: messageData.timestamp,
        messageCount: increment(1),
      });

      return {
        id: docRef.id,
        ...messageData,
      };
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      if (!auth.currentUser?.uid) {
        throw new Error('User must be authenticated to get conversations');
      }

      const q = query(
        collection(db, 'conversations'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('lastUpdated', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Conversation));
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      if (!auth.currentUser?.uid) {
        throw new Error('User must be authenticated to get messages');
      }

      // First verify the conversation belongs to the current user
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (!conversationDoc.exists()) {
        throw new Error('Conversation not found');
      }

      const conversationData = conversationDoc.data();
      if (conversationData.userId !== auth.currentUser.uid) {
        throw new Error('Unauthorized: You can only access your own conversations');
      }

      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Message));
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    try {
      if (!auth.currentUser?.uid) {
        throw new Error('User must be authenticated to delete a conversation');
      }

      // First, verify the user owns this conversation
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (!conversationDoc.exists()) {
        throw new Error('Conversation not found');
      }

      const conversation = conversationDoc.data();
      if (conversation.userId !== auth.currentUser.uid) {
        throw new Error('Unauthorized: You can only delete your own conversations');
      }

      // Delete all messages in the conversation
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const batch = writeBatch(db);
      messagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete the conversation document
      batch.delete(conversationRef);
      
      await batch.commit();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }
}

export default FirebaseService.getInstance(); 