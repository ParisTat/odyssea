import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="home-title">
      <h1 id="home-title" className="text-3xl font-bold">
        {t('app.name')}
      </h1>
      <p className="mt-2">{t('app.tagline')}</p>
    </section>
  );
}
