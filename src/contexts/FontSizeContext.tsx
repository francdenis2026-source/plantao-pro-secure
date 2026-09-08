import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type FontSizeLevel = 'small' | 'normal' | 'large' | 'xlarge';

interface FontSizeContextType {
  fontSize: FontSizeLevel;
  setFontSize: (size: FontSizeLevel) => void;
  fontScale: number;
}

const fontScales: Record<FontSizeLevel, number> = {
  small: 0.85,
  normal: 1,
  large: 1.15,
  xlarge: 1.3,
};

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSizeLevel>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app-font-size');
      if (saved && Object.keys(fontScales).includes(saved)) {
        return saved as FontSizeLevel;
      }
    }
    return 'normal';
  });

  const setFontSize = (size: FontSizeLevel) => {
    setFontSizeState(size);
    localStorage.setItem('app-font-size', size);
  };

  const fontScale = fontScales[fontSize];

  // Apply font scale to root element
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--font-scale', String(fontScale));
    root.style.fontSize = `${fontScale * 100}%`;
    
    // Add data attribute for conditional styling
    root.setAttribute('data-font-size', fontSize);
  }, [fontSize, fontScale]);

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize, fontScale }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}
