/**
 * Exportación de la ficha en PDF.
 *
 * El HTML lo genera shared/report.js (función pura y probada). Aquí solo se
 * adapta a cada plataforma:
 *   - iOS: expo-print renderiza 1 px CSS = 1 pt y aplica los márgenes nativos
 *     (ignora @page), así que se pasan `margins` y se desactiva el margen CSS.
 *   - Android: expo-print ignora `margins` y respeta @page; imprime a 96 ppp,
 *     por lo que el diseño (en puntos) se escala 96/72.
 *   - Web: se imprime el HTML en un iframe oculto; el navegador ofrece
 *     "Guardar como PDF" (expo-print en web solo imprimiría la app entera).
 * Después se renombra el archivo con el nombre del atleta y se abre la hoja
 * de compartir del sistema (WhatsApp, correo, Archivos…).
 */
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { buildReportHtml, reportFileName, PAGE } from '../../shared/report';
import type { Athlete, Brand, Evaluation } from '../domain/types';

export interface ReportInput {
  brand: Brand | null;
  athlete: Athlete;
  evaluation: Evaluation;
  evaluations: Evaluation[];
}

const CSS_PX_PER_PT = 96 / 72;

function htmlFor(input: ReportInput): string {
  const isIos = Platform.OS === 'ios';
  return buildReportHtml({
    brand: input.brand,
    athlete: input.athlete,
    evaluation: input.evaluation,
    evaluations: input.evaluations,
    pageScale: isIos ? 1 : CSS_PX_PER_PT,
    cssPageMargin: !isIos,
  });
}

const iosMargins = { top: PAGE.margin, right: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin };

/** Web: imprime el HTML en un iframe oculto (el usuario elige "Guardar como PDF"). */
function printHtmlOnWeb(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(iframe);
  const frameWindow = iframe.contentWindow;
  if (!frameWindow) {
    iframe.remove();
    throw new Error('El navegador no permitió generar la ficha.');
  }
  frameWindow.document.open();
  frameWindow.document.write(html);
  frameWindow.document.close();
  const print = () => {
    frameWindow.focus();
    frameWindow.print();
    // Se retira después: algunos navegadores imprimen de forma asíncrona.
    setTimeout(() => iframe.remove(), 60000);
  };
  if (frameWindow.document.readyState === 'complete') setTimeout(print, 50);
  else frameWindow.addEventListener('load', print, { once: true });
}

/** Genera el PDF y devuelve la ruta del archivo (con nombre legible). */
export async function generateReportFile(input: ReportInput): Promise<string> {
  const html = htmlFor(input);
  const { uri } = await Print.printToFileAsync({
    html,
    width: PAGE.width,
    height: PAGE.height,
    ...(Platform.OS === 'ios' ? { margins: iosMargins } : {}),
  });

  // expo-print crea un nombre aleatorio; se renombra para que el atleta
  // reciba "Evaluacion_Nombre_2026-09-25.pdf" en WhatsApp.
  try {
    const target = new File(Paths.cache, reportFileName(input.athlete.name, input.evaluation.date));
    if (target.exists) target.delete();
    const source = new File(uri);
    await source.move(target);
    return source.uri;
  } catch {
    return uri;
  }
}

/**
 * Genera la ficha y abre la hoja de compartir del sistema. En web abre el
 * diálogo de impresión del navegador ("Guardar como PDF").
 */
export async function shareReport(input: ReportInput): Promise<'shared' | 'printed'> {
  if (Platform.OS === 'web') {
    printHtmlOnWeb(htmlFor(input));
    return 'printed';
  }
  const fileUri = await generateReportFile(input);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartir archivos no está disponible en este dispositivo.');
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Compartir ficha de evaluación',
  });
  return 'shared';
}

/** Vista previa / impresión directa (diálogo nativo con previsualización). */
export async function previewReport(input: ReportInput): Promise<void> {
  if (Platform.OS === 'web') {
    printHtmlOnWeb(htmlFor(input));
    return;
  }
  await Print.printAsync({
    html: htmlFor(input),
    width: PAGE.width,
    height: PAGE.height,
    ...(Platform.OS === 'ios' ? { margins: iosMargins } : {}),
  });
}
