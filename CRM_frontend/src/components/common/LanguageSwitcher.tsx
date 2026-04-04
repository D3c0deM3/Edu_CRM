import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '../../i18n/LanguageContext';
import { languageOptions, type LanguageCode } from '../../i18n/translations';

interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher = ({ className }: LanguageSwitcherProps) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      data-no-translate="true"
      className={cn(
        'inline-flex items-center gap-1 rounded-2xl border border-border/70 bg-background/90 p-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/75',
        className
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Languages className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1">
        {languageOptions.map((option) => {
          const isActive = language === option.code;

          return (
            <button
              key={option.code}
              type="button"
              title={option.code === 'en' ? 'English' : option.code === 'ru' ? 'Русский' : "O'zbek"}
              onClick={() => setLanguage(option.code as LanguageCode)}
              className={cn(
                'min-w-[52px] rounded-xl px-3 py-2 text-xs font-semibold transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
