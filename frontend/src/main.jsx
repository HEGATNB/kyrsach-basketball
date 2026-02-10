import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';

// Настраиваем "Кибер-Баскетбол" тему
const theme = createTheme({
  primaryColor: 'orange',
  defaultRadius: 'md',
  fontFamily: 'Verdana, sans-serif',
  colors: {
    // Кастомный темный фон (Slate 900)
    dark: [
      '#C1C2C5', '#A6A7AB', '#909296', '#5C5F66',
      '#373A40', '#2C2E33', '#25262B', '#1A1B1E', '#141517', '#101113',
    ],
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <App />
    </MantineProvider>
  </React.StrictMode>,
)
