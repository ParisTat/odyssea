import { useTranslation } from 'react-i18next';

export default function BudgetPage() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="budget-title">
      <h1 id="budget-title" className="text-3xl font-bold">
        {t('nav.budget')}
      </h1>
      <p className="mt-2">{t('placeholder')}</p>
    </section>
  );
}
