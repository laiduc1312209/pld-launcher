import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { 
  FluentProvider, 
  webDarkTheme, 
  createDarkTheme,
} from '@fluentui/react-components';
import type { BrandVariants, Theme } from '@fluentui/react-components';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import './index.css';
import App from './App';

const purpleBrand: BrandVariants = { 
  10: "#1A102E",
  20: "#2B1B4A",
  30: "#3D2469",
  40: "#4D2C85",
  50: "#5D35A1",
  60: "#6D3EBF",
  70: "#7D48DC",
  80: "#8B5CF6",
  90: "#9B72F7",
  100: "#AA88F9",
  110: "#BA9EFA",
  120: "#C9B4FB",
  130: "#D9CAFD",
  140: "#E8E0FE",
  150: "#F8F5FF",
  160: "#FFFFFF"
};

const purpleDarkTheme = createDarkTheme(purpleBrand);

const winUITheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#7c3aed',
    },
    background: {
      default: '#0f172a', 
      paper: '#1e293b',
    },
    text: {
      primary: '#ffffff',
      secondary: '#94a3b8',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
  },
});

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <FluentProvider theme={purpleDarkTheme}>
        <ThemeProvider theme={winUITheme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </FluentProvider>
    </StrictMode>
  );
}
