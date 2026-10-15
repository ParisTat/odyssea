import { Route, Routes } from 'react-router';
import Layout from './components/Layout';
import TripLayout from './components/TripLayout';
import HomePage from './pages/HomePage';
import TripsPage from './pages/TripsPage';
import ItineraryPage from './pages/ItineraryPage';
import BudgetPage from './pages/BudgetPage';
import InfoPage from './pages/InfoPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="trips" element={<TripsPage />} />
        <Route path="trips/:slug" element={<TripLayout />}>
          <Route index element={<ItineraryPage />} />
          <Route path="budget" element={<BudgetPage />} />
          <Route path="info" element={<InfoPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
