import { useTranslation } from 'react-i18next';

export default function TripsPage() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="trips-title">
      <h1 id="trips-title" className="font-serif text-5xl leading-tight">
        {t('trips.title')}
      </h1>
      <p className="mt-3 text-muted">{t('placeholder')}</p>
    </section>
  );
}
