import { useEffect, useState } from 'react';

export type AppRoute =
  | 'landing'
  | 'dashboard'
  | 'customers'
  | 'products'
  | 'plans'
  | 'subscriptions'
  | 'invoices'
  | 'payments'
  | 'portal'
  | 'login';

export function getRouteFromHash(): { route: AppRoute; id?: string } {
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  const [routePart, idPart] = hash.split('/');

  const validRoutes: AppRoute[] = [
    'landing',
    'dashboard',
    'customers',
    'products',
    'plans',
    'subscriptions',
    'invoices',
    'payments',
    'portal',
    'login',
  ];

  if (validRoutes.includes(routePart as AppRoute)) {
    return { route: routePart as AppRoute, id: idPart };
  }

  return { route: 'landing' };
}

export function useAppNavigation() {
  const [current, setCurrent] = useState<{ route: AppRoute; id?: string }>(() =>
    getRouteFromHash()
  );

  useEffect(() => {
    const handleHashChange = () => {
      setCurrent(getRouteFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (route: AppRoute, id?: string | number) => {
    const targetHash = id ? `#${route}/${id}` : `#${route}`;
    window.location.hash = targetHash;
    setCurrent({ route, id: id ? String(id) : undefined });
  };

  return { currentRoute: current.route, routeParam: current.id, navigate };
}

