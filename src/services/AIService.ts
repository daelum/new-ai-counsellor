import OpenAI from 'openai';
import { OPENAI_API_KEY } from '@env';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

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

class AIService {
  private openai: OpenAI;
  private static instance: AIService;
  private conversationHistory: ChatCompletionMessageParam[];
  private sound: Audio.Sound | null = null;
  private recording: Audio.Recording | null = null;
  private recordingStatus: RecordingStatus = { isRecording: false, lastVolume: 0, silenceStart: 0 };
  private eventEmitter: SimpleEventEmitter = new SimpleEventEmitter();

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
        content: `You are a trained CBT therapist counselor. Your name is Solomon. You're also an expert in the NIV Bible. When somebody talks to you or asks you questions, you should respond as a trained cognitive behavioural therapist counselor providing guidance and thoughtful insights. Each time somebody responds, when appropriate, you should provide a reference from the NIV Bible. You should also provide a verse from the Bible that is relevant to the conversation. You should always ask a follow up question to the user, a question that will help them further explore their own thoughts and feelings. Don't sign your responses. If you are unable to provide the help the user is looking for, do not say 'I'm Really sorry that you're feeling this way, but I'm unable to provide the help that you need. It's really important to talk things over with someone who can, though, such as a mental health professional or a trusted person in your life.", instead provide a bible reference that may comfort them then ask them more about their situation, then refer them to a mental health professional.

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
    const SILENCE_THRESHOLD = -50; // dB
    const SILENCE_DURATION = 1500; // 1.5 seconds of silence before stopping

    while (this.recordingStatus.isRecording && this.recording) {
      try {
        const status = await this.recording.getStatusAsync();
        if (status.isRecording) {
          const metering = status.metering || -160;
          console.log('Current audio level:', metering);

          if (metering < SILENCE_THRESHOLD) {
            if (this.recordingStatus.silenceStart === 0) {
              this.recordingStatus.silenceStart = Date.now();
            } else if (Date.now() - this.recordingStatus.silenceStart > SILENCE_DURATION) {
              console.log('Silence detected, stopping recording...');
              // Don't call stopRecording here, just stop the actual recording
              if (this.recording) {
                const transcription = await this.stopVoiceRecording(this.recording);
                this.recording = null;
                
                if (transcription) {
                  console.log('Transcribed text:', transcription);
                  const aiResponse = await this.getCounselingResponse(transcription, true);
                  this.recordingStatus.isRecording = false;
                  this.emitRecordingState(false);
                  return { transcription, aiResponse };
                }
              }
              break;
            }
          } else {
            this.recordingStatus.silenceStart = 0;
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

  public async startVoiceRecording(): Promise<{ transcription: string; aiResponse: string } | null> {
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
        silenceStart: Date.now()
      };

      await this.recording.startAsync();
      this.emitRecordingState(true);
      return await this.monitorAudioLevel();
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.emitRecordingState(false);
      throw error;
    }
  }

  public async stopRecording(): Promise<{ transcription: string; aiResponse: string } | null> {
    if (!this.recording || !this.recordingStatus.isRecording) return null;

    try {
      const transcription = await this.stopVoiceRecording(this.recording);
      this.recording = null;
      
      if (transcription) {
        console.log('Transcribed text:', transcription);
        const aiResponse = await this.getCounselingResponse(transcription, true);
        
        // Only emit recording state change after we have the response
        this.recordingStatus.isRecording = false;
        this.emitRecordingState(false);
        
        return { transcription, aiResponse };
      }
      
      this.recordingStatus.isRecording = false;
      this.emitRecordingState(false);
      return null;
    } catch (error) {
      console.error('Error stopping recording:', error);
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
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      // Make the text-to-speech request using fetch
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

      // Get the audio data as a blob
      const audioData = await response.arrayBuffer();
      // Convert to base64
      const base64Audio = this.arrayBufferToBase64(audioData);
      const audioUri = `${FileSystem.documentDirectory}response.mp3`;
      
      await FileSystem.writeAsStringAsync(audioUri, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      this.sound = new Audio.Sound();
      await this.sound.loadAsync({ uri: audioUri });
      await this.sound.playAsync();
    } catch (error) {
      console.error('Failed to generate or play voice response:', error);
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

      if (useVoice) {
        console.log('Generating voice response...');
        await this.generateVoiceResponse(aiResponse);
      }

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

  public async analyzeBibleVerse(verse: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are Solomon, a biblical scholar providing insights into Bible verses. Focus on: 1) Historical context 2) Spiritual meaning 3) Practical application 4) Connection to other relevant verses"
          },
          { role: "user", content: `Please analyze this Bible verse: ${verse}` }
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      return response.choices[0]?.message?.content || 
        "I apologize, but I'm unable to analyze this verse at the moment. Please try again.";
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
            content: `You are a Bible expert specializing in the NIV translation. When given a search query, return 3 relevant Bible verses that best match the query. Return ONLY a JSON array of objects, each with 'verse' and 'reference' fields. Format: [{"verse": "full verse text", "reference": "Book Chapter:Verse"}]. No additional text or explanation.`
          },
          {
            role: "user",
            content: `Find Bible verses about: ${searchQuery}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
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
}

export default AIService; 