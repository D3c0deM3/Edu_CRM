import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { translateText, type LanguageCode } from './translations';

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (value: string) => string;
}

const STORAGE_KEY = 'crm-language';
const LanguageContext = createContext<LanguageContextValue | null>(null);

const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'title', 'aria-label'] as const;

const isIgnoredTextElement = (element: Element | null): boolean => {
  if (!element) {
    return true;
  }

  if (element.closest('[data-no-translate="true"]')) {
    return true;
  }

  const tagName = element.tagName.toLowerCase();
  return ['script', 'style', 'textarea', 'input'].includes(tagName);
};

const isIgnoredAttributeElement = (element: Element | null): boolean => {
  if (!element) {
    return true;
  }

  if (element.closest('[data-no-translate="true"]')) {
    return true;
  }

  const tagName = element.tagName.toLowerCase();
  return ['script', 'style'].includes(tagName);
};

const useAutoTranslateDocument = (language: LanguageCode) => {
  const textSourceMap = useRef(new WeakMap<Text, string>());

  const translateAttributes = useCallback((root: ParentNode) => {
    if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) {
      return;
    }

    const elements =
      root instanceof Element && TRANSLATABLE_ATTRIBUTES.some((attribute) => root.hasAttribute(attribute))
        ? [root, ...Array.from(root.querySelectorAll<HTMLElement>('[placeholder], [title], [aria-label]'))]
        : Array.from(root.querySelectorAll<HTMLElement>('[placeholder], [title], [aria-label]'));

    elements.forEach((element) => {
      if (isIgnoredAttributeElement(element)) {
        return;
      }

      TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
        const currentValue = element.getAttribute(attribute);
        if (!currentValue) {
          return;
        }

        const sourceAttribute = `data-i18n-${attribute}-source`;
        const sourceValue = element.getAttribute(sourceAttribute) || currentValue;
        if (!element.getAttribute(sourceAttribute)) {
          element.setAttribute(sourceAttribute, sourceValue);
        }

        element.setAttribute(attribute, translateText(sourceValue, language));
      });
    });
  }, [language]);

  const translateTextNodes = useCallback((root: ParentNode) => {
    const doc = root instanceof Document ? root : root.ownerDocument;
    if (!doc) {
      return;
    }

    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const textNode = node as Text;
        if (!textNode.nodeValue?.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        if (isIgnoredTextElement(textNode.parentElement)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let currentNode = walker.nextNode();
    while (currentNode) {
      const textNode = currentNode as Text;
      const sourceValue = textSourceMap.current.get(textNode) ?? textNode.nodeValue ?? '';
      if (!textSourceMap.current.has(textNode)) {
        textSourceMap.current.set(textNode, sourceValue);
      }

      const translatedValue = translateText(sourceValue, language);
      if (textNode.nodeValue !== translatedValue) {
        textNode.nodeValue = translatedValue;
      }

      currentNode = walker.nextNode();
    }
  }, [language]);

  const applyTranslations = useCallback((root: ParentNode) => {
    translateTextNodes(root);
    translateAttributes(root);
  }, [translateAttributes, translateTextNodes]);

  useEffect(() => {
    document.documentElement.lang = language;
    applyTranslations(document.body);

    const observer = new MutationObserver((mutations) => {
      const rootsToTranslate = new Set<ParentNode>();
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element || node instanceof DocumentFragment) {
            rootsToTranslate.add(node);
          } else if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
            rootsToTranslate.add(node.parentNode as ParentNode);
          }
        });
      });

      rootsToTranslate.forEach((root) => applyTranslations(root));
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [applyTranslations, language]);
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const savedLanguage = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    return savedLanguage === 'ru' || savedLanguage === 'uz' ? savedLanguage : 'en';
  });

  const setLanguage = useCallback((nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
    localStorage.setItem(STORAGE_KEY, nextLanguage);
  }, []);

  const t = useCallback((value: string) => translateText(value, language), [language]);

  useAutoTranslateDocument(language);

  const contextValue = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }

  return context;
};
