"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import en from "./en.json";
export type Language = "vi" | "en";
const catalog: Record<string, string> = en;
const reverse = Object.fromEntries(
  Object.entries(catalog).map(([vi, en]) => [en, vi]),
);
let activeLanguage: Language = "vi";
export function getLanguage() {
  return activeLanguage;
}
export function translate(
  text: string,
  language: Language = activeLanguage,
): string {
  if (language === "vi") return reverse[text] || text;
  if (catalog[text]) return catalog[text];
  if (text.startsWith("Thiếu cột "))
    return "Missing column " + text.slice("Thiếu cột ".length);
  return text;
}
const LocaleContext = createContext({
  language: "vi" as Language,
  setLanguage: (_language: Language) => {},
  t: (text: string) => text,
});
export function useI18n() {
  return useContext(LocaleContext);
}
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [language, setState] = useState<Language>("vi");
  const client = useQueryClient();
  useEffect(() => {
    const stored = localStorage.getItem("hoanxu.language");
    activeLanguage = stored === "en" ? "en" : "vi";
    setState(activeLanguage);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title =
      language === "en"
        ? "Hoàn Xu — Shop and earn cashback"
        : "Hoàn Xu — Mua sắm và nhận hoàn tiền";
  }, [language]);
  function setLanguage(value: Language) {
    activeLanguage = value;
    setState(value);
    localStorage.setItem("hoanxu.language", value);
    void client.invalidateQueries();
  }
  return (
    <LocaleContext.Provider
      value={{ language, setLanguage, t: (text) => translate(text, language) }}
    >
      {children}
    </LocaleContext.Provider>
  );
}
export function LanguageToggle() {
  const { language, setLanguage } = useI18n();
  return (
    <div
      className="language-toggle"
      role="group"
      aria-label={language === "en" ? "Language" : "Ngôn ngữ"}
    >
      <button
        type="button"
        lang="vi"
        aria-pressed={language === "vi"}
        onClick={() => setLanguage("vi")}
      >
        VI
      </button>
      <button
        type="button"
        lang="en"
        aria-pressed={language === "en"}
        onClick={() => setLanguage("en")}
      >
        EN
      </button>
    </div>
  );
}
