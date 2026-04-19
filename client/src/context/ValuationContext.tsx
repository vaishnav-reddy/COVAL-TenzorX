import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ValuationResult } from '../types';

interface ValuationContextType {
  currentValuation: ValuationResult | null;
  setCurrentValuation: (v: ValuationResult | null) => void;
}

const ValuationContext = createContext<ValuationContextType>({
  currentValuation: null,
  setCurrentValuation: () => {},
});

export function ValuationProvider({ children }: { children: ReactNode }) {
  const [currentValuation, setCurrentValuation] = useState<ValuationResult | null>(null);
  return (
    <ValuationContext.Provider value={{ currentValuation, setCurrentValuation }}>
      {children}
    </ValuationContext.Provider>
  );
}

export const useValuation = () => useContext(ValuationContext);
