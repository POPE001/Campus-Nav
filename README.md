# My OAU - Campus Navigation & Student Hub

[![React Native](https://img.shields.io/badge/React%20Native-0.74-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-51-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A comprehensive cross-platform mobile application for **Obafemi Awolowo University (OAU)** students and staff. Built with React Native and Expo, this app provides intelligent campus navigation, academic scheduling, and community features to enhance the university experience.

## Features

### Smart Campus Navigation
- **Interactive Maps**: Powered by Google Maps with real-time location tracking
- **Venue Discovery**: Comprehensive database of campus locations and facilities
- **Route Planning**: Turn-by-turn navigation across campus
- **Location Search**: Find buildings, offices, lecture halls, and amenities

### Academic Management
- **Course Scheduling**: Manage your class timetables
- **Academic Calendar**: Stay updated with important dates
- **Schedule Notifications**: Never miss a class or deadline

### Campus Community
- **Campus News**: Latest university announcements and updates
- **Push Notifications**: Real-time alerts for important information
- **User Profiles**: Separate experiences for students and staff

### User Experience
- **Cross-Platform**: Available on iOS, Android, and Web
- **Dark/Light Theme**: Adaptive UI design
- **Accessibility**: Font size customization and screen reader support

## Tech Stack

- **Frontend**: React Native with Expo
- **Navigation**: Expo Router with file-based routing
- **Maps**: Google Maps API integration
- **Location**: Expo Location services
- **Notifications**: Expo Notifications
- **State Management**: React Context API
- **Backend**: Supabase (Authentication & Database)
- **Languages**: TypeScript, JavaScript

## Supported Platforms

-    **iOS** (iPhone & iPad)
-    **Android** (Phone & Tablet)
-    **Web** (Progressive Web App)

##   Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/campus-nav.git
   cd campus-nav
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables in `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

### API Keys Setup

#### Google Maps API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Maps SDK for Android, Maps SDK for iOS, and Maps JavaScript API
4. Create API credentials and add to `.env`

#### Supabase Setup
1. Create account at [Supabase](https://supabase.com/)
2. Create new project
3. Get your project URL and anon key from project settings
4. Add to `.env` file

## 📁 Project Structure

```
campus-nav/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab-based navigation screens
│   ├── auth/              # Authentication screens
│   └── _layout.tsx        # Root layout
├── components/            # Reusable UI components
│   ├── Map.tsx           # Map components
│   ├── Navigation/       # Navigation components
│   └── UI/               # General UI components
├── constants/            # App constants and configs
├── contexts/             # React Context providers
├── hooks/                # Custom React hooks
├── services/             # API and external services
├── assets/               # Images, fonts, and static files
└── android/              # Android-specific files
```

## Usage

### For Students
1. **Register** with your email
2. **Set up your profile** and course schedule
3. **Navigate campus** using the interactive map
4. **Stay updated** with campus news and notifications

### For Staff
1. **Register** with staff credentials
2. **Manage your schedule** and office hours
3. **Access staff-specific features** and announcements
4. **Navigate to meetings** and campus locations

##  Building for Production

### Android
```bash
npx expo build:android
```

### iOS
```bash
npx expo build:ios
```

### Web
```bash
npx expo export:web
```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Obafemi Awolowo University for inspiration
- React Native and Expo teams for the amazing frameworks
- Google Maps for location services
- Supabase for backend infrastructure

---

<div align="center">
  <strong>Built with ❤️ for the OAU Community</strong>
</div>
