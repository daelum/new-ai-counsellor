import OpenAI from 'openai';
import { OPENAI_API_KEY } from '@env';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

class AIService {
  private openai: OpenAI;
  private static instance: AIService;
  private conversationHistory: ChatCompletionMessageParam[];
  private sound: Audio.Sound | null = null;

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
        content: `You are a trained counselor. Your name is Solomon. You're also an expert in the NIV Bible. When somebody talks to you or asks you questions, you should respond as a trained counselor providing guidance and thoughtful insights. Each time somebody responds, when appropriate, you should provide a reference from the NIV Bible. You should also provide a verse from the Bible that is relevant to the conversation. You should always ask a follow up question to the user, a question that will help them further explore their own thoughts and feelings. Don't sign your responses. If you are unable to provide the help the user is looking for, do not say 'I'm Really sorry that you're feeling this way, but I'm unable to provide the help that you need. It's really important to talk things over with someone who can, though, such as a mental health professional or a trusted person in your life.", instead provide a bible reference that may comfort them then ask them more about their situation.

Additional guidelines for your responses:
1. Always maintain a compassionate and understanding tone
2. Include at least one relevant NIV Bible verse in each response
3. Format Bible verses clearly as: "[Book Chapter:Verse] (NIV): [verse text]"
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

  public async startVoiceRecording(): Promise<Audio.Recording> {
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
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      
      return recording;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  public async stopVoiceRecording(recording: Audio.Recording): Promise<string> {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error('No recording URI available');

      // Convert the audio to base64
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Send to OpenAI for transcription
      const transcript = await this.openai.audio.transcriptions.create({
        file: new File([Buffer.from(base64Audio, 'base64')], 'audio.m4a', {
          type: 'audio/m4a',
        }),
        model: 'whisper-1',
      });

      return transcript.text;
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

      const mp3Response = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: 'onyx', // Using a deep, wise-sounding voice for Solomon
        input: text,
      });

      const base64Audio = Buffer.from(await mp3Response.arrayBuffer()).toString('base64');
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

  public async getCounselingResponse(userMessage: string, useVoice: boolean = false): Promise<string> {
    try {
      this.conversationHistory.push({
        role: "user",
        content: userMessage
      });

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: this.conversationHistory,
        temperature: 0.7,
        max_tokens: 500,
      });

      const aiResponse = response.choices[0]?.message?.content || 
        "I apologize, but I'm unable to provide a response at this moment. Please try again.";

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
        await this.generateVoiceResponse(aiResponse);
      }

      return aiResponse;
    } catch (error) {
      console.error('Error in AI response:', error);
      throw new Error('Failed to get AI response. Please try again later.');
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