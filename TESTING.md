# Guía de Pruebas Unitarias

Este proyecto utiliza **Jest** y **React Native Testing Library** para asegurar la calidad y correcto funcionamiento de los componentes y lógica principal. Debido a la arquitectura del proyecto, gran parte de las dependencias nativas de Expo están simuladas (*mocked*) en `jest.setup.js`.

## Ejecución de las Pruebas

Para correr todas las suites de pruebas integradas, asegúrate de tener las dependencias instaladas y ejecuta el siguiente comando en la raíz del proyecto:

```bash
npm run test
```

Este comando buscará automáticamente todos los archivos dentro de la carpeta `__tests__` y ejecutará los casos de prueba definidos.

## Reporte de Cobertura (Coverage)

Si deseas ver qué porcentaje del código está siendo cubierto por las pruebas (líneas, funciones, ramas), puedes añadir el flag `--coverage`. El reporte se mostrará en la terminal y también se generará una carpeta `coverage/` con una versión detallada en HTML.

```bash
npm run test -- --coverage
```

> **Nota:** Puedes abrir `coverage/lcov-report/index.html` en tu navegador web para explorar gráficamente qué líneas específicas faltan por probar.

## Suites Implementadas

Actualmente se dispone de 4 suites principales:
1. **App.test.tsx**: Verifica el correcto inicio y la simulación del estado de la aplicación.
2. **Navigation.test.tsx**: Valida que la navegación entre las diferentes pestañas (`Inicio`, `Calendario`, `Proyectos`, `IA`, `Ajustes`) funciona como se espera.
3. **TaskModal.test.tsx**: Prueba el comportamiento aislado del modal de tareas, su formulario, selección de prioridad y eventos de guardado.
4. **Settings.test.tsx**: Examina los controles de ajustes, como los toggles de accesibilidad, botones de reinicio de datos y configuraciones tipográficas.
