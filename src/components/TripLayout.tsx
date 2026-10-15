import { NavLink, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';

export default function TripLayout() {
  const { t } = useTranslation();
  const tabs = [
    { to: '', label: t('nav.itinerary'), end: true },
    { to: 'budget', label: t('nav.budget'), end: false },
    { to: 'info', label: t('nav.info'), end: false },
  ];

  return (
    <div>
      <nav aria-label={t('nav.tripSections')} className="mb-6 flex gap-4">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => (isActive ? 'font-semibold underline' : undefined)}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
