import { useTranslation } from 'react-i18next';

export default function TripsPage() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="trips-title">
      <h1 id="trips-title" className="text-3xl font-bold">
        {t('trips.title')}
      </h1>
      <p className="mt-2">{t('placeholder')}</p>
    </section>
  );
}
