import { useState, useRef, useEffect } from 'react';
import { Palette, Check, ChevronDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getThemeList } from '../../theme/themeConfig';

const ThemeSwitcher = () => {
  const { theme, currentThemeId, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const themeList = getThemeList();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
          bg-theme-bg-elevated text-theme-text-secondary
          border border-theme-border-default
          hover:border-theme-primary hover:text-theme-primary
          transition-all duration-200"
        title="Change Theme"
      >
        <Palette className="w-4 h-4" />
        <span className="hidden sm:inline">{theme.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden
          bg-theme-bg-card border border-theme-border-default
          shadow-[var(--theme-shadow-dropdown)] z-[100]">
          <div className="px-3 py-2 border-b border-theme-border-default">
            <p className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">
              Select Theme
            </p>
          </div>
          <div className="p-1.5 space-y-0.5">
            {themeList.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                  transition-all duration-200
                  ${currentThemeId === t.id
                    ? 'bg-theme-primary-light text-theme-primary font-medium'
                    : 'text-theme-text-secondary hover:bg-theme-bg-elevated hover:text-theme-text-primary'
                  }`}
              >
                <div
                  className="w-5 h-5 rounded-full border-2 shrink-0"
                  style={{
                    backgroundColor: t.primary,
                    borderColor: currentThemeId === t.id ? t.primary : 'transparent',
                    boxShadow: currentThemeId === t.id ? `0 0 8px ${t.primary}60` : 'none'
                  }}
                />
                <span className="flex-1 text-left">{t.name}</span>
                {currentThemeId === t.id && (
                  <Check className="w-4 h-4 text-theme-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;