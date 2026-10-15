import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="not-found-title">
      <h1 id="not-found-title" className="text-3xl font-bold">
        {t('notFound.title')}
      </h1>
      <p className="mt-2">{t('notFound.body')}</p>
      <Link to="/" className="mt-4 inline-block underline">
        {t('notFound.back')}
      </Link>
    </section>
  );
}
