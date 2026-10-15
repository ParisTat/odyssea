import { Link, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';

export default function Layout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10">
        <nav aria-label={t('nav.main')} className="mx-auto flex max-w-5xl items-center justify-between gap-4 p-4">
          <Link to="/" className="text-xl font-bold">
            {t('app.name')}
          </Link>
          <Link to="/trips">{t('nav.trips')}</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
