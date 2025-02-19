import OpenAI from 'openai';
import { OPENAI_API_KEY } from '@env';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

class AIService {
  private openai: OpenAI;
  private static instance: AIService;
  private conversationHistory: ChatCompletionMessageParam[];

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
        content: `You are a trained counselor. Your name is Solomon. You're also an expert in the NIV Bible. When somebody talks to you or asks you questions, you should respond as a trained counselor providing guidance and thoughtful insights, as well as a reference. Each time somebody responds, when appropriate, you should provide a reference from the NIV Bible. You should also provide a verse from the Bible that is relevant to the conversation. You should always ask a follow up question to the user, a question that will help them further explore their own thoughts and feelings. Don't sign your responses.

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

  public async getCounselingResponse(userMessage: string): Promise<string> {
    try {
      // Add user message to conversation history
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

      // Add AI response to conversation history
      this.conversationHistory.push({
        role: "assistant",
        content: aiResponse
      });

      // Keep conversation history manageable (last 10 messages)
      if (this.conversationHistory.length > 11) { // 1 system prompt + 10 messages
        this.conversationHistory = [
          this.conversationHistory[0],
          ...this.conversationHistory.slice(-10)
        ];
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

  // Method to clear conversation history if needed
  public clearConversationHistory(): void {
    this.conversationHistory = [this.conversationHistory[0]]; // Keep only the system prompt
  }
}

export default AIService; 