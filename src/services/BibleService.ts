import axios from 'axios';
import { BIBLE_API_KEY } from '@env';

interface BibleVerse {
  verse: number;
  text: string;
}

interface BibleChapter {
  chapter: number;
  verses: BibleVerse[];
}

interface BibleBook {
  name: string;
  chapters: number;
}

class BibleService {
  private static instance: BibleService;
  private readonly baseUrl = 'https://api.scripture.api.bible/v1';
  private readonly apiKey = BIBLE_API_KEY;
  private readonly version = '2f0fd81d8b85a5d8-01'; // NIV Bible ID
  private axiosInstance;

  private constructor() {
    if (!this.apiKey) {
      throw new Error('BIBLE_API_KEY environment variable is not set');
    }

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'api-key': this.apiKey,
        'Accept': 'application/json'
      }
    });

    // Log the API key being used (for debugging)
    console.log('Using Bible API Key:', this.apiKey);
  }

  public static getInstance(): BibleService {
    if (!BibleService.instance) {
      BibleService.instance = new BibleService();
    }
    return BibleService.instance;
  }

  public async getBooks(): Promise<BibleBook[]> {
    try {
      // Get all books
      const response = await this.axiosInstance.get(`/bibles/${this.version}/books`, {
        headers: {
          'api-key': this.apiKey,
          'Accept': 'application/json'
        }
      });
      const books = response.data.data;

      // Then get chapters for each book
      const booksWithChapters = await Promise.all(
        books.map(async (book: any) => {
          const chaptersResponse = await this.axiosInstance.get(
            `/bibles/${this.version}/books/${book.id}/chapters`,
            {
              headers: {
                'api-key': this.apiKey,
                'Accept': 'application/json'
              }
            }
          );
          const chapters = chaptersResponse.data.data;
          // Subtract 1 from length because the first "chapter" is usually an introduction
          const chapterCount = chapters.length - 1;
          
          return {
            name: book.name,
            chapters: chapterCount
          };
        })
      );

      return booksWithChapters;
    } catch (error: any) {
      console.error('Error fetching Bible books:', error.response?.data || error.message);
      throw new Error('Failed to fetch Bible books');
    }
  }

  public async getChapter(book: string, chapter: number): Promise<BibleChapter> {
    try {
      // First get the book ID
      const booksResponse = await this.axiosInstance.get(`/bibles/${this.version}/books`, {
        headers: {
          'api-key': this.apiKey,
          'Accept': 'application/json'
        }
      });
      const bookData = booksResponse.data.data.find((b: any) => b.name === book);
      if (!bookData) throw new Error(`Book ${book} not found`);

      // Then get the verses for this chapter
      const versesResponse = await this.axiosInstance.get(
        `/bibles/${this.version}/chapters/${bookData.id}.${chapter}/verses`,
        {
          headers: {
            'api-key': this.apiKey,
            'Accept': 'application/json'
          },
          params: {
            'content-type': 'text'
          }
        }
      );

      const verses = versesResponse.data.data.map((verse: any) => ({
        verse: parseInt(verse.number),
        text: verse.content
      }));

      return {
        chapter: chapter,
        verses: verses
      };
    } catch (error: any) {
      console.error('Error fetching Bible chapter:', error.response?.data || error.message);
      throw new Error(`Failed to fetch chapter ${chapter} from ${book}`);
    }
  }

  public async getVerse(book: string, chapter: number, verse: number): Promise<BibleVerse> {
    try {
      // First get the book ID
      const booksResponse = await this.axiosInstance.get(`/bibles/${this.version}/books`, {
        headers: {
          'api-key': this.apiKey,
          'Accept': 'application/json'
        }
      });
      const bookData = booksResponse.data.data.find((b: any) => b.name === book);
      if (!bookData) throw new Error(`Book ${book} not found`);

      // Then get the verse content
      const response = await this.axiosInstance.get(
        `/bibles/${this.version}/verses/${bookData.id}.${chapter}.${verse}`,
        {
          headers: {
            'api-key': this.apiKey,
            'Accept': 'application/json'
          },
          params: {
            'content-type': 'text'
          }
        }
      );

      return {
        verse: verse,
        text: response.data.data.content
      };
    } catch (error: any) {
      console.error('Error fetching Bible verse:', error.response?.data || error.message);
      throw new Error(`Failed to fetch verse ${verse} from ${book} ${chapter}`);
    }
  }
}

export default BibleService; 