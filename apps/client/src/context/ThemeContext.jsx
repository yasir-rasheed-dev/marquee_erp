import { createContext, useContext, useEffect, useState } from 'react';
import { themes } from '../theme/themeConfig';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('erp-theme');
    if (!saved || saved !== 'gold') {
      localStorage.setItem('erp-theme', 'gold');
      return 'gold';
    }
    return 'gold';
  });

  useEffect(() => {
    const theme = themes[currentTheme] || themes.gold;
    if (!theme) return;
    
    const root = document.documentElement;
    
    // Apply all CSS variables
    Object.entries(theme).forEach(([key, value]) => {
      const varName = key.startsWith('--') ? key : `--${key}`;
      root.style.setProperty(varName, value);
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