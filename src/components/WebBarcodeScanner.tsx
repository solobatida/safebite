import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { colors, spacing } from '@/constants/theme';
import { fonts } from '@/constants/fonts';

/**
 * Web-only barcode scanner (EAN/UPC/Code128).
 * expo-camera on web mostly handles QR; supermarket barcodes need ZXing.
 */
export function WebBarcodeScanner({
  active,
  onScan,
  hint,
}: {
  active: boolean;
  onScan: (code: string) => void;
  hint?: string;
}) {
  const hostRef = useRef<View>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState<string | null>(null);

  onScanRef.current = onScan;

  const attachVideo = useCallback(() => {
    if (Platform.OS !== 'web' || videoElRef.current) return videoElRef.current;
    const node = hostRef.current as unknown as HTMLElement | null;
    if (!node) return null;
    const video = document.createElement('video');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('muted', 'true');
    video.setAttribute('autoplay', 'true');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    node.appendChild(video);
    videoElRef.current = video;
    return video;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !active) return;

    let cancelled = false;
    let controls: { stop: () => void } | undefined;
    const last = { code: '', at: 0 };

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
    ]);
    const reader = new BrowserMultiFormatReader(hints);

    const start = async () => {
      setError(null);
      const video = attachVideo();
      if (!video) {
        setError('No se pudo preparar la cámara.');
        return;
      }
      try {
        controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
          if (cancelled || !result) return;
          const code = result.getText()?.trim();
          if (!code) return;
          const now = Date.now();
          if (code === last.code && now - last.at < 2500) return;
          last.code = code;
          last.at = now;
          onScanRef.current(code);
        });
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : 'No se pudo abrir la cámara. Permite el acceso a la cámara en el navegador.'
          );
        }
      }
    };

    // Wait a tick so the host View is mounted in the DOM
    const t = setTimeout(start, 50);

    return () => {
      cancelled = true;
      clearTimeout(t);
      try {
        controls?.stop();
      } catch {
        /* ignore */
      }
      const video = videoElRef.current;
      if (video) {
        const stream = video.srcObject as MediaStream | null;
        stream?.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
        video.remove();
        videoElRef.current = null;
      }
    };
  }, [active, attachVideo]);

  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.wrap}>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View ref={hostRef} style={styles.videoBox} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  hint: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 20,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  videoBox: {
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  error: {
    color: colors.danger,
    marginTop: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
});
