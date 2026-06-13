import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { TaskModal } from '../App';

describe('Task UI', () => {
  const defaultProps: React.ComponentProps<typeof TaskModal> = {
    courses: ['IHC'],
    defaultDate: '2026-06-12',
    initialDraft: null,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    styles: {} as React.ComponentProps<typeof TaskModal>['styles'],
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
    visible: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the task form when visible', () => {
    const { getByText } = render(<TaskModal {...defaultProps} />);

    expect(getByText('Nueva actividad')).toBeTruthy();
    expect(getByText('Guardar en SQLite')).toBeTruthy();
  });

  it('updates the title field', () => {
    const { getByPlaceholderText } = render(<TaskModal {...defaultProps} />);
    const input = getByPlaceholderText('Ej. Subir informe de usabilidad');

    fireEvent.changeText(input, 'Mi tarea');

    expect(input.props.value).toBe('Mi tarea');
  });

  it('submits the selected priority and reminder', () => {
    const onSubmit = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <TaskModal {...defaultProps} onSubmit={onSubmit} />,
    );

    fireEvent.changeText(
      getByPlaceholderText('Ej. Subir informe de usabilidad'),
      'Preparar exposición',
    );
    fireEvent.press(getByText('Alta'));
    fireEvent.press(getByText('30m'));
    fireEvent.press(getByText('Guardar en SQLite'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Preparar exposición',
        course: 'IHC',
        priority: 'Alta',
        reminder: 30,
      }),
    );
  });

  it('calls onClose from the close button', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(<TaskModal {...defaultProps} onClose={onClose} />);

    fireEvent.press(getByLabelText('Cerrar nueva tarea'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('rejects submission without a title', () => {
    const onSubmit = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByText } = render(<TaskModal {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.press(getByText('Guardar en SQLite'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Falta el título',
      'Escribe un título corto para guardar la tarea.',
    );
  });
});
