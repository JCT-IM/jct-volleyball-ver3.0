import { useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { translations } from '../data/translations';

export const useTranslation = () => {
    const { language } = useData();

    const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
        const entry = translations[key];
        let translation = (entry && (entry[language] || entry.ko)) || key;
        if (replacements) {
            Object.keys(replacements).forEach(rKey => {
                translation = translation.replace(`{${rKey}}`, String(replacements[rKey]));
            });
        }
        return translation;
    }, [language]);

    return { t };
};
