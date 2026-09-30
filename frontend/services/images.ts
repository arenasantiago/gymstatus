/**
 * Selección de imágenes (foto del atleta y logo de la marca).
 *
 * La imagen se redimensiona y comprime en el dispositivo y se envía como data
 * URI: así el backend no necesita almacenamiento de archivos y el PDF puede
 * incrustarla sin descargar nada. Los límites de tamaño son los mismos que
 * valida el backend (shared/validation.js → IMAGE_LIMITS).
 */
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { IMAGE_LIMITS } from '../../shared/validation';

export type ImageKind = 'photo' | 'logo';

const PRESETS: Record<ImageKind, { width: number; format: SaveFormat; compress: number; aspect?: [number, number] }> = {
  // Foto de perfil: cuadrada, JPEG (≈ 30–60 KB).
  photo: { width: 400, format: SaveFormat.JPEG, compress: 0.7, aspect: [1, 1] },
  // Logo: PNG para conservar la transparencia; si pesa demasiado, JPEG.
  logo: { width: 480, format: SaveFormat.PNG, compress: 1 },
};

export class ImagePickError extends Error {}

async function toDataUri(uri: string, width: number, format: SaveFormat, compress: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri).resize({ width });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ base64: true, format, compress });
  if (!result.base64) throw new ImagePickError('No se pudo procesar la imagen.');
  const mime = format === SaveFormat.PNG ? 'image/png' : 'image/jpeg';
  // En web algunos navegadores ya devuelven el prefijo data:.
  return result.base64.startsWith('data:') ? result.base64 : `data:${mime};base64,${result.base64}`;
}

/**
 * Abre la galería y devuelve la imagen como data URI lista para guardar,
 * o null si el usuario cancela.
 */
export async function pickImage(kind: ImageKind): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new ImagePickError('Permite el acceso a tus fotos en Ajustes para elegir una imagen.');
  }

  const preset = PRESETS[kind];
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: !!preset.aspect,
    aspect: preset.aspect,
    quality: 1,
  });
  if (picked.canceled || !picked.assets || picked.assets.length === 0) return null;

  const asset = picked.assets[0];
  const width = Math.min(preset.width, asset.width || preset.width);
  const limit = IMAGE_LIMITS[kind];

  let dataUri = await toDataUri(asset.uri, width, preset.format, preset.compress);
  if (dataUri.length > limit && preset.format === SaveFormat.PNG) {
    dataUri = await toDataUri(asset.uri, width, SaveFormat.JPEG, 0.8);
  }
  if (dataUri.length > limit) {
    dataUri = await toDataUri(asset.uri, Math.round(width * 0.6), SaveFormat.JPEG, 0.6);
  }
  if (dataUri.length > limit) {
    throw new ImagePickError('La imagen es demasiado pesada incluso comprimida. Prueba con otra.');
  }
  return dataUri;
}
