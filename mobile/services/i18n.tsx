import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import ar from "@/locales/ar.json";
import en from "@/locales/en.json";
import so from "@/locales/so.json";
import { useAuthStore } from "@/store/auth-store";
import { User } from "@/types/domain";
import { preferenceStorage } from "@/utils/storage";
import { userService } from "./users";

export type AppLanguage = "SO" | "EN" | "AR";

const translations = {
  SO: so,
  EN: en,
  AR: ar,
} as const;

type I18nContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);
const fallbackLanguage: AppLanguage = "SO";
const fallbackContext: I18nContextValue = {
  language: fallbackLanguage,
  setLanguage: async () => undefined,
  t: (key, params) => interpolate(resolveTranslation(fallbackLanguage, key), params),
};

const interpolate = (value: string, params?: Record<string, string | number>) => {
  if (!params) {
    return value;
  }

  return Object.entries(params).reduce(
    (result, [key, paramValue]) => result.replace(new RegExp(`{{${key}}}`, "g"), String(paramValue)),
    value,
  );
};

const resolveTranslation = (language: AppLanguage, key: string) => {
  const activeTable = translations[language] as Record<string, string | undefined>;
  const fallbackTable = translations.EN as Record<string, string | undefined>;
  return activeTable[key] ?? fallbackTable[key] ?? key;
};

export const I18nProvider = ({ children }: PropsWithChildren) => {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [language, setLanguageState] = useState<AppLanguage>(fallbackLanguage);

  useEffect(() => {
    const load = async () => {
      try {
        const cachedLanguage = await preferenceStorage.getLanguage();
        const nextLanguage = (user?.preferredLanguage ?? cachedLanguage ?? fallbackLanguage) as AppLanguage;
        setLanguageState(nextLanguage);
      } catch (error) {
        console.error("Failed to hydrate language preference", error);
      }
    };

    void load();
  }, [user?.preferredLanguage]);

  const setLanguage = async (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    try {
      await preferenceStorage.setLanguage(nextLanguage);

      if (user) {
        const updatedUser = await userService.updateMe({ preferredLanguage: nextLanguage });
        setUser({
          ...user,
          ...updatedUser,
        } as User);
      }
    } catch (error) {
      console.error("Failed to persist language preference", error);
    }
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key, params) => interpolate(resolveTranslation(language, key), params),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);

  return context ?? fallbackContext;
};
