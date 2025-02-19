# Solomon AI - Christian Counseling App

Solomon AI is a mobile application that provides AI-powered Christian counseling and biblical guidance. Named after King Solomon, known for his wisdom, the app combines modern AI technology with biblical teachings to offer spiritual and emotional support.

## Features

- 🤝 **AI Christian Counseling**: Get personalized guidance from an AI counselor trained in biblical wisdom
- 📖 **Bible Integration**: Receive relevant NIV Bible verses for your situation
- 🙏 **Spiritual Support**: Combines professional counseling approaches with biblical principles
- 💬 **Interactive Chat**: User-friendly chat interface for natural conversations
- 📱 **Cross-Platform**: Built with React Native and Expo for iOS and Android

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development) or Android Studio (for Android development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/daelum/new-ai-counsellor.git
cd new-ai-counsellor
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
BIBLE_API_KEY=your_bible_api_key_here
```

4. Get your API keys:
- OpenAI API key from: https://platform.openai.com/api-keys
- Bible API key from: https://scripture.api.bible/

### Running the App

Start the development server:
```bash
npx expo start
```

- Press 'i' to open in iOS simulator
- Press 'a' to open in Android emulator
- Scan the QR code with Expo Go app on your device

## Project Structure

```
solomon-app/
├── src/
│   ├── screens/           # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── CounselingScreen.tsx
│   │   ├── BibleScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── services/          # API and business logic
│   │   ├── AIService.ts
│   │   └── BibleService.ts
│   └── types/            # TypeScript type definitions
├── assets/               # Images and static files
├── .env                 # Environment variables (not in git)
└── app.json            # Expo configuration
```

## Features in Detail

### AI Counseling
- Personalized spiritual guidance
- Biblical reference integration
- Conversation memory for context
- Empathetic and supportive responses

### Bible Integration
- NIV Bible verse search
- Verse analysis and context
- Daily verse suggestions
- Spiritual insights

### User Interface
- Modern, clean design
- Intuitive chat interface
- Dark mode support
- Responsive layout

## Security and Privacy

- API keys are stored securely in `.env` file
- Chat history is stored locally
- No personal data is collected
- Secure communication with APIs

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for GPT-4 API
- API.Bible for Scripture access
- React Native and Expo teams
- The open-source community

## Contact

Your Name - [@daelum](https://github.com/daelum)

Project Link: [https://github.com/daelum/new-ai-counsellor](https://github.com/daelum/new-ai-counsellor)
