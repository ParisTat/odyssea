import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="home-title">
      <h1 id="home-title" className="font-serif text-5xl leading-tight">
        {t('app.name')}
      </h1>
      <p className="mt-3 text-muted">{t('app.tagline')}</p>
    </section>
  );
}
