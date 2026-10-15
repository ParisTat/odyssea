import { useTranslation } from 'react-i18next';

export default function InfoPage() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="info-title">
      <h1 id="info-title" className="font-serif text-5xl leading-tight">
        {t('nav.info')}
      </h1>
      <p className="mt-3 text-muted">{t('placeholder')}</p>
    </section>
  );
}
