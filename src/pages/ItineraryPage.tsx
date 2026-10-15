import { useTranslation } from 'react-i18next';

export default function ItineraryPage() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="itinerary-title">
      <h1 id="itinerary-title" className="text-3xl font-bold">
        {t('nav.itinerary')}
      </h1>
      <p className="mt-2">{t('placeholder')}</p>
    </section>
  );
}
