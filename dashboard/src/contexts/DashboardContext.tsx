import { createContext, useContext, ReactNode } from 'react';
import { useDashboardData, DashboardData } from '../hooks/useDashboardData';

const DashboardContext = createContext<DashboardData | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const data = useDashboardData();
  return <DashboardContext.Provider value={data}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within DashboardProvider');
  }
  return context;
}
