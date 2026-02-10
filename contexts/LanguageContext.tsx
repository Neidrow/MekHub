
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { TRANSLATIONS } from '../constants/translations';

type Language = 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialisation intelligente : localStorage > Navigateur > 'fr' par défaut
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('garagepro_lang');
    if (saved === 'fr' || saved === 'en') return saved;
    // Détection navigateur (optionnel, on peut forcer FR par défaut)
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'en' ? 'en' : 'fr';
  });

  useEffect(() => {
    localStorage.setItem('garagepro_lang', language);
  }, [language]);

  const t = (path: string): string => {
    const keys = path.split('.');
    let current: any = TRANSLATIONS[language];
    
    for (const key of keys) {
      if (current[key] === undefined) {
        console.warn(`Missing translation for ${language}: ${path}`);
        // Fallback sur le français si la clé anglaise manque
        if (language !== 'fr') {
            let fallback: any = TRANSLATIONS['fr'];
            for (const k of keys) {
                if (fallback[k] === undefined) return path;
                fallback = fallback[k];
            }
            return fallback as string;
        }
        return path;
      }
      current = current[key];
    }
    
    return current as string;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
