import { describe, expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import App from './App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App routing', () => {
  test('renders the home page at /', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Odyssea' })).toBeInTheDocument();
  });

  test('renders the trips list at /trips', () => {
    renderAt('/trips');
    expect(screen.getByRole('heading', { level: 1, name: 'All trips' })).toBeInTheDocument();
  });

  test.each([
    ['/trips/some-trip', 'Itinerary'],
    ['/trips/some-trip/budget', 'Budget'],
    ['/trips/some-trip/info', 'Practical info'],
  ])('renders the trip section at %s', (path, heading) => {
    renderAt(path);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Trip sections' })).toBeInTheDocument();
  });

  test('marks only the current trip tab as active', () => {
    renderAt('/trips/some-trip/budget');
    const nav = screen.getByRole('navigation', { name: 'Trip sections' });
    const active = nav.querySelectorAll('[aria-current="page"]');
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveTextContent('Budget');
  });

  test.each(['/', '/trips', '/trips/some-trip/budget', '/nowhere'])('offers the theme switcher in the header at %s', (path) => {
    renderAt(path);
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('group', { name: 'Theme' })).toBeInTheDocument();
  });

  test('renders the 404 page for unknown paths', () => {
    renderAt('/nowhere');
    expect(screen.getByRole('heading', { level: 1, name: '404: Home Not Found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the active trip' })).toHaveAttribute('href', '/');
  });
});
