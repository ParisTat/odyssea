import { useTranslation } from 'react-i18next';

export default function ItineraryPage() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="itinerary-title">
      <h1 id="itinerary-title" className="font-serif text-5xl leading-tight">
        {t('nav.itinerary')}
      </h1>
      <p className="mt-3 text-muted">{t('placeholder')}</p>
    </section>
  );
}
