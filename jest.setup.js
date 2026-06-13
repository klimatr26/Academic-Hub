// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Expo SQLite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    execAsync: jest.fn(() => Promise.resolve()),
    runAsync: jest.fn(() => Promise.resolve()),
    getFirstAsync: jest.fn(() => Promise.resolve({ count: 1, value: 'light' })),
    getAllAsync: jest.fn(() => Promise.resolve([])),
  })),
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    runSync: jest.fn(),
    getAllSync: jest.fn(() => []),
  })),
}));

// Mock Expo Notifications
jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: {
    DATE: 'date',
  },
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));

// Mock lucide-react-native icons to render simple Views
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (target, prop) => {
        return (props) => React.createElement(View, { testID: `icon-${prop}`, ...props });
      },
    }
  );
});

// Mock React 19 test renderer requirement
if (typeof window === 'undefined') {
  global.window = {};
}
if (!window.dispatchEvent) {
  window.dispatchEvent = jest.fn();
}

// Mock react-native-calendars
jest.mock('react-native-calendars', () => ({
  Calendar: 'Calendar',
  LocaleConfig: {
    locales: {},
    defaultLocale: 'es',
  },
}));

// Mock missing native modules
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  return (props) => React.createElement(View, { ...props, testID: 'dateTimePicker' });
});

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock/',
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true })),
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock/',
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true })),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: true })),
}));

jest.mock('expo-audio', () => ({
  useAudioRecorder: jest.fn(() => ({
    prepareToRecordAsync: jest.fn(() => Promise.resolve()),
    record: jest.fn(),
    stop: jest.fn(() => Promise.resolve()),
    uri: null,
    getStatus: jest.fn(() => ({ url: null })),
  })),
  useAudioRecorderState: jest.fn(() => ({
    isRecording: false,
    durationMillis: 0,
  })),
  RecordingPresets: {
    HIGH_QUALITY: 'high_quality',
  },
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
  })),
  requestRecordingPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  Audio: {
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({ sound: { playAsync: jest.fn(), unloadAsync: jest.fn() } })),
    },
  },
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

jest.mock('react-native-edge-to-edge', () => ({
  SystemBars: () => null,
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: ({ children }) => children({ top: 0, right: 0, bottom: 0, left: 0 }),
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});
