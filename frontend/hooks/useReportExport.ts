/**
 * Exportar la ficha en PDF desde cualquier pantalla (perfil, resultados,
 * evolución) con el mismo comportamiento y manejo de errores.
 */
import { useCallback, useState } from 'react';
import { errorMessage } from '../services/apiClient';
import { notify } from '../services/dialogs';
import { shareReport, type ReportInput } from '../services/pdfExport';

export function useReportExport() {
  const [exporting, setExporting] = useState(false);

  const exportReport = useCallback(async (input: ReportInput | null) => {
    if (!input) return;
    setExporting(true);
    try {
      await shareReport(input);
    } catch (e) {
      notify('No se pudo generar la ficha', errorMessage(e));
    } finally {
      setExporting(false);
    }
  }, []);

  return { exporting, exportReport };
}

/** La marca está vacía: la ficha saldría sin logo ni nombre comercial. */
export function brandIsEmpty(brand: { businessName?: string; coachName?: string; logo?: string | null } | null): boolean {
  return !brand || (!brand.businessName && !brand.coachName && !brand.logo);
}
