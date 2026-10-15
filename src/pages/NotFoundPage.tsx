import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="not-found-title">
      <h1 id="not-found-title" className="font-serif text-5xl leading-tight">
        {t('notFound.title')}
      </h1>
      <p className="mt-3 text-muted">{t('notFound.body')}</p>
      <Link to="/" className="mt-6 inline-flex min-h-11 items-center underline underline-offset-4 hover:text-accent">
        {t('notFound.back')}
      </Link>
    </section>
  );
}
