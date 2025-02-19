import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import {
  getFirestore,
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
} from 'firebase/firestore';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID,
} from '@env';

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  measurementId: FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  lastLogin: Date;
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
}

export default FirebaseService.getInstance(); 