import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScanResultCard } from '@/components/ScanResultCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getSession, getAvoidList } from '@/lib/storage';
import { checkBarcode } from '@/lib/productCheck';
import { DEMO_BARCODES } from '@/lib/openFoodFacts';
import { t } from '@/i18n/translations';
import type { ScanResult, UiLanguage } from '@/types';
import { colors, spacing } from '@/constants/theme';
import { FEATURES } from '@/constants/features';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [lang, setLang] = useState<UiLanguage>('en');
  const [avoidIds, setAvoidIds] = useState<string[]>([]);
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [lastCode, setLastCode] = useState('');
  const [profileName, setProfileName] = useState('');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const session = await getSession();
        if (!session) {
          router.replace('/');
          return;
        }
        setLang(session.uiLanguage);
        setProfileName(session.activeProfileName);
        setAvoidIds(await getAvoidList());
      })();
    }, [router])
  );

  const runCheck = async (code: string) => {
    if (code === lastCode || loading) return;
    setLastCode(code);
    setLoading(true);
    setScanning(false);
    try {
      const res = await checkBarcode(code, avoidIds, lang);
      if (!res) {
        Alert.alert('SafeBite', t(lang, 'productNotFound'));
        setScanning(true);
        setLastCode('');
        return;
      }
      setResult(res);
      if (res.unknown && res.unknown.length > 0) {
        const term = res.unknown[0];
        Alert.alert(
          'Unknown term',
          t(lang, 'unknownPrompt', { term }),
          [
            { text: 'Skip', style: 'cancel' },
            {
              text: t(lang, 'addUnknown'),
              onPress: () => router.push('/preferences'),
            },
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const canUseCamera = Platform.OS !== 'web' && permission?.granted;

  if (Platform.OS !== 'web' && !permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Camera permission is required to scan barcodes.</Text>
        <PrimaryButton label="Allow camera" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {FEATURES.familyProfiles && profileName ? (
        <Text style={styles.profileBanner}>{t(lang, 'scanForProfile', { name: profileName })}</Text>
      ) : null}
      {canUseCamera && scanning && (
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
          }}
          onBarcodeScanned={({ data }) => runCheck(data)}
        />
      )}

      {Platform.OS === 'web' && (
        <View style={styles.webBox}>
          <Text style={styles.hint}>
            Barcode camera works on a physical phone (Expo Go). On web, enter a barcode or use demo.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Barcode number"
            value={manualCode}
            onChangeText={setManualCode}
            keyboardType="number-pad"
          />
          <PrimaryButton
            label="Check product"
            onPress={() => manualCode && runCheck(manualCode)}
          />
        </View>
      )}

      <View style={styles.demoRow}>
        <Text style={styles.demoLabel}>{t(lang, 'demoBarcode')}:</Text>
        <PrimaryButton
          label="Nutella"
          variant="secondary"
          onPress={() => runCheck(DEMO_BARCODES.nutella)}
          style={styles.demoBtn}
        />
      </View>

      {loading && <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 12 }} />}

      {result && <ScanResultCard result={result} lang={lang} />}

      {!scanning && (
        <PrimaryButton
          label="Scan again"
          onPress={() => {
            setResult(null);
            setLastCode('');
            setScanning(true);
          }}
          style={{ marginTop: spacing.md }}
        />
      )}

      <Text style={styles.disclaimer}>{t(lang, 'disclaimer')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  profileBanner: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
    marginBottom: spacing.sm,
  },
  camera: { height: 220, borderRadius: 12, overflow: 'hidden' },
  center: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  hint: { color: colors.textMuted, marginBottom: spacing.md, lineHeight: 20 },
  webBox: { marginBottom: spacing.md },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    fontSize: 16,
  },
  demoRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, flexWrap: 'wrap' },
  demoLabel: { marginRight: spacing.sm, color: colors.textMuted },
  demoBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  disclaimer: { fontSize: 11, color: colors.textMuted, marginTop: spacing.lg, textAlign: 'center' },
});
