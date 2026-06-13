import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SettingsView } from '../App';

describe('Settings and Accessibility', () => {
  const defaultProps: React.ComponentProps<typeof SettingsView> = {
    styles: {} as React.ComponentProps<typeof SettingsView>['styles'],
    taskCount: 5,
    theme: {
      name: 'light',
      bg: '#fff',
      card: '#fff',
      surface: '#fff',
      surfaceStrong: '#fff',
      text: '#000',
      muted: '#666',
      soft: '#999',
      border: '#ccc',
      accent: '#00f',
      accentSoft: '#ccf',
      tab: '#fff',
      danger: '#f00',
      success: '#0a0',
    },
    themeName: 'light',
    setThemeName: jest.fn(),
    fontScale: 1,
    setFontScale: jest.fn(),
    voiceMode: false,
    setVoiceMode: jest.fn(),
    reminderOffset: 60,
    setReminderOffset: jest.fn(),
    resetData: jest.fn(),
    imageCount: 2,
    audioCount: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders settings sections', () => {
    const { getByText } = render(<SettingsView {...defaultProps} />);

    expect(getByText('Modo de apariencia')).toBeTruthy();
    expect(getByText('Accesibilidad')).toBeTruthy();
  });

  it('changes to the dark theme with the appearance switch', () => {
    const setThemeName = jest.fn();
    const { getAllByRole } = render(
      <SettingsView {...defaultProps} setThemeName={setThemeName} />,
    );

    fireEvent(getAllByRole('switch')[0], 'valueChange', true);

    expect(setThemeName).toHaveBeenCalledWith('dark');
  });

  it('calls resetData when the reset button is pressed', () => {
    const resetData = jest.fn();
    const { getByText } = render(<SettingsView {...defaultProps} resetData={resetData} />);

    fireEvent.press(getByText('Reiniciar datos de prueba'));

    expect(resetData).toHaveBeenCalledTimes(1);
  });

  it('shows task and multimedia totals', () => {
    const { getByText } = render(
      <SettingsView {...defaultProps} taskCount={42} imageCount={4} audioCount={3} />,
    );

    expect(getByText('42')).toBeTruthy();
    expect(getByText('7')).toBeTruthy();
  });

  it('changes the font scale', () => {
    const setFontScale = jest.fn();
    const { getByText } = render(<SettingsView {...defaultProps} setFontScale={setFontScale} />);

    fireEvent.press(getByText('Grande'));

    expect(setFontScale).toHaveBeenCalledWith(1.15);
  });
});
