import { collection, addDoc, getDocs, query, where, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Prayer {
  id: string;
  userId: string;
  text: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  userName: string;
}

class PrayerService {
  private static instance: PrayerService;
  private readonly COLLECTION_NAME = 'prayers';

  private constructor() {}

  static getInstance(): PrayerService {
    if (!PrayerService.instance) {
      PrayerService.instance = new PrayerService();
    }
    return PrayerService.instance;
  }

  async addPrayer(userId: string, text: string, userName: string): Promise<void> {
    const now = Timestamp.now();
    // Calculate expiration date (7 days from now)
    const expiresAt = new Timestamp(
      now.seconds + (7 * 24 * 60 * 60), // 7 days in seconds
      now.nanoseconds
    );

    await addDoc(collection(db, this.COLLECTION_NAME), {
      userId,
      text,
      userName,
      createdAt: now,
      expiresAt,
    });
  }

  async getPrayers(): Promise<Prayer[]> {
    const now = Timestamp.now();
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Prayer));
  }
}

export default PrayerService; 