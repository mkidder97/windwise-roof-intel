import { createContext, useContext, useState, ReactNode } from 'react';

interface CalculationData {
  results?: any;
  buildingGeometry?: any;
  selectedSystems?: any[];
  windParameters?: any;
}

interface ReportContextType {
  calculationData: CalculationData;
  updateCalculationData: (data: Partial<CalculationData>) => void;
  addSelectedSystem: (system: any) => void;
  removeSelectedSystem: (systemId: string) => void;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [calculationData, setCalculationData] = useState<CalculationData>({
    results: null,
    buildingGeometry: null,
    selectedSystems: [],
    windParameters: null
  });

  const updateCalculationData = (data: Partial<CalculationData>) => {
    setCalculationData(prev => ({ ...prev, ...data }));
  };

  const addSelectedSystem = (system: any) => {
    setCalculationData(prev => ({
      ...prev,
      selectedSystems: [...(prev.selectedSystems || []), system]
    }));
  };

  const removeSelectedSystem = (systemId: string) => {
    setCalculationData(prev => ({
      ...prev,
      selectedSystems: (prev.selectedSystems || []).filter(s => s.id !== systemId)
    }));
  };

  return (
    <ReportContext.Provider value={{
      calculationData,
      updateCalculationData,
      addSelectedSystem,
      removeSelectedSystem
    }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReportContext() {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReportContext must be used within a ReportProvider');
  }
  return context;
}