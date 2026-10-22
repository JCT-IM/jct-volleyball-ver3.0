import React, { createContext, useContext } from 'react';

export type TranslateFn = (key: string, replacements?: Record<string, string | number>) => string;
export type UiLanguage = 'ko' | 'id';

const TranslateContext = createContext<TranslateFn>((key) => key);
const LanguageContext = createContext<{ language: UiLanguage; setLanguage: (language: UiLanguage) => void }>({
    language: 'ko',
    setLanguage: () => {},
});
const PasswordContext = createContext<(password: string) => boolean>(() => false);

export function UiProviders({
    t,
    language,
    setLanguage,
    verifyAdminPassword,
    children,
}: {
    t: TranslateFn;
    language: UiLanguage;
    setLanguage: (language: UiLanguage) => void;
    verifyAdminPassword: (password: string) => boolean;
    children: React.ReactNode;
}) {
    return (
        <TranslateContext.Provider value={t}>
            <LanguageContext.Provider value={{ language, setLanguage }}>
                <PasswordContext.Provider value={verifyAdminPassword}>
                    {children}
                </PasswordContext.Provider>
            </LanguageContext.Provider>
        </TranslateContext.Provider>
    );
}

export function useUiTranslate() {
    return useContext(TranslateContext);
}

export function useUiLanguage() {
    return useContext(LanguageContext);
}

export function useVerifyAdminPassword() {
    return useContext(PasswordContext);
}
