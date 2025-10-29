import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      // Check localStorage first (only in browser environment)
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('bill-splitter-theme');
        if (stored === 'light' || stored === 'dark') {
          return stored;
        }
      }
    } catch (error) {
      // localStorage not available (private browsing, quota exceeded, etc.)
      // Fall through to default
    }
    // Default to dark mode
    return 'dark';
  });

  useEffect(() => {
    // Apply theme to document root
    document.documentElement.setAttribute('data-theme', theme);

    // Save to localStorage (with error handling)
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('bill-splitter-theme', theme);
      }
    } catch (error) {
      // localStorage not available, theme will not persist across sessions
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
