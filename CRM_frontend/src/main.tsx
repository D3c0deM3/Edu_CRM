import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import './index.css'
import App from './App.tsx'
import theme from './theme/theme'

const isDevelopment = import.meta.env.DEV;

// Use StrictMode only in development for better debugging
const RootElement = isDevelopment ? StrictMode : ({ children }: any) => <>{children}</>;

createRoot(document.getElementById('root')!).render(
  <RootElement>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </RootElement>,
)
