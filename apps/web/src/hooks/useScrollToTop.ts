import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { RefObject } from 'react';

/** Remonte le conteneur de défilement principal (ex. `<main>`) à chaque changement de route. */
export function useScrollToTop(scrollRef: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
}
