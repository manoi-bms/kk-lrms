'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface BreadcrumbContextType {
  breadcrumbs: Breadcrumb[];
  setBreadcrumbs: (crumbs: Breadcrumb[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType>({
  breadcrumbs: [],
  setBreadcrumbs: () => {},
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  return (
    <BreadcrumbContext.Provider value={{ breadcrumbs, setBreadcrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbs() {
  return useContext(BreadcrumbContext);
}

/**
 * Sets breadcrumbs for the current page. Cleans up on unmount.
 * Uses JSON-serialized comparison to avoid infinite re-render loops.
 */
export function useSetBreadcrumbs(crumbs: Breadcrumb[]) {
  const { setBreadcrumbs } = useBreadcrumbs();
  const serialized = JSON.stringify(crumbs);
  const prevRef = useRef(serialized);

  useEffect(() => {
    // Only update if the breadcrumbs actually changed
    if (prevRef.current !== serialized) {
      prevRef.current = serialized;
    }
    setBreadcrumbs(crumbs);
    return () => setBreadcrumbs([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, setBreadcrumbs]);
}
