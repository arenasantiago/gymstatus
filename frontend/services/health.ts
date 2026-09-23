/**
 * Lógica de cálculo de indicadores de salud (IMC / ICC).
 * Extraída de las pantallas para poder reutilizarla y probarla.
 */

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Bajo';
  if (bmi <= 24.9) return 'Normal';
  if (bmi <= 29.9) return 'Sobrepeso';
  if (bmi <= 34.9) return 'Obesidad I';
  if (bmi <= 39.9) return 'Obesidad II';
  return 'Obesidad III';
}

type RangeTable = Record<string, number[]>;

const maleRanges: RangeTable = {
  '18-29': [0.83, 0.88, 0.94],
  '30-39': [0.84, 0.91, 0.96],
  '40-49': [0.88, 0.95, 1.0],
  '50-59': [0.9, 0.96, 1.02],
  '60-70': [0.91, 0.98, 1.03],
  '71-200': [0.92, 0.99, 1.04],
};

const femaleRanges: RangeTable = {
  '18-29': [0.71, 0.77, 0.82],
  '30-39': [0.72, 0.78, 0.84],
  '40-49': [0.73, 0.79, 0.87],
  '50-59': [0.74, 0.81, 0.88],
  '60-70': [0.76, 0.83, 0.9],
  '71-200': [0.77, 0.84, 0.92],
};

export function iccRisk(icc: number, gender: string, age: number): string {
  const ranges = gender === 'male' ? maleRanges : femaleRanges;
  const ageGroup = Object.keys(ranges).find((key) => {
    const [min, max] = key.split('-').map(Number);
    return age >= min && age <= max;
  });

  if (!ageGroup) return 'Desconocido';

  const [low, moderate, high] = ranges[ageGroup];
  if (icc < low) return 'Bajo';
  if (icc < moderate) return 'Moderado';
  if (icc < high) return 'Alto';
  return 'Muy Alto';
}
