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
  timestamp: Date;
  prayerCount: number;
  prayedBy: string[];
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
    const prayersRef = collection(db, 'prayers');
    const q = query(prayersRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(),
    })) as Prayer[];
  }

  async addPrayer(prayer: Omit<Prayer, 'id'>): Promise<Prayer> {
    const docRef = await addDoc(collection(db, 'prayers'), {
      ...prayer,
      timestamp: new Date(),
    });

    return {
      id: docRef.id,
      ...prayer,
    };
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