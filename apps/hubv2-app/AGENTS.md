# Hub V2 Mobile App

React Native + Expo + TypeScript mobile application for Hub V2 collaboration platform.

## Tech Stack

- Expo SDK 56 / React Native 0.85 / React 19
- Expo Router v5 (file-based routing)
- NativeWind v4 (Tailwind CSS for RN)
- Axios + @tanstack/react-query v5 + react-query-kit
- Zustand v5 (state management)
- react-native-mmkv (persistent storage)
- Zod (env validation)
- i18next (internationalization)

## Scripts

```bash
npm start          # Start Expo dev server
npm run web        # Start web mode
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint issues
npm run type-check # TypeScript type check
npm test           # Run tests
```

## Directory Structure

```
src/
├── app/                 # Expo Router file routes
│   ├── (auth)/          # Auth route group (login)
│   └── (app)/           # Main app route group (tabs)
├── components/ui/       # Shared UI components
├── features/            # Feature modules (auth, issues, rd, docs, dashboard, profile)
├── lib/                 # Shared libraries (api, auth, hooks, i18n, storage)
├── providers/           # Global providers
└── translations/        # i18n JSON files
```

## Architecture

- **Routing**: Expo Router with (auth)/(app) route groups for auth guard
- **API**: Axios client with cookie session auth, response interceptor unpacks `{ code, data, message }`
- **State**: Zustand for client state, React Query for server state
- **Storage**: MMKV for synchronous key-value persistence
- **Theme**: NativeWind (Tailwind CSS) with CSS custom properties for dark mode
- **i18n**: i18next with device locale detection

## Design Guidance

- Read `design/DESIGN.md` before implementing UI.
- The source HTML files in `design/` are dark mode references. Light mode must follow `design/AI_AGENT_LIGHT_THEME.md` and use semantic theme tokens instead of hardcoded dark colors.

## Environment

Copy `.env.example` to `.env` and configure:

```
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_URL=http://your-server:port/api
EXPO_PUBLIC_APP_NAME=Hub V2
```
