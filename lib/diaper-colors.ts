export type PoopColorId = 'c1' | 'c2' | 'c3' | 'blood' | 'black' | 'c4' | 'c5' | 'c6' | 'c7';
export type DiaperType = 'pee' | 'poop' | 'both';

export interface PoopColor {
  id: PoopColorId;
  hex: string;
  rgb: [number, number, number];
  label: string;
  cardNumber: string;
  normal: boolean;
}

export const POOP_COLORS: PoopColor[] = [
  { id: 'c1',    hex: '#F8FCCF', rgb: [248, 252, 207], label: 'Branco-amarelado', cardNumber: '1', normal: false },
  { id: 'c2',    hex: '#E7E9C2', rgb: [231, 233, 194], label: 'Bege-claro',        cardNumber: '2', normal: false },
  { id: 'c3',    hex: '#CCC182', rgb: [204, 193, 130], label: 'Amarelo-palha',     cardNumber: '3', normal: false },
  { id: 'blood', hex: '#711B0E', rgb: [113,  27,  14], label: 'Sangue',            cardNumber: '⚠', normal: false },
  { id: 'black', hex: '#1C1A10', rgb: [ 28,  26,  16], label: 'Preto/Mecônio',     cardNumber: '●', normal: false },
  { id: 'c4',    hex: '#EEF214', rgb: [238, 242,  20], label: 'Amarelo-brilhante', cardNumber: '4', normal: true  },
  { id: 'c5',    hex: '#DCB200', rgb: [220, 178,   0], label: 'Amarelo-mostarda',  cardNumber: '5', normal: true  },
  { id: 'c6',    hex: '#B98D03', rgb: [185, 141,   3], label: 'Marrom-dourado',    cardNumber: '6', normal: true  },
  { id: 'c7',    hex: '#B4C800', rgb: [180, 200,   0], label: 'Amarelo-verde',     cardNumber: '7', normal: true  },
];

export function getPoopColor(id: PoopColorId): PoopColor {
  return POOP_COLORS.find(c => c.id === id)!;
}

export function isNormalPoop(colorId: PoopColorId): boolean {
  return getPoopColor(colorId).normal;
}

function colorDistanceSq(
  a: [number, number, number],
  b: [number, number, number],
): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

export function closestPoopColor(rgb: [number, number, number]): PoopColorId {
  let minDist = Infinity;
  let closest = POOP_COLORS[0];
  for (const color of POOP_COLORS) {
    const dist = colorDistanceSq(rgb, color.rgb);
    if (dist < minDist) {
      minDist = dist;
      closest = color;
    }
  }
  return closest.id;
}

async function extractRGBOnWeb(
  imageUri: string,
): Promise<[number, number, number] | null> {
  return new Promise(resolve => {
    const img = new (window as any).Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        resolve([d[0], d[1], d[2]]);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUri;
  });
}

async function extractRGBOnNative(
  base64: string,
): Promise<[number, number, number] | null> {
  try {
    const jpeg = await import('jpeg-js');

    // base64 vem direto do ImagePicker (base64: true) — zero chamada de TurboModule
    // adicional, evitando o crash de NSException/Hermes no iOS 26 beta.
    const binary = atob(base64);
    const buf = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);

    const { data, width, height } = jpeg.decode(buf as any, {
      useTArray: true,
      formatAsRGBA: true,
    });

    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const i = (cy * width + cx) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  } catch {
    return null;
  }
}

export async function detectPoopColorFromImage(
  imageUri: string,
  base64: string | null = null,
): Promise<PoopColorId | null> {
  try {
    const { Platform } = await import('react-native');
    const rgb = Platform.OS === 'web'
      ? await extractRGBOnWeb(imageUri)
      : base64 ? await extractRGBOnNative(base64) : null;
    if (!rgb) return null;
    return closestPoopColor(rgb);
  } catch (e) {
    console.error('Diaper color detection failed:', e);
    return null;
  }
}
