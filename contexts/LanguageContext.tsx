
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { TRANSLATIONS } from '../constants/translations';

// On force le type à 'fr' uniquement pour simplifier
type Language = 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // On force le français, on ignore le localStorage pour l'anglais
  const [language, setLanguage] = useState<Language>('fr');

  useEffect(() => {
    localStorage.setItem('garagepro_lang', 'fr');
  }, []);

  const t = (path: string): string => {
    const keys = path.split('.');
    // On tape directement dans la clé 'fr'
    let current: any = TRANSLATIONS['fr'];
    
    for (const key of keys) {
      if (current[key] === undefined) {
        console.warn(`Translation missing for key: ${path}`);
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
