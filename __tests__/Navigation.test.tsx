import React from 'react';
import { Alert } from 'react-native';
import { act, render, waitFor, fireEvent } from '@testing-library/react-native';
import * as SQLite from 'expo-sqlite';
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

  it('renders a legacy task without a reminder in Calendar', async () => {
    const today = new Date().toISOString().split('T')[0];
    const database = {
      execAsync: jest.fn(() => Promise.resolve()),
      runAsync: jest.fn(() => Promise.resolve()),
      getFirstAsync: jest.fn((query: string) =>
        Promise.resolve(query.includes('COUNT(*)') ? { count: 1 } : null),
      ),
      getAllAsync: jest.fn((query: string) =>
        Promise.resolve(
          query.includes('FROM tasks')
            ? [{
                id: 'legacy-task',
                title: 'Tarea antigua sin aviso',
                description: '',
                course: 'IHC',
                date: today,
                time: '10:00',
                priority: 'Media',
                done: 0,
                reminder: 0,
                imageUri: null,
                audioUri: null,
                createdAt: '2026-01-01T00:00:00.000Z',
              }]
            : [],
        ),
      ),
    };
    jest.mocked(SQLite.openDatabaseAsync).mockResolvedValueOnce(database as never);

    const { findByLabelText, findByText } = render(<App />);
    fireEvent.press(await findByLabelText('Pestaña Calendario'));

    expect(await findByText('Tarea antigua sin aviso')).toBeTruthy();
  });

  it('closes a new-task modal immediately and stays in Calendar', async () => {
    const pendingWrite = new Promise(() => {});
    const database = {
      execAsync: jest.fn(() => Promise.resolve()),
      runAsync: jest.fn(() => pendingWrite),
      getFirstAsync: jest.fn((query: string) =>
        Promise.resolve(query.includes('COUNT(*)') ? { count: 1 } : null),
      ),
      getAllAsync: jest.fn(() => Promise.resolve([])),
    };
    jest.mocked(SQLite.openDatabaseAsync).mockResolvedValueOnce(database as never);

    const {
      findByLabelText,
      findByPlaceholderText,
      findByText,
      getByText,
      queryByText,
    } = render(<App />);

    const calendarTab = await findByLabelText('Pestaña Calendario');
    fireEvent.press(calendarTab);
    fireEvent.press(await findByLabelText('Añadir nueva tarea'));
    fireEvent.changeText(
      await findByPlaceholderText('Ej. Subir informe de usabilidad'),
      'Tarea guardada al instante',
    );
    fireEvent.press(getByText('Guardar en SQLite'));

    expect(queryByText('Nueva actividad')).toBeNull();
    expect(await findByText('Tarea guardada al instante')).toBeTruthy();
    expect(calendarTab.props.accessibilityState).toEqual({ selected: true });
  });

  it('reflects an edited task before the database write finishes', async () => {
    const today = new Date().toISOString().split('T')[0];
    const pendingWrite = new Promise(() => {});
    const database = {
      execAsync: jest.fn(() => Promise.resolve()),
      runAsync: jest.fn(() => pendingWrite),
      getFirstAsync: jest.fn((query: string) =>
        Promise.resolve(query.includes('COUNT(*)') ? { count: 1 } : null),
      ),
      getAllAsync: jest.fn((query: string) =>
        Promise.resolve(
          query.includes('FROM tasks')
            ? [{
                id: 'task-to-edit',
                title: 'Título anterior',
                description: '',
                course: 'IHC',
                date: today,
                time: '10:00',
                priority: 'Media',
                done: 0,
                reminder: 1,
                imageUri: null,
                audioUri: null,
                createdAt: '2026-01-01T00:00:00.000Z',
              }]
            : [],
        ),
      ),
    };
    jest.mocked(SQLite.openDatabaseAsync).mockResolvedValueOnce(database as never);

    const {
      findByDisplayValue,
      findByLabelText,
      findByText,
      getByText,
      queryByText,
    } = render(<App />);

    fireEvent.press(await findByLabelText('Pestaña Calendario'));
    fireEvent.press(await findByLabelText('Abrir tarea Título anterior'));
    fireEvent.changeText(await findByDisplayValue('Título anterior'), 'Título actualizado');
    fireEvent.press(getByText('Guardar cambios'));

    expect(queryByText('Detalle de actividad')).toBeNull();
    expect(await findByText('Título actualizado')).toBeTruthy();
  });

  it('removes a task before the database delete finishes', async () => {
    const today = new Date().toISOString().split('T')[0];
    const pendingDelete = new Promise(() => {});
    const database = {
      execAsync: jest.fn(() => Promise.resolve()),
      runAsync: jest.fn(() => pendingDelete),
      getFirstAsync: jest.fn((query: string) =>
        Promise.resolve(query.includes('COUNT(*)') ? { count: 1 } : null),
      ),
      getAllAsync: jest.fn((query: string) =>
        Promise.resolve(
          query.includes('FROM tasks')
            ? [{
                id: 'task-to-delete',
                title: 'Tarea para eliminar',
                description: '',
                course: 'IHC',
                date: today,
                time: '10:00',
                priority: 'Media',
                done: 0,
                reminder: 1,
                imageUri: null,
                audioUri: null,
                createdAt: '2026-01-01T00:00:00.000Z',
              }]
            : [],
        ),
      ),
    };
    jest.mocked(SQLite.openDatabaseAsync).mockResolvedValueOnce(database as never);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { findByLabelText, findByText, queryByText } = render(<App />);

    fireEvent.press(await findByLabelText('Pestaña Calendario'));
    expect(await findByText('Tarea para eliminar')).toBeTruthy();
    fireEvent.press(await findByLabelText('Eliminar tarea Tarea para eliminar'));

    const confirmationButtons = alertSpy.mock.calls[0][2];
    const confirmDelete = confirmationButtons?.find((button) => button.text === 'Eliminar');

    act(() => {
      void confirmDelete?.onPress?.();
    });

    expect(queryByText('Tarea para eliminar')).toBeNull();
    expect(database.runAsync).toHaveBeenCalledWith(
      'DELETE FROM tasks WHERE id = ?;',
      'task-to-delete',
    );
  });
});
