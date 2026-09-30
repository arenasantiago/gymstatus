// @ts-check
'use strict';

/**
 * Textos educativos y avisos. Centralizados para que la app y el PDF digan
 * exactamente lo mismo y para poder revisarlos sin tocar la lógica.
 */

const GENERAL_DISCLAIMER =
  'Estimaciones educativas para el seguimiento deportivo. No constituyen un diagnóstico, no sustituyen la valoración médica ni nutricional individual y no garantizan resultados.';

const SPECIAL_CONDITIONS_WARNING =
  'Embarazo, lactancia, enfermedad renal, cardíaca o hepática, alteraciones metabólicas u otras condiciones médicas pueden modificar las necesidades de hidratación, energía y nutrientes. En esos casos las recomendaciones generales pueden no ser apropiadas y requieren valoración de un profesional de la salud.';

const MINOR_WARNING =
  'Atleta menor de 18 años: las ecuaciones de % de grasa y TMB se desarrollaron en adultos y no se calculan. Las necesidades nutricionales de adolescentes deben valorarse con un profesional.';

const BMI_NOTE =
  'El IMC no distingue entre masa muscular y grasa. Un atleta con alta masa muscular puede tener un IMC elevado sin exceso de grasa corporal. Por eso se muestra como dato complementario y se prioriza la composición corporal y el índice cintura/altura.';

const WHTR_NOTE =
  'Relaciona la cintura con la altura. Refleja la grasa abdominal y, según NICE, puede usarse también en adultos con alta masa muscular, donde el IMC sobrestima el riesgo. Mantener la cintura por debajo de la mitad de la altura es la referencia general.';

const WHR_NOTE =
  'Relaciona cintura y cadera, y describe la distribución de la grasa. La OMS usa un punto de corte por sexo (0.90 en hombres y 0.85 en mujeres) como referencia poblacional, no como diagnóstico.';

const BODY_FAT_METHOD = {
  title: 'Cómo se estima el % de grasa',
  method:
    'Se usa el método de circunferencias de la Marina de EE. UU. (Hodgdon y Beckett, 1984). A partir de la altura y de los perímetros estima la densidad corporal, y con la ecuación de Siri la convierte en % de grasa.',
  variables: [
    'Hombres: altura, cintura y cuello.',
    'Mujeres: altura, cintura, cuello y cadera.',
  ],
  limitations: [
    'Es una estimación con error de varios puntos porcentuales frente a métodos de referencia (DXA, pesaje hidrostático); no es una medición clínica.',
    'Se desarrolló con población militar adulta. Puede subestimar la grasa en personas muy musculosas de cuello grueso y es menos preciso en los extremos (muy delgados o con obesidad).',
    'Depende mucho de la técnica: medir siempre en el mismo punto, con la misma cinta y, si es posible, la misma persona.',
    'Su mayor utilidad es comparar la TENDENCIA del mismo atleta entre evaluaciones, más que el valor aislado.',
  ],
};

const BMR_METHOD = {
  title: 'TMB y gasto energético',
  text:
    'La TMB (tasa metabólica basal) estima la energía que el cuerpo usa en reposo. Se calcula con Mifflin-St Jeor (1990), la ecuación más fiable en adultos con y sin obesidad según la revisión sistemática de Frankenfield y colaboradores (2005): estimó la TMB con un error menor del 10 % en más personas que las otras ecuaciones, aunque con errores notables en algunos individuos. Es una estimación poblacional; el error puede ser mayor en atletas con mucha masa muscular.',
  tdee:
    'El gasto energético total (GET) multiplica la TMB por el nivel de actividad física (PAL) de FAO/OMS/UNU. Incluye el entrenamiento y la actividad diaria; la TMB por sí sola NO es lo que hay que comer.',
};

const WATER_NOTE = {
  base:
    'El requerimiento base es una guía dietética general por peso y edad para adultos sanos (≈ 35 ml/kg hasta los 55 años). Incluye el agua de todas las bebidas y alimentos.',
  adjustments: [
    'Entrenamiento: pésate antes y después; por cada kg perdido repón entre 1.25 y 1.5 L de líquido en las horas siguientes (ACSM/AND/DC 2016).',
    'Calor, humedad, altitud y sudoración alta aumentan las necesidades: el ajuste se hace de forma individual y se suma al requerimiento base.',
    'Una orina de color amarillo claro es una señal práctica de buena hidratación.',
  ],
};

const PROTEIN_NOTE =
  'Factor en g/kg de peso corporal según el objetivo. Referencias: 1.2–2.0 g/kg/día para atletas (ACSM/AND/DC 2016); 1.4–2.0 g/kg/día en personas que entrenan (ISSN 2017); la ganancia de masa libre de grasa se estabiliza hacia 1.6 g/kg/día y hasta 2.2 puede ser prudente para maximizarla (Morton et al. 2018); 1.6–2.4 g/kg/día en fases de déficit (Hector y Phillips 2018). Cada evaluación guarda el factor con que se calculó.';

const MACROS_NOTE =
  'Distribución orientativa: la proteína se fija por kg de peso, las grasas se fijan como porcentaje de la energía (20–35 % según ACSM/AND/DC) y los carbohidratos completan la energía restante. No es un plan de alimentación; el ajuste fino lo hace un profesional de la nutrición.';

const SOMATOTYPE = {
  title: 'Somatotipo: referencia descriptiva',
  intro:
    'El somatotipo describe la forma corporal con tres componentes. Es una clasificación simplificada: casi todas las personas combinan rasgos de los tres, y el perfil puede cambiar con el entrenamiento, la alimentación y la edad.',
  types: [
    {
      key: 'ecto',
      name: 'Ectomorfo',
      text: 'Predominio de la linealidad: estructura delgada, extremidades largas y poca masa muscular y grasa relativas.',
    },
    {
      key: 'meso',
      name: 'Mesomorfo',
      text: 'Predominio del desarrollo musculoesquelético: estructura robusta, hombros anchos y masa muscular marcada.',
    },
    {
      key: 'endo',
      name: 'Endomorfo',
      text: 'Predominio de la adiposidad relativa: formas más redondeadas y mayor facilidad para acumular grasa.',
    },
  ],
  caveats: [
    'No es un diagnóstico ni una característica biológica fija.',
    'En esta aplicación NO se usa para calcular dietas, calorías ni entrenamientos.',
    'La clasificación rigurosa (método de Heath-Carter) requiere pliegues cutáneos, diámetros óseos y perímetros corregidos que esta herramienta no mide.',
  ],
};

/**
 * Referencias bibliográficas de los métodos y factores que usa la app. Se
 * describen en español en lugar de citar títulos no verificados.
 */
const REFERENCES = [
  'FAO/OMS/UNU (2004). Human energy requirements: informe de la consulta de expertos. Tablas 5.1 (ejemplos de PAL) y 5.3 (rangos de PAL).',
  'Mifflin MD, St Jeor ST et al. (1990). Ecuación predictiva del gasto energético en reposo en personas sanas. Am J Clin Nutr.',
  'Frankenfield D et al. (2005). Revisión sistemática de las ecuaciones predictivas de la tasa metabólica en reposo en adultos con y sin obesidad. J Am Diet Assoc.',
  'Hodgdon JA, Beckett MB (1984). Predicción del porcentaje de grasa corporal a partir de circunferencias y altura en hombres y mujeres de la Marina de EE. UU. Naval Health Research Center.',
  'NICE NG246 (2025, revisada en 2026). Overweight and obesity management: identificación y evaluación del sobrepeso, la obesidad y la adiposidad central.',
  'OMS (2008). Waist circumference and waist–hip ratio: informe de una consulta de expertos de la OMS. Ginebra.',
  'OMS. Clasificación del índice de masa corporal en adultos.',
  'Thomas DT, Erdman KA, Burke LM (2016). Posicionamiento conjunto ACSM/AND/DC: nutrición y rendimiento deportivo.',
  'Jäger R et al. (2017). Posicionamiento de la ISSN: proteína y ejercicio. J Int Soc Sports Nutr.',
  'Morton RW et al. (2018). Metaanálisis sobre suplementación de proteína y ganancias de masa y fuerza con entrenamiento de fuerza. Br J Sports Med.',
  'Hector AJ, Phillips SM (2018). Recomendaciones de proteína para la pérdida de peso en atletas de élite. Int J Sport Nutr Exerc Metab.',
  'Iraki J, Fitschen P, Espinar S, Helms E (2019). Recomendaciones nutricionales para culturistas fuera de temporada: revisión narrativa. Sports (Basel).',
  'Murphy C, Koehler K (2022). La deficiencia energética limita la ganancia de masa magra, pero no de fuerza, con entrenamiento de fuerza: metaanálisis y metarregresión. Scand J Med Sci Sports.',
  'Omstead M. Preparation for Dietetic Practice. Toronto Metropolitan University: requerimientos de líquidos por edad y peso.',
];

module.exports = {
  GENERAL_DISCLAIMER,
  SPECIAL_CONDITIONS_WARNING,
  MINOR_WARNING,
  BMI_NOTE,
  WHTR_NOTE,
  WHR_NOTE,
  BODY_FAT_METHOD,
  BMR_METHOD,
  WATER_NOTE,
  PROTEIN_NOTE,
  MACROS_NOTE,
  SOMATOTYPE,
  REFERENCES,
};
