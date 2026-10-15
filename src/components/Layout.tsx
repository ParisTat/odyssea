import { Link, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import ThemeSwitcher from './ThemeSwitcher';

export default function Layout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <nav
          aria-label={t('nav.main')}
          className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-2"
        >
          <Link to="/" className="flex min-h-11 items-center font-serif text-3xl tracking-tight italic">
            {t('app.name')}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/trips" className="flex min-h-11 items-center px-3 font-medium hover:text-accent">
              {t('nav.trips')}
            </Link>
            <ThemeSwitcher />
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 pt-14 pb-22">
        <Outlet />
      </main>
    </div>
  );
}
