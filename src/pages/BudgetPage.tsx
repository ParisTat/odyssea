import { useTranslation } from 'react-i18next';

export default function BudgetPage() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="budget-title">
      <h1 id="budget-title" className="font-serif text-5xl leading-tight">
        {t('nav.budget')}
      </h1>
      <p className="mt-3 text-muted">{t('placeholder')}</p>
    </section>
  );
}
