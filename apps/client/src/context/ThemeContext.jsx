import { createContext, useContext, useEffect, useState } from 'react';
import { themes } from '../theme/themeConfig';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('erp-theme') || 'ocean';
  });

  useEffect(() => {
    const theme = themes[currentTheme];
    if (!theme) return;
    
    const root = document.documentElement;
    
    // Apply all CSS variables
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
    
    // Set data attribute for any CSS selectors
    root.setAttribute('data-theme', currentTheme);
    
    localStorage.setItem('erp-theme', currentTheme);
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, setCurrentTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};