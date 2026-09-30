/**
 * Gráfico de evolución. La geometría (escalas, ticks, etiquetas) la calcula
 * shared/chart.js, la misma función que dibuja el gráfico del PDF, así ambos
 * muestran exactamente la misma información.
 */
import React, { useId, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { buildLineChart } from '../../shared/chart';
import { colors, fonts, fontSize, spacing } from '../theme';

export interface SeriesPoint {
  date: string;
  value: number;
  id?: string;
}

export function LineChart({
  series,
  height = 200,
  color = colors.primary,
  emptyMessage = 'Aún no hay datos para esta métrica.',
}: {
  series: SeriesPoint[];
  height?: number;
  color?: string;
  emptyMessage?: string;
}) {
  const [width, setWidth] = useState(0);
  const gradientId = `area${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const chart = useMemo(
    () =>
      width > 0
        ? buildLineChart({
            series,
            width,
            height,
            padding: { left: 44, right: 24, top: 14, bottom: 28 },
            maxXLabels: Math.max(2, Math.floor(width / 72)),
          })
        : null,
    [series, width, height],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== width) setWidth(w);
  };

  if (series.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  const lastIndex = series.length - 1;
  return (
    <View onLayout={onLayout} style={{ height }} accessible accessibilityLabel="Gráfico de evolución">
      {chart && !chart.empty ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.28} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {chart.yTicks.map((tick) => (
            <G key={`y${tick.value}`}>
              <Line
                x1={chart.plot.left}
                x2={chart.plot.right}
                y1={tick.y}
                y2={tick.y}
                stroke={colors.border}
                strokeWidth={1}
              />
              <SvgText
                x={chart.plot.left - 8}
                y={tick.y + 4}
                fill={colors.textMuted}
                fontSize={11}
                textAnchor="end"
              >
                {tick.label}
              </SvgText>
            </G>
          ))}
          {chart.xLabels.map((label) => (
            <SvgText
              key={`x${label.x}`}
              x={label.x}
              y={height - 8}
              fill={colors.textMuted}
              fontSize={11}
              textAnchor="middle"
            >
              {label.label}
            </SvgText>
          ))}
          {chart.areaPath ? <Path d={chart.areaPath} fill={`url(#${gradientId})`} /> : null}
          {chart.points.length > 1 ? (
            <Path
              d={chart.path}
              stroke={color}
              strokeWidth={2.5}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {chart.points.map((p, i) => (
            <Circle
              key={`p${p.id || i}`}
              cx={p.x}
              cy={p.y}
              r={i === lastIndex ? 5 : 3.5}
              fill={i === lastIndex ? color : colors.surface}
              stroke={color}
              strokeWidth={2}
            />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  emptyText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: fontSize.sm, textAlign: 'center' },
});
