/**
 * Componentes de interfaz reutilizables de Athlete Performance.
 * Encapsulan el sistema de diseño (theme) para mantener consistencia visual
 * y evitar duplicar estilos en cada pantalla. Diseñados para uso móvil con
 * una mano: objetivos táctiles de 44 px o más y contenido centrado con ancho
 * máximo en tablet y web.
 */
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  contentMaxWidth,
  fonts,
  fontSize,
  radius,
  spacing,
  toneBackground,
  toneColor,
  InterpretationTone,
} from '../../theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

/* ------------------------------------------------------------------ */
/* Estructura                                                          */
/* ------------------------------------------------------------------ */

/** Contenedor de pantalla con scroll, padding y ancho máximo consistentes. */
export function Screen({
  children,
  center = false,
  refreshing,
  onRefresh,
  footer,
}: {
  children: React.ReactNode;
  center?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Barra fija inferior (p. ej. el botón principal de un formulario). */
  footer?: React.ReactNode;
}) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.screenContent, center && styles.screenCenter]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
        <View style={styles.inner}>{children}</View>
      </ScrollView>
      {footer ? (
        <View style={styles.footer}>
          <View style={styles.inner}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action}
    </View>
  );
}

export function Card({
  children,
  style,
  accent,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Borde de color para destacar la tarjeta. */
  accent?: string;
}) {
  return <View style={[styles.card, accent ? { borderColor: accent } : null, style]}>{children}</View>;
}

export function Row({
  children,
  style,
  gap = spacing.md,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  return <View style={[styles.row, { gap }, style]}>{children}</View>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

/* ------------------------------------------------------------------ */
/* Texto                                                               */
/* ------------------------------------------------------------------ */

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Body({
  children,
  muted = false,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: StyleProp<any>;
}) {
  return <Text style={[styles.body, muted && styles.bodyMuted, style]}>{children}</Text>;
}

export function Small({ children, style }: { children: React.ReactNode; style?: StyleProp<any> }) {
  return <Text style={[styles.small, style]}>{children}</Text>;
}

/* ------------------------------------------------------------------ */
/* Formularios                                                         */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  unit,
  error,
  hint,
  required,
  style,
  ...props
}: TextInputProps & {
  label?: string;
  unit?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.fieldWrap, style]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}
      <View style={[styles.inputBox, error ? styles.inputBoxError : null]}>
        <TextInput
          style={[styles.input, props.multiline ? styles.inputMultiline : null]}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={label}
          {...props}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Selector de opciones en forma de "chips" (reemplaza al Picker nativo). */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  required,
  allowDeselect = false,
}: {
  label?: string;
  options: { value: T; label: string; description?: string }[];
  value: T | null | '';
  onChange: (value: T | null) => void;
  error?: string;
  required?: boolean;
  allowDeselect?: boolean;
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <View style={styles.fieldWrap}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}
      <View style={styles.chips}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(active && allowDeselect ? null : option.value)}
              style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              hitSlop={4}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : selected && selected.description ? (
        <Text style={styles.hint}>{selected.description}</Text>
      ) : null}
    </View>
  );
}

export function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
    >
      <Ionicons
        name={value ? 'checkbox' : 'square-outline'}
        size={24}
        color={value ? colors.primary : colors.textMuted}
      />
      <View style={styles.flex1}>
        <Text style={styles.body}>{label}</Text>
        {description ? <Text style={styles.hint}>{description}</Text> : null}
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Botones                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
  compact = false,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const isDisabled = disabled || loading;
  const textColor =
    variant === 'primary' ? colors.onPrimary : variant === 'danger' ? colors.danger : colors.textPrimary;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <Ionicons name={icon} size={compact ? 18 : 20} color={textColor} /> : null}
          <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: textColor }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  color = colors.textPrimary,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
    >
      <Ionicons name={icon} size={22} color={color} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Estados y avisos                                                    */
/* ------------------------------------------------------------------ */

/** Mensaje para listas vacías / estados sin datos. */
export function EmptyState({
  icon = 'information-circle-outline',
  title,
  message,
  action,
}: {
  icon?: IconName;
  title?: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color={colors.textMuted} />
      {title ? <Text style={styles.emptyTitle}>{title}</Text> : null}
      <Text style={styles.emptyText}>{message}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

export function Loading({ message }: { message?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? <Text style={styles.emptyText}>{message}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="No se pudo cargar"
      message={message}
      action={onRetry ? <Button title="Reintentar" variant="secondary" icon="refresh" onPress={onRetry} compact /> : null}
    />
  );
}

type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

const NOTICE_STYLE: Record<NoticeTone, { color: string; background: string; icon: IconName }> = {
  info: { color: colors.info, background: colors.infoMuted, icon: 'information-circle-outline' },
  success: { color: colors.success, background: colors.successMuted, icon: 'checkmark-circle-outline' },
  warning: { color: colors.warning, background: colors.warningMuted, icon: 'alert-circle-outline' },
  danger: { color: colors.danger, background: colors.dangerMuted, icon: 'warning-outline' },
};

/**
 * Texto plano (string/number o una mezcla de ellos, p. ej. "motor {version}")
 * que hay que envolver en <Text>: dentro de un <View> un texto suelto rompe la
 * app en nativo ("Text strings must be rendered within a <Text>").
 */
function isPlainText(children: React.ReactNode): boolean {
  const parts = React.Children.toArray(children);
  return parts.length > 0 && parts.every((part) => typeof part === 'string' || typeof part === 'number');
}

export function Notice({
  children,
  tone = 'info',
  title,
}: {
  children: React.ReactNode;
  tone?: NoticeTone;
  title?: string;
}) {
  const { color, background, icon } = NOTICE_STYLE[tone];
  return (
    <View style={[styles.notice, { backgroundColor: background, borderColor: color }]}>
      <Ionicons name={icon} size={20} color={color} style={styles.noticeIcon} />
      <View style={styles.flex1}>
        {title ? <Text style={[styles.noticeTitle, { color }]}>{title}</Text> : null}
        {isPlainText(children) ? <Text style={styles.noticeText}>{children}</Text> : children}
      </View>
    </View>
  );
}

/** Etiqueta de interpretación (tono descriptivo, no diagnóstico). */
export function Badge({ label, tone }: { label: string; tone?: InterpretationTone | string | null }) {
  return (
    <View style={[styles.badge, { backgroundColor: toneBackground(tone) }]}>
      <Text style={[styles.badgeText, { color: toneColor(tone) }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/** Sección plegable para explicaciones (fórmulas, limitaciones…). */
export function Collapsible({
  title,
  children,
  initiallyOpen = false,
  icon = 'book-outline',
}: {
  title: string;
  children: React.ReactNode;
  initiallyOpen?: boolean;
  icon?: IconName;
}) {
  const [open, setOpen] = React.useState(initiallyOpen);
  return (
    <View style={styles.collapsible}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.collapsibleHeader, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Ionicons name={icon} size={18} color={colors.textSecondary} />
        <Text style={styles.collapsibleTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </Pressable>
      {open ? <View style={styles.collapsibleBody}>{children}</View> : null}
    </View>
  );
}

export function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={[styles.small, styles.flex1]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  flex1: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
  screenCenter: { justifyContent: 'center' },
  inner: { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
  },
  title: {
    fontSize: fontSize.display,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    marginBottom: spacing.xs,
  },
  required: { color: colors.primary },
  body: { color: colors.textPrimary, fontSize: fontSize.md, fontFamily: fonts.regular, lineHeight: 22 },
  bodyMuted: { color: colors.textSecondary },
  small: { color: colors.textSecondary, fontSize: fontSize.sm, fontFamily: fonts.regular, lineHeight: 20 },
  fieldWrap: { marginBottom: spacing.lg },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
  },
  inputBoxError: { borderColor: colors.danger },
  input: {
    flex: 1,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  unit: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    paddingRight: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: fontSize.xs, fontFamily: fonts.medium, marginTop: spacing.xs },
  hint: { color: colors.textMuted, fontSize: fontSize.xs, fontFamily: fonts.regular, marginTop: spacing.xs, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  chipText: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: fontSize.sm },
  chipTextActive: { color: colors.primary },
  toggle: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonCompact: { minHeight: 44, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: 0 },
  buttonSecondary: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.borderStrong },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonDanger: { backgroundColor: colors.dangerMuted, borderWidth: 1, borderColor: colors.danger },
  buttonDisabled: { opacity: 0.5 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  buttonText: { fontSize: fontSize.md, fontFamily: fonts.semibold, textAlign: 'center' },
  buttonTextCompact: { fontSize: fontSize.sm },
  pressed: { opacity: 0.75 },
  iconButton: { padding: spacing.sm, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontFamily: fonts.semibold, textAlign: 'center' },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.md, fontFamily: fonts.regular, textAlign: 'center', lineHeight: 22 },
  emptyAction: { marginTop: spacing.md },
  loading: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeIcon: { marginTop: 1 },
  noticeTitle: { fontFamily: fonts.semibold, fontSize: fontSize.sm, marginBottom: 2 },
  noticeText: { color: colors.textPrimary, fontFamily: fonts.regular, fontSize: fontSize.sm, lineHeight: 20 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    maxWidth: '100%',
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: fontSize.xs },
  collapsible: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    minHeight: 48,
  },
  collapsibleTitle: { flex: 1, color: colors.textPrimary, fontFamily: fonts.medium, fontSize: fontSize.sm },
  collapsibleBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.xs },
  bulletRow: { flexDirection: 'row', gap: spacing.sm },
  bulletDot: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 },
});
