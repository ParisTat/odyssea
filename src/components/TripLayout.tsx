import { NavLink, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';

function pillClass({ isActive }: { isActive: boolean }): string {
  const state = isActive ? 'border-ink bg-ink text-ground' : 'border-line hover:border-ink';
  return `flex min-h-11 items-center rounded-full border px-[18px] font-medium ${state}`;
}

export default function TripLayout() {
  const { t } = useTranslation();
  const tabs = [
    { to: '', label: t('nav.itinerary'), end: true },
    { to: 'budget', label: t('nav.budget'), end: false },
    { to: 'info', label: t('nav.info'), end: false },
  ];

  return (
    <div>
      <nav
        aria-label={t('nav.tripSections')}
        className="mb-11 flex flex-wrap justify-center gap-2 border-y border-line py-3"
      >
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={pillClass}>
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
