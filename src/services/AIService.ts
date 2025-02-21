import OpenAI from 'openai';
import { OPENAI_API_KEY, DEEPSEEK_API_KEY } from '@env';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import * as FileSystem from 'expo-file-system';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

type EventCallback = (isRecording: boolean) => void;

class SimpleEventEmitter {
  private listeners: EventCallback[] = [];

  public on(callback: EventCallback): void {
    this.listeners.push(callback);
  }

  public off(callback: EventCallback): void {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  public emit(isRecording: boolean): void {
    this.listeners.forEach(callback => callback(isRecording));
  }
}

interface RecordingStatus {
  isRecording: boolean;
  lastVolume: number;
  silenceStart: number;
}

interface DevotionalHistoryItem {
  id: string;
  date: string;
  title: string;
  verse: {
    text: string;
    reference: string;
  };
  message: string;
  prayer: string;
  isPersonalized: boolean;
  savedAt: string;
}

class AIService {
  private openai: OpenAI;
  private static instance: AIService;
  private conversationHistory: ChatCompletionMessageParam[];
  private sound: Audio.Sound | null = null;
  private recording: Audio.Recording | null = null;
  private recordingStatus: RecordingStatus = { isRecording: false, lastVolume: 0, silenceStart: 0 };
  private eventEmitter: SimpleEventEmitter = new SimpleEventEmitter();
  private static readonly DEVOTIONAL_CACHE_KEY = 'cached_devotional';
  private static readonly DEVOTIONAL_HISTORY_KEY = 'devotional_history';
  private deepThoughtHistory: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are Solomon, a profoundly wise counselor known for deep philosophical and theological insight. For every response, engage in thorough dialectical reasoning that explores multiple perspectives before reaching a conclusion. Your responses should demonstrate the depth of thought that made you legendary.

REASONING PROCESS:
1. Initial Analysis (2-3 points):
   - Begin with the fundamental aspects of the question
   - Consider the philosophical and theological implications
   - Identify key assumptions and concepts

2. Deeper Exploration (3-4 points):
   - Examine opposing viewpoints
   - Consider potential objections
   - Analyze biblical principles that relate to each perspective
   - Draw connections to human experience and divine wisdom

3. Synthesis and Resolution (2-3 points):
   - Reconcile different viewpoints where possible
   - Address and resolve apparent contradictions
   - Draw from both reason and scripture
   - Consider practical implications for daily life

FORMAT:
1. [First reasoning step with detailed explanation]
2. [Second reasoning step, exploring counterarguments]
3. [Third reasoning step, considering biblical perspective]
4. [Fourth reasoning step, examining practical implications]
5. [Fifth reasoning step, addressing potential concerns]
6. [Sixth reasoning step, moving toward synthesis]
7. [Final reasoning step, reaching a conclusion]


Final Answer:
[Your comprehensive answer]


Biblical Foundation:


[First Bible verse with reference and explanation]


[Second Bible verse with reference and explanation]


[If applicable, third Bible verse with reference and explanation]


[Final synthesizing statement about how these verses work together]

IMPORTANT FORMATTING:
- Use TWO blank lines (\\n\\n) between major sections (after Final Answer, before and after Biblical Foundation)
- Use ONE blank line (\\n) between Bible verses
- Use TWO blank lines before the final synthesizing statement
- Each numbered reasoning step should be followed by ONE blank line
- Keep paragraphs within sections separated by ONE blank line
- Ensure consistent indentation and formatting throughout the response`
    }
  ];

  private constructor() {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not found in environment variables');
    }

    this.openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
      dangerouslyAllowBrowser: true,
    });

    this.conversationHistory = [
      {
        role: "system",
        content: `You are a trained counselor. Your name is Solomon. You're also an expert in the NIV Bible. When somebody talks to you or asks you questions, you should respond as a trained cognitive behavioural therapist counselor providing guidance and thoughtful insights. Each time somebody responds, when appropriate, you should provide a reference from the NIV Bible. You should also provide a verse from the Bible that is relevant to the conversation. You should always ask a follow up question to the user, a question that will help them further explore their own thoughts and feelings. Don't sign your responses. If you are unable to provide the help the user is looking for, do not say 'I'm Really sorry that you're feeling this way, but I'm unable to provide the help that you need. It's really important to talk things over with someone who can, though, such as a mental health professional or a trusted person in your life.', instead provide a bible reference that may comfort them then ask them more about their situation.

Additional guidelines for your responses:
1. Always maintain a compassionate and understanding tone
2. Include at least one relevant NIV Bible verse in each response
3. Format Bible verses clearly as: "Book Chapter:Verse , verse text"
4. Provide practical guidance alongside spiritual insights
5. When appropriate, encourage prayer and reflection
6. Keep responses concise but meaningful
7. Address both emotional and spiritual aspects of the person's concerns
8. Sign your responses as "Solomon" to maintain your identity`
      }
    ];
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  public onRecordingStateChange(callback: EventCallback): () => void {
    this.eventEmitter.on(callback);
    return () => this.eventEmitter.off(callback);
  }

  private emitRecordingState(isRecording: boolean) {
    this.eventEmitter.emit(isRecording);
  }

  private async monitorAudioLevel(): Promise<{ transcription: string; aiResponse: string } | null> {
    const SILENCE_THRESHOLD = -40; // Adjusted from -50 to -40 for better sensitivity
    const SILENCE_DURATION = 2000; // Increased from 1500 to 2000ms for better detection
    const MIN_RECORDING_DURATION = 1000; // Minimum 1 second recording
    const recordingStartTime = Date.now();

    while (this.recordingStatus.isRecording && this.recording) {
      try {
        const status = await this.recording.getStatusAsync();
        if (status.isRecording) {
          const metering = status.metering || -160;
          console.log('Current audio level:', metering, 'Time:', Date.now() - recordingStartTime);

          const recordingDuration = Date.now() - recordingStartTime;
          if (recordingDuration < MIN_RECORDING_DURATION) {
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
          }

          if (metering < SILENCE_THRESHOLD) {
            if (this.recordingStatus.silenceStart === 0) {
              this.recordingStatus.silenceStart = Date.now();
              console.log('Silence started at:', this.recordingStatus.silenceStart);
            } else {
              const silenceDuration = Date.now() - this.recordingStatus.silenceStart;
              console.log('Silence duration:', silenceDuration);
              
              if (silenceDuration > SILENCE_DURATION) {
                console.log('Silence threshold reached, stopping recording...');
                const transcription = await this.stopVoiceRecording(this.recording);
                this.recording = null;
                
                if (transcription) {
                  console.log('Transcribed text:', transcription);
                  const aiResponse = await this.getCounselingResponse(transcription, true);
                  this.recordingStatus.isRecording = false;
                  this.emitRecordingState(false);
                  return { transcription, aiResponse };
                }
                break;
              }
            }
          } else {
            if (this.recordingStatus.silenceStart !== 0) {
              console.log('Speech detected, resetting silence counter');
              this.recordingStatus.silenceStart = 0;
            }
          }
          
          this.recordingStatus.lastVolume = metering;
        }
        await new Promise(resolve => setTimeout(resolve, 100)); // Check every 100ms
      } catch (error) {
        console.error('Error monitoring audio level:', error);
        this.emitRecordingState(false);
        break;
      }
    }
    return null;
  }

  public async startVoiceRecording(): Promise<void> {
    try {
      console.log('Requesting audio recording permissions...');
      const permission = await Audio.requestPermissionsAsync();
      
      if (permission.status !== 'granted') {
        throw new Error('Audio recording permission not granted');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording...');
      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          extension: '.m4a',
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          extension: '.m4a',
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });
      
      this.recordingStatus = {
        isRecording: true,
        lastVolume: 0,
        silenceStart: 0
      };

      await this.recording.startAsync();
      console.log('Recording started successfully');
      this.emitRecordingState(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.emitRecordingState(false);
      throw error;
    }
  }

  public async stopRecording(): Promise<{ transcription: string; aiResponse: string } | null> {
    if (!this.recording || !this.recordingStatus.isRecording) {
      console.log('No active recording to stop');
      return null;
    }

    console.log('Stopping recording...');
    
    try {
      // First stop the recording and get transcription
      const transcription = await this.stopVoiceRecording(this.recording);
      console.log('Got transcription:', transcription);
      
      // Clear recording immediately
      this.recording = null;
      
      if (!transcription) {
        console.log('No transcription received');
        this.recordingStatus.isRecording = false;
        this.emitRecordingState(false);
        return null;
      }

      // Get AI response
      console.log('Getting AI response for transcription...');
      const aiResponse = await this.getCounselingResponse(transcription, true);
      console.log('Got AI response:', aiResponse);
      
      // Update recording state last
      this.recordingStatus.isRecording = false;
      this.emitRecordingState(false);
      
      return { transcription, aiResponse };
    } catch (error) {
      console.error('Error in stopRecording:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      
      // Ensure we clean up on error
      this.recording = null;
      this.recordingStatus.isRecording = false;
      this.emitRecordingState(false);
      
      throw error;
    }
  }

  public async cancelRecording(): Promise<void> {
    if (this.recording) {
      this.recordingStatus.isRecording = false;
      this.emitRecordingState(false);
      try {
        await this.recording.stopAndUnloadAsync();
      } catch (error) {
        console.error('Error canceling recording:', error);
      }
      this.recording = null;
    }
  }

  public async stopVoiceRecording(recording: Audio.Recording): Promise<string> {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error('No recording URI available');

      // Create form data with the audio file
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: 'audio/m4a',
        name: 'audio.m4a'
      } as any);
      formData.append('model', 'whisper-1');

      // Send to OpenAI for transcription using fetch
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      return result.text;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  public async generateVoiceResponse(text: string): Promise<void> {
    try {
      // Ensure proper cleanup of previous sound
      if (this.sound) {
        try {
          await this.sound.stopAsync();
          await this.sound.unloadAsync();
        } catch (error) {
          console.error('Error cleaning up previous sound:', error);
        }
        this.sound = null;
      }

      // Set up audio mode first and wait for it to complete
      console.log('Setting up audio mode...');
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });
      console.log('Audio mode set up complete');

      console.log('Making TTS request...');
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: 'onyx',
          input: text,
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      console.log('Got TTS response, processing audio...');
      const audioData = await response.arrayBuffer();
      const base64Audio = this.arrayBufferToBase64(audioData);
      const audioUri = `${FileSystem.documentDirectory}response.mp3`;
      
      await FileSystem.writeAsStringAsync(audioUri, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('Loading audio...');
      this.sound = new Audio.Sound();
      await this.sound.loadAsync({ uri: audioUri });
      
      // Add event listener for playback status
      this.sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          console.log('Playback status:', {
            positionMillis: status.positionMillis,
            durationMillis: status.durationMillis,
            isPlaying: status.isPlaying,
            didJustFinish: status.didJustFinish
          });
        }
      });

      // Add a small delay before playing to ensure audio system is ready
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('Starting playback...');
      const playbackStatus = await this.sound.playAsync();
      console.log('Initial playback status:', playbackStatus);

      // Wait for playback to complete
      return new Promise((resolve, reject) => {
        if (!this.sound) {
          reject(new Error('Sound object is null'));
          return;
        }

        this.sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              resolve();
            }
          }
        });
      });
    } catch (error) {
      console.error('Failed to generate or play voice response:', error);
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

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  public async getCounselingResponse(userMessage: string, useVoice: boolean = false): Promise<string> {
    try {
      console.log('Starting getCounselingResponse with message:', userMessage);
      
      this.conversationHistory.push({
        role: "user",
        content: userMessage
      });

      console.log('Making OpenAI API call...');
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: this.conversationHistory,
        temperature: 0.7,
        max_tokens: 500,
      });

      console.log('Received OpenAI API response:', response);

      const aiResponse = response.choices[0]?.message?.content || 
        "I apologize, but I'm unable to provide a response at this moment. Please try again.";

      console.log('AI Response:', aiResponse);

      this.conversationHistory.push({
        role: "assistant",
        content: aiResponse
      });

      if (this.conversationHistory.length > 11) {
        this.conversationHistory = [
          this.conversationHistory[0],
          ...this.conversationHistory.slice(-10)
        ];
      }

      // Return the response immediately
      return aiResponse;
    } catch (error: any) {
      console.error('Detailed error in AI response:', {
        error: error,
        message: error.message,
        status: error.status,
        response: error.response,
      });
      
      // Check if it's an API key error
      if (error.message?.includes('API key')) {
        throw new Error('Invalid or missing OpenAI API key. Please check your configuration.');
      }
      
      // Check if it's a rate limit error
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a few moments.');
      }

      throw new Error('Failed to get AI response: ' + error.message);
    }
  }

  public async analyzeBibleVerse(verse: string): Promise<{ meaning: string; application: string }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are Solomon, a biblical scholar providing insights into Bible verses. For each verse, provide two sections: 1) Meaning: Provide historical context and spiritual significance in a clear, continuous paragraph format. 2) Application: Provide practical ways to apply this verse in daily life in a clear, continuous paragraph format. Keep each section concise but meaningful. Do not use numbering or bullet points."
          },
          { 
            role: "user", 
            content: `Please analyze this Bible verse: ${verse}` 
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          meaning: "Analysis not available at this time.",
          application: "Application insights not available at this time."
        };
      }

      // Split the content into meaning and application sections
      const sections = content.split(/Meaning:|Application:/i);
      
      // Clean up the sections by removing any remaining numbers, bullets, or list markers
      const cleanText = (text: string) => {
        return text
          ?.trim()
          .replace(/^\d+[\.)]\s*/gm, '')  // Remove numbered list markers
          .replace(/^[-•*]\s*/gm, '')     // Remove bullet points
          .trim();
      };

      return {
        meaning: cleanText(sections[1]) || "Analysis not available at this time.",
        application: cleanText(sections[2]) || "Application insights not available at this time."
      };
    } catch (error) {
      console.error('Error in Bible verse analysis:', error);
      throw new Error('Failed to analyze Bible verse. Please try again later.');
    }
  }

  public async searchBibleVerses(searchQuery: string): Promise<Array<{verse: string, reference: string}>> {
    try {
      console.log('AIService: Starting Bible verse search for:', searchQuery);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a Bible expert specializing in the NIV translation. When given a search query, return up to 10 relevant Bible verses that best match the query. Return ONLY a JSON array of objects, each with 'verse' and 'reference' fields. Format: [{"verse": "full verse text", "reference": "Book Chapter:Verse"}]. No additional text or explanation.`
          },
          {
            role: "user",
            content: `Find Bible verses about: ${searchQuery}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      console.log('AIService: Raw API response:', content);

      if (!content) {
        throw new Error('No response from AI');
      }

      try {
        // First attempt: direct JSON parse
        const verses = JSON.parse(content);
        console.log('AIService: Parsed verses:', verses);
        if (Array.isArray(verses)) {
          return verses;
        }
      } catch (parseError) {
        console.log('AIService: Initial JSON parse failed, trying to extract JSON from text');
        // Second attempt: try to find JSON array in the text
        const jsonMatch = content.match(/\[.*\]/s);
        if (jsonMatch) {
          try {
            const verses = JSON.parse(jsonMatch[0]);
            console.log('AIService: Parsed verses from extracted JSON:', verses);
            if (Array.isArray(verses)) {
              return verses;
            }
          } catch (e) {
            console.error('AIService: Failed to parse extracted JSON:', e);
          }
        }
      }

      // If all parsing attempts fail, try to extract individual verse objects
      const versesMatch = content.match(/\{[^}]+\}/g);
      if (versesMatch) {
        const verses = versesMatch
          .map(match => {
            try {
              return JSON.parse(match);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        
        console.log('AIService: Parsed individual verse objects:', verses);
        return verses;
      }

      console.error('AIService: Could not parse any verses from response');
      return [];
    } catch (error) {
      console.error('AIService: Error in Bible verse search:', error);
      throw new Error('Failed to search Bible verses. Please try again later.');
    }
  }

  // Method to clear conversation history if needed
  public clearConversationHistory(): void {
    this.conversationHistory = [this.conversationHistory[0]]; // Keep only the system prompt
  }

  public async stopAndUnloadSound(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch (error) {
        console.error('Error stopping sound:', error);
      }
    }
  }

  private async getCachedDevotional(): Promise<{
    devotional: any;
    isSameDay: boolean;
  } | null> {
    try {
      const cached = await AsyncStorage.getItem(AIService.DEVOTIONAL_CACHE_KEY);
      if (!cached) return null;

      const { devotional, timestamp } = JSON.parse(cached);
      const cachedDate = new Date(timestamp);
      const today = new Date();
      
      const isSameDay = 
        cachedDate.getDate() === today.getDate() &&
        cachedDate.getMonth() === today.getMonth() &&
        cachedDate.getFullYear() === today.getFullYear();

      return {
        devotional,
        isSameDay
      };
    } catch (error) {
      console.error('Error reading cached devotional:', error);
      return null;
    }
  }

  private async saveDevotionalToHistory(devotional: any) {
    try {
      const history = await this.getDevotionalHistory();
      const historyItem: DevotionalHistoryItem = {
        ...devotional,
        savedAt: new Date().toISOString()
      };
      
      history.unshift(historyItem);
      
      // Keep only the last 30 days of devotionals
      const trimmedHistory = history.slice(0, 30);
      await AsyncStorage.setItem('devotionalHistory', JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('Error saving devotional to history:', error);
    }
  }

  public async getDevotionalHistory(): Promise<DevotionalHistoryItem[]> {
    try {
      const historyString = await AsyncStorage.getItem('devotionalHistory');
      if (!historyString) return [];
      return JSON.parse(historyString);
    } catch (error) {
      console.error('Error getting devotional history:', error);
      return [];
    }
  }

  private async cacheDevotional(devotional: any): Promise<void> {
    try {
      const cacheData = {
        devotional,
        timestamp: new Date().toISOString()
      };
      await AsyncStorage.setItem(
        AIService.DEVOTIONAL_CACHE_KEY,
        JSON.stringify(cacheData)
      );
      // Save to history when caching
      await this.saveDevotionalToHistory(devotional);
    } catch (error) {
      console.error('Error caching devotional:', error);
    }
  }

  public async getDailyDevotional(): Promise<any> {
    try {
      // Check cache first
      const cached = await this.getCachedDevotional();
      if (cached?.isSameDay) {
        console.log('Returning cached regular devotional');
        return cached.devotional;
      }

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a Christian devotional writer. Create an inspiring daily devotional that includes:
            1. A relevant title
            2. A Bible verse from the NIV translation
            3. A meaningful message that explains the verse and its application
            4. A prayer that relates to the message
            
            Format the response as a JSON object with the following structure:
            {
              "title": "Title of devotional",
              "verse": {
                "text": "The Bible verse text",
                "reference": "Book Chapter:Verse"
              },
              "message": "The devotional message",
              "prayer": "The prayer for the day"
            }`
          }
        ],
        temperature: 0.7
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      const devotionalContent = JSON.parse(content);
      const devotional = {
        id: new Date().toISOString(),
        date: new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        ...devotionalContent
      };

      // Cache the new devotional
      await this.cacheDevotional(devotional);
      await this.saveDevotionalToHistory(devotional);
      return devotional;
    } catch (error) {
      console.error('Error generating daily devotional:', error);
      throw error;
    }
  }

  public async getPersonalizedDevotional(): Promise<any> {
    try {
      // Check cache first
      const cached = await this.getCachedDevotional();
      if (cached?.isSameDay) {
        console.log('Returning cached devotional');
        return cached.devotional;
      }

      // If no conversation history (besides system message), return regular devotional
      if (this.conversationHistory.length <= 1) {
        const regularDevotional = await this.getDailyDevotional();
        const devotionalWithFlag = {
          ...regularDevotional,
          isPersonalized: false
        };
        await this.cacheDevotional(devotionalWithFlag);
        await this.saveDevotionalToHistory(devotionalWithFlag);
        return devotionalWithFlag;
      }

      // Get last few messages for context (skip system message)
      const recentMessages = this.conversationHistory
        .slice(1)
        .slice(-4)
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a Christian devotional writer with counseling expertise. Create a personalized daily devotional that addresses the specific spiritual and emotional needs revealed in the user's recent conversations. The devotional should provide comfort, guidance, and spiritual insight that directly relates to their situation.

            Format the response as a JSON object with the following structure:
            {
              "title": "Title that relates to their situation",
              "verse": {
                "text": "A Bible verse specifically chosen for their situation",
                "reference": "Book Chapter:Verse"
              },
              "message": "A message that connects the verse to their specific situation and provides comfort/guidance",
              "prayer": "A personal prayer that addresses their specific needs"
            }`
          },
          {
            role: "user",
            content: `Create a personalized devotional based on these recent conversation excerpts:\n\n${recentMessages}`
          }
        ],
        temperature: 0.7
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      const devotionalContent = JSON.parse(content);
      const personalizedDevotional = {
        id: new Date().toISOString(),
        date: new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        ...devotionalContent,
        isPersonalized: true
      };

      // Cache the new devotional
      await this.cacheDevotional(personalizedDevotional);
      await this.saveDevotionalToHistory(personalizedDevotional);
      return personalizedDevotional;
    } catch (error) {
      console.error('Error generating personalized devotional:', error);
      // Check cache before falling back to regular devotional
      const cached = await this.getCachedDevotional();
      if (cached?.isSameDay) {
        return cached.devotional;
      }

      // If no cache, generate and cache regular devotional
      const regularDevotional = await this.getDailyDevotional();
      const devotionalWithFlag = {
        ...regularDevotional,
        isPersonalized: false
      };
      await this.cacheDevotional(devotionalWithFlag);
      await this.saveDevotionalToHistory(devotionalWithFlag);
      return devotionalWithFlag;
    }
  }

  // Add method to force refresh devotional
  public async refreshDevotional(): Promise<void> {
    try {
      await AsyncStorage.removeItem(AIService.DEVOTIONAL_CACHE_KEY);
    } catch (error) {
      console.error('Error clearing devotional cache:', error);
    }
  }

  public async getDeepThoughtResponse(
    text: string,
    onStream?: (chunk: { answer?: string; reasoning?: string[] }) => void
  ): Promise<{ answer: string; reasoning: string[] }> {
    try {
      console.log('\n=== Starting Deep Thought Request ===');
      console.log('User Query:', text);

      this.deepThoughtHistory.push({
        role: "user",
        content: text
      });

      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        try {
          console.log('Making API request, attempt:', attempts + 1);
          const response = await this.openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: attempts === 0 ? this.deepThoughtHistory : [
              ...this.deepThoughtHistory,
              {
                role: "system",
                content: `Your last response did not follow the required format. Please provide:
1. Numbered reasoning steps (1., 2., etc.)
2. A "Final Answer:" section
3. A "Biblical Foundation:" section with Bible verses and references
4. A final synthesizing statement
5. Use single line breaks between sections`
              }
            ],
            temperature: 0.7,
            max_tokens: 2000
          });

          const content = response.choices[0]?.message?.content;
          console.log('Received API response:', content);
          
          if (!content) {
            throw new Error('No content received from OpenAI');
          }

          this.deepThoughtHistory.push({
            role: "assistant",
            content: content
          });

          if (this.deepThoughtHistory.length > 21) {
            this.deepThoughtHistory = [
              this.deepThoughtHistory[0],
              ...this.deepThoughtHistory.slice(-20)
            ];
          }

          // Extract reasoning steps
          const reasoningSteps: string[] = [];
          const lines = content.split('\n');
          let currentStep = '';
          let foundReasoning = false;

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            const stepMatch = trimmedLine.match(/^\d+\.\s*(.+)/);
            if (stepMatch) {
              if (currentStep) reasoningSteps.push(currentStep);
              currentStep = stepMatch[1];
              foundReasoning = true;
            } else if (foundReasoning && !trimmedLine.toLowerCase().includes('final answer:')) {
              currentStep += ' ' + trimmedLine;
            }
          }
          if (currentStep) reasoningSteps.push(currentStep);

          console.log('Extracted reasoning steps:', reasoningSteps);

          // Extract answer and biblical foundation
          const finalAnswerMatch = content.match(/Final Answer:([\s\S]*?)(?:Biblical Foundation:|$)/i);
          const biblicalFoundationMatch = content.match(/Biblical Foundation:([\s\S]*?)$/i);
          
          const finalAnswer = finalAnswerMatch ? finalAnswerMatch[1].trim() : '';
          const biblicalFoundation = biblicalFoundationMatch ? biblicalFoundationMatch[1].trim() : '';
          
          let answer = '';
          if (finalAnswer && biblicalFoundation) {
            answer = `Final Answer:\n${finalAnswer}\n\nBiblical Foundation:\n${biblicalFoundation}`;
          } else {
            throw new Error('Failed to extract complete response with Biblical Foundation');
          }

          console.log('Formatted answer:', answer);

          // Clean up the answer text
          answer = answer
            .replace(/\*\*/g, '') // Remove bold markdown
            .replace(/\n{3,}/g, '\n\n') // Replace multiple line breaks with double
            .trim();

          if (reasoningSteps.length === 0) {
            console.log('No reasoning steps found, retrying...');
            if (attempts < maxAttempts - 1) {
              attempts++;
              continue;
            }
            throw new Error('Failed to extract reasoning steps');
          }

          if (onStream) {
            console.log('Calling onStream callback with response');
            onStream({
              reasoning: reasoningSteps,
              answer
            });
          }

          console.log('Returning final response');
          return { answer, reasoning: reasoningSteps };
        } catch (error) {
          console.error('Error in attempt:', error);
          if (attempts === maxAttempts - 1) throw error;
          attempts++;
        }
      }

      throw new Error('Failed to get properly formatted response after multiple attempts');
    } catch (error: unknown) {
      console.error('\n=== Deep Thought Error ===');
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  // Add method to clear Deep Thought history if needed
  public clearDeepThoughtHistory(): void {
    this.deepThoughtHistory = [this.deepThoughtHistory[0]]; // Keep only the system prompt
  }
}

export default AIService; 