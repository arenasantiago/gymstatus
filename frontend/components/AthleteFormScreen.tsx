/**
 * Perfil del atleta: alta y edición. Valida con las mismas reglas que el
 * backend (shared/validation.js) para dar feedback inmediato.
 */
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Button,
  Card,
  ChipGroup,
  ErrorState,
  Field,
  Loading,
  Notice,
  Screen,
  SectionTitle,
  Small,
  Toggle,
} from './ui';
import { Avatar } from './metrics';
import { createAthlete, getAthleteDetail, updateAthlete } from '../services/performance';
import { ApiError, errorMessage } from '../services/apiClient';
import { pickImage } from '../services/images';
import { notify } from '../services/dialogs';
import {
  activityOptions,
  athleteToForm,
  emptyAthleteInput,
  goalOptions,
  levelOptions,
  sexOptions,
  somatotypeOptions,
} from '../domain/view';
import { validateAthlete, hasErrors, TEXT_LIMITS } from '../../shared/validation';
import { maskDateInput, parseDisplayDate } from '../../shared/dates';
import { SPECIAL_CONDITIONS_WARNING } from '../../shared/content';
import { colors, fonts, fontSize, spacing } from '../theme';
import type { AthleteInput } from '../domain/types';
import type { ScreenProps } from '../Navigation/types';

const AthleteFormScreen = ({ navigation, route }: ScreenProps<'AthleteForm'>) => {
  const athleteId = route.params?.athleteId;
  const isEdit = !!athleteId;

  const [form, setForm] = useState<AthleteInput>(emptyAthleteInput());
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Editar atleta' : 'Nuevo atleta' });
  }, [navigation, isEdit]);

  const load = useCallback(async () => {
    if (!athleteId) return;
    setLoading(true);
    try {
      const { athlete } = await getAthleteDetail(athleteId);
      setForm(athleteToForm(athlete));
      setPhoto(athlete.photo || null);
      setLoadError(null);
    } catch (e) {
      setLoadError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof AthleteInput>(key: K, value: AthleteInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as string]) setErrors((e) => ({ ...e, [key as string]: '' }));
  };

  const choosePhoto = async () => {
    try {
      const dataUri = await pickImage('photo');
      if (dataUri) {
        setPhoto(dataUri);
        setPhotoChanged(true);
      }
    } catch (e) {
      notify('Foto', errorMessage(e));
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoChanged(true);
  };

  const save = async () => {
    const payload: AthleteInput = {
      ...form,
      birthDate: parseDisplayDate(form.birthDate) || form.birthDate,
      ...(photoChanged || !isEdit ? { photo } : {}),
    };
    const check = validateAthlete(payload as unknown as Record<string, unknown>);
    if (hasErrors(check.errors)) {
      setErrors(check.errors);
      notify('Revisa el perfil', 'Hay campos por completar o corregir.');
      return;
    }
    setSaving(true);
    try {
      if (athleteId) {
        await updateAthlete(athleteId, payload);
        navigation.goBack();
      } else {
        const created = await createAthlete(payload);
        // Flujo principal: tras crear el atleta, registrar su primera evaluación.
        navigation.replace('NewEvaluation', { athleteId: created._id });
      }
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      notify('No se pudo guardar', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Cargando perfil…" />;
  if (loadError) return <ErrorState message={loadError} onRetry={load} />;

  return (
    <Screen
      footer={
        <Button
          title={isEdit ? 'Guardar cambios' : 'Crear y registrar evaluación'}
          icon={isEdit ? 'checkmark' : 'arrow-forward'}
          onPress={save}
          loading={saving}
        />
      }
    >
      <Card>
        <View style={styles.photoRow}>
          <Avatar name={form.name || '?'} photo={photo} size={72} />
          <View style={styles.photoActions}>
            <Pressable onPress={choosePhoto} hitSlop={6} accessibilityRole="button">
              <Text style={styles.link}>{photo ? 'Cambiar foto' : 'Añadir foto (opcional)'}</Text>
            </Pressable>
            {photo ? (
              <Pressable onPress={removePhoto} hitSlop={6} accessibilityRole="button">
                <Text style={[styles.link, styles.linkMuted]}>Quitar foto</Text>
              </Pressable>
            ) : null}
            {errors.photo ? <Text style={styles.error}>{errors.photo}</Text> : null}
          </View>
        </View>

        <Field
          label="Nombre"
          required
          placeholder="Nombre y apellido"
          value={form.name}
          onChangeText={(v) => set('name', v)}
          error={errors.name}
          maxLength={TEXT_LIMITS.name}
          autoCapitalize="words"
        />
        <ChipGroup
          label="Sexo biológico"
          required
          options={sexOptions}
          value={form.sex}
          onChange={(v) => set('sex', v || '')}
          error={errors.sex}
        />
        <Small style={styles.helper}>Solo se usa en las ecuaciones que lo requieren (% de grasa y TMB).</Small>
        <Field
          label="Fecha de nacimiento"
          required
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad"
          value={form.birthDate}
          onChangeText={(v) => set('birthDate', maskDateInput(v))}
          error={errors.birthDate}
          hint="La edad se calcula en la fecha de cada evaluación."
          maxLength={10}
        />
      </Card>

      <SectionTitle>Perfil deportivo</SectionTitle>
      <Card>
        <Field
          label="Deporte o disciplina"
          placeholder="Ej.: fútbol, atletismo, crossfit, natación"
          value={form.sport}
          onChangeText={(v) => set('sport', v)}
          maxLength={TEXT_LIMITS.sport}
        />
        <ChipGroup
          label="Nivel deportivo"
          options={levelOptions}
          value={form.level}
          onChange={(v) => set('level', v || 'recreational')}
          error={errors.level}
        />
        <ChipGroup
          label="Objetivo actual"
          required
          options={goalOptions}
          value={form.goal}
          onChange={(v) => set('goal', v || '')}
          error={errors.goal}
        />
        <ChipGroup
          label="Nivel de actividad"
          required
          options={activityOptions}
          value={form.activityLevel}
          onChange={(v) => set('activityLevel', v || '')}
          error={errors.activityLevel}
        />
      </Card>

      <SectionTitle
        action={
          <Pressable onPress={() => navigation.navigate('Methodology')} hitSlop={6}>
            <Text style={styles.link}>¿Qué es?</Text>
          </Pressable>
        }
      >
        Somatotipo (referencia descriptiva)
      </SectionTitle>
      <Card>
        <ChipGroup
          options={somatotypeOptions}
          value={form.somatotype}
          onChange={(v) => set('somatotype', v)}
          allowDeselect
          error={errors.somatotype}
        />
        <Small>
          Opcional y solo descriptivo: no interviene en ningún cálculo ni determina la dieta o el entrenamiento.
        </Small>
      </Card>

      <SectionTitle>Salud</SectionTitle>
      <Card>
        <Toggle
          label="Condición especial a tener en cuenta"
          description="Embarazo, lactancia, enfermedad renal, cardíaca o metabólica, u otra condición médica."
          value={form.specialConditions}
          onChange={(v) => set('specialConditions', v)}
        />
        {form.specialConditions ? <Notice tone="warning">{SPECIAL_CONDITIONS_WARNING}</Notice> : null}
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg },
  photoActions: { flex: 1, gap: spacing.sm },
  link: { color: colors.primary, fontFamily: fonts.semibold, fontSize: fontSize.sm },
  linkMuted: { color: colors.textSecondary },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: fontSize.xs },
  helper: { marginTop: -spacing.sm, marginBottom: spacing.lg, color: colors.textMuted, fontSize: fontSize.xs },
});

export default AthleteFormScreen;
