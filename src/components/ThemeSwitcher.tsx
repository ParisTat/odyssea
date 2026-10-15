import { useTranslation } from 'react-i18next';
import { THEME_IDS, type ThemeId } from '@/domain/theme';
import { useTheme } from '@/hooks/useTheme';

// Fixed swatches: each dot previews its theme, whatever theme is active.
const SWATCH: Record<ThemeId, string> = {
  white: 'bg-white',
  wood: 'bg-[#b98a5a]',
  dark: 'bg-[#1a2023]',
};

export default function ThemeSwitcher() {
  const { t } = useTranslation();
  const [theme, setTheme] = useTheme();

  return (
    <div role="group" aria-label={t('theme.label')} className="flex gap-0.5 rounded-full border border-line p-[3px]">
      {THEME_IDS.map((id) => {
        const isActive = id === theme;
        const stateClass = isActive ? 'bg-ink text-ground' : 'text-ink hover:bg-tint';
        return (
          <button
            key={id}
            type="button"
            aria-pressed={isActive}
            onClick={() => setTheme(id)}
            className={`flex min-h-[38px] items-center gap-1.5 rounded-full px-3 text-sm font-medium ${stateClass}`}
          >
            <span aria-hidden="true" className={`size-3 rounded-full border border-line ${SWATCH[id]}`} />
            {t(`theme.${id}`)}
          </button>
        );
      })}
    </div>
  );
}
