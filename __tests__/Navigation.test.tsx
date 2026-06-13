import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import App from '../App';

describe('Navigation', () => {
  it('starts on the Home tab', async () => {
    const { findByLabelText, getByText } = render(<App />);
    const homeTab = await findByLabelText('Pestaña Inicio');

    expect(getByText('Tareas de hoy')).toBeTruthy();
    expect(homeTab.props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it('navigates to Calendar tab', async () => {
    const { findByLabelText, getAllByText, queryByText } = render(<App />);
    fireEvent.press(await findByLabelText('Pestaña Calendario'));

    await waitFor(() => expect(getAllByText('Calendario')).toHaveLength(2));
    expect(queryByText('Tareas de hoy')).toBeNull();
  });

  it('navigates to Projects tab', async () => {
    const { findByLabelText, findByText, queryByText } = render(<App />);
    fireEvent.press(await findByLabelText('Pestaña Proyectos'));

    expect(await findByText('Carga por asignatura')).toBeTruthy();
    expect(queryByText('Tareas de hoy')).toBeNull();
  });

  it('navigates to IA tab', async () => {
    const { findByLabelText, findByText, queryByText } = render(<App />);
    fireEvent.press(await findByLabelText('Pestaña IA'));

    expect(await findByText('Asistente académico')).toBeTruthy();
    expect(queryByText('Tareas de hoy')).toBeNull();
  });

  it('navigates to Settings tab', async () => {
    const { findByLabelText, findByText, queryByText } = render(<App />);
    fireEvent.press(await findByLabelText('Pestaña Ajustes'));

    expect(await findByText('Modo de apariencia')).toBeTruthy();
    expect(queryByText('Tareas de hoy')).toBeNull();
  });
});
