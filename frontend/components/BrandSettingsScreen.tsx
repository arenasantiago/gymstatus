/**
 * Marca del entrenador: logo, nombre comercial, entrenador, contacto y color
 * principal. Se aplica a la ficha PDF. Pensado para preparadores
 * independientes, academias, clubes o centros de rendimiento.
 */
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ErrorState, Field, Loading, Screen, SectionTitle, Small } from './ui';
import { getBrand, saveBrand } from '../services/performance';
import { ApiError, errorMessage } from '../services/apiClient';
import { pickImage } from '../services/images';
import { notify } from '../services/dialogs';
import { validateBrand, hasErrors, isHexColor, TEXT_LIMITS, DEFAULT_BRAND_COLOR } from '../../shared/validation';
import { readableTextOn } from '../../shared/color';
import { colors, fonts, fontSize, radius, spacing } from '../theme';
import type { Brand } from '../domain/types';
import type { ScreenProps } from '../Navigation/types';

/** Paleta sugerida (el entrenador puede escribir cualquier color hexadecimal). */
const COLOR_PRESETS = ['#2563EB', '#0EA5E9', '#0D9488', '#16A34A', '#DC2626', '#EA580C', '#7C3AED', '#0F172A'];

const EMPTY_BRAND: Brand = {
  businessName: '',
  coachName: '',
  phone: '',
  email: '',
  contactExtra: '',
  primaryColor: DEFAULT_BRAND_COLOR,
  logo: null,
};

const BrandSettingsScreen = ({ navigation }: ScreenProps<'BrandSettings'>) => {
  const [brand, setBrand] = useState<Brand>(EMPTY_BRAND);
  const [colorText, setColorText] = useState(DEFAULT_BRAND_COLOR);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Marca y ficha PDF' });
  }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBrand();
      const merged = { ...EMPTY_BRAND, ...data };
      setBrand(merged);
      setColorText(merged.primaryColor);
      setLoadError(null);
    } catch (e) {
      setLoadError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof Brand>(key: K, value: Brand[K]) => {
    setBrand((b) => ({ ...b, [key]: value }));
    if (errors[key as string]) setErrors((e) => ({ ...e, [key as string]: '' }));
  };

  const setColor = (value: string) => {
    const text = value.startsWith('#') ? value : `#${value}`;
    setColorText(text.toUpperCase());
    if (isHexColor(text)) set('primaryColor', text.toUpperCase());
  };

  const chooseLogo = async () => {
    try {
      const dataUri = await pickImage('logo');
      if (dataUri) set('logo', dataUri);
    } catch (e) {
      notify('Logo', errorMessage(e));
    }
  };

  const save = async () => {
    const payload = { ...brand, primaryColor: colorText };
    const check = validateBrand(payload);
    if (hasErrors(check.errors)) {
      setErrors(check.errors);
      return;
    }
    setSaving(true);
    try {
      const saved = await saveBrand(payload);
      setBrand({ ...EMPTY_BRAND, ...saved });
      notify('Marca guardada', 'Se aplicará en las próximas fichas PDF.');
      navigation.goBack();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      notify('No se pudo guardar', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Cargando marca…" />;
  if (loadError) return <ErrorState message={loadError} onRetry={load} />;

  const color = isHexColor(colorText) ? colorText : brand.primaryColor;
  const onColor = readableTextOn(color);

  return (
    <Screen footer={<Button title="Guardar marca" icon="checkmark" onPress={save} loading={saving} />}>
      <SectionTitle>Vista previa del encabezado</SectionTitle>
      <View style={[styles.preview, { borderTopColor: color }]}>
        <View style={styles.previewLogo}>
          {brand.logo ? (
            <Image source={{ uri: brand.logo }} style={styles.previewLogoImage} resizeMode="contain" />
          ) : (
            <View style={[styles.previewMonogram, { backgroundColor: color }]}>
              <Text style={[styles.previewMonogramText, { color: onColor }]}>
                {(brand.businessName || brand.coachName || 'AP').slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.flex1}>
          <Text style={styles.previewName} numberOfLines={1}>
            {brand.businessName || 'Nombre comercial'}
          </Text>
          <Text style={styles.previewCoach} numberOfLines={1}>
            {brand.coachName ? `Entrenador: ${brand.coachName}` : 'Nombre del entrenador'}
          </Text>
        </View>
        <View style={[styles.previewTag, { backgroundColor: color }]}>
          <Text style={[styles.previewTagText, { color: onColor }]}>Evaluación</Text>
        </View>
      </View>

      <SectionTitle>Logo</SectionTitle>
      <Card style={styles.logoRow}>
        <View style={styles.logoBox}>
          {brand.logo ? (
            <Image source={{ uri: brand.logo }} style={styles.logoImage} resizeMode="contain" />
          ) : (
            <Ionicons name="image-outline" size={28} color={colors.textMuted} />
          )}
        </View>
        <View style={styles.flex1}>
          <Pressable onPress={chooseLogo} hitSlop={6} accessibilityRole="button">
            <Text style={styles.link}>{brand.logo ? 'Cambiar logo' : 'Subir logo'}</Text>
          </Pressable>
          {brand.logo ? (
            <Pressable onPress={() => set('logo', null)} hitSlop={6} accessibilityRole="button">
              <Text style={[styles.link, styles.linkMuted]}>Quitar logo</Text>
            </Pressable>
          ) : null}
          <Small>PNG o JPG. Se optimiza automáticamente para la ficha.</Small>
          {errors.logo ? <Text style={styles.error}>{errors.logo}</Text> : null}
        </View>
      </Card>

      <SectionTitle>Identidad</SectionTitle>
      <Card>
        <Field
          label="Nombre comercial"
          placeholder="Club, academia, centro o tu marca personal"
          value={brand.businessName}
          onChangeText={(v) => set('businessName', v)}
          maxLength={TEXT_LIMITS.businessName}
          error={errors.businessName}
        />
        <Field
          label="Nombre del entrenador"
          placeholder="Nombre y apellido"
          value={brand.coachName}
          onChangeText={(v) => set('coachName', v)}
          maxLength={TEXT_LIMITS.coachName}
          autoCapitalize="words"
          error={errors.coachName}
        />
      </Card>

      <SectionTitle>Contacto (aparece en la ficha)</SectionTitle>
      <Card>
        <Field
          label="Teléfono / WhatsApp"
          placeholder="+57 300 000 0000"
          keyboardType="phone-pad"
          value={brand.phone}
          onChangeText={(v) => set('phone', v)}
          maxLength={TEXT_LIMITS.phone}
          error={errors.phone}
        />
        <Field
          label="Correo"
          placeholder="contacto@tumarca.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={brand.email}
          onChangeText={(v) => set('email', v)}
          maxLength={TEXT_LIMITS.email}
          error={errors.email}
        />
        <Field
          label="Otro (web, Instagram, dirección)"
          placeholder="@tumarca · tumarca.com"
          autoCapitalize="none"
          value={brand.contactExtra}
          onChangeText={(v) => set('contactExtra', v)}
          maxLength={TEXT_LIMITS.contactExtra}
          error={errors.contactExtra}
        />
      </Card>

      <SectionTitle>Color principal</SectionTitle>
      <Card>
        <View style={styles.swatches}>
          {COLOR_PRESETS.map((preset) => {
            const active = preset.toUpperCase() === color.toUpperCase();
            return (
              <Pressable
                key={preset}
                onPress={() => setColor(preset)}
                style={[styles.swatch, { backgroundColor: preset }, active && styles.swatchActive]}
                accessibilityRole="button"
                accessibilityLabel={`Color ${preset}`}
                accessibilityState={{ selected: active }}
              >
                {active ? <Ionicons name="checkmark" size={18} color={readableTextOn(preset)} /> : null}
              </Pressable>
            );
          })}
        </View>
        <Field
          label="Hexadecimal"
          placeholder="#2563EB"
          autoCapitalize="characters"
          autoCorrect={false}
          value={colorText}
          onChangeText={setColor}
          maxLength={7}
          error={errors.primaryColor}
          hint="Los textos de la ficha ajustan su contraste automáticamente para mantenerse legibles."
        />
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderTopWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  previewLogo: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  previewLogoImage: { width: 48, height: 48 },
  previewMonogram: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  previewMonogramText: { fontFamily: fonts.bold, fontSize: fontSize.md },
  previewName: { color: '#0F172A', fontFamily: fonts.bold, fontSize: fontSize.md },
  previewCoach: { color: '#475569', fontFamily: fonts.regular, fontSize: fontSize.xs, marginTop: 2 },
  previewTag: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  previewTagText: { fontFamily: fonts.semibold, fontSize: 11 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  logoBox: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: 76, height: 76 },
  link: { color: colors.primary, fontFamily: fonts.semibold, fontSize: fontSize.sm, marginBottom: spacing.xs },
  linkMuted: { color: colors.textSecondary },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: fontSize.xs, marginTop: spacing.xs },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  swatch: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  swatchActive: { borderWidth: 3, borderColor: colors.textPrimary },
});

export default BrandSettingsScreen;
