import { useTranslation } from 'react-i18next';

export default function InfoPage() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="info-title">
      <h1 id="info-title" className="text-3xl font-bold">
        {t('nav.info')}
      </h1>
      <p className="mt-2">{t('placeholder')}</p>
    </section>
  );
}
