import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { ScanResultCard } from '@/components/ScanResultCard';
import { WebBarcodeScanner } from '@/components/WebBarcodeScanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getSession, getAvoidList } from '@/lib/storage';
import { checkBarcode } from '@/lib/productCheck';
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

  const runCheck = useCallback(
    async (code: string) => {
      if (code === lastCode || loading) return;
      setLastCode(code);
      setLoading(true);
      setScanning(false);
      try {
        // Always reload avoid list at scan time (avoids empty/stale state)
        const freshAvoid = await getAvoidList();
        setAvoidIds(freshAvoid);
        const res = await checkBarcode(code, freshAvoid, lang);
        if (!res) {
          Alert.alert('SafeBite', t(lang, 'productNotFound'));
          setScanning(true);
          setLastCode('');
          return;
        }
        setResult(res);
        if (res.unknown && res.unknown.length > 0) {
          const term = res.unknown[0];
          Alert.alert(t(lang, 'unknownTerm'), t(lang, 'unknownPrompt', { term }), [
            { text: t(lang, 'skip'), style: 'cancel' },
            {
              text: t(lang, 'addUnknown'),
              onPress: () => router.push('/preferences'),
            },
          ]);
        }
      } finally {
        setLoading(false);
      }
    },
    [lang, lastCode, loading, router]
  );

  const isWeb = Platform.OS === 'web';
  const canUseNativeCamera = !isWeb && permission?.granted;

  if (!isWeb && !permission?.granted) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: t(lang, 'navScan') }} />
        <Text style={styles.hint}>{t(lang, 'cameraPermission')}</Text>
        <PrimaryButton label={t(lang, 'allowCamera')} onPress={requestPermission} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: t(lang, 'navScan') }} />
      {FEATURES.familyProfiles && profileName ? (
        <Text style={styles.profileBanner}>{t(lang, 'scanForProfile', { name: profileName })}</Text>
      ) : null}

      {canUseNativeCamera && scanning && (
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
          }}
          onBarcodeScanned={({ data }) => runCheck(data)}
        />
      )}

      {isWeb && scanning ? (
        <WebBarcodeScanner
          active={scanning && !loading}
          onScan={runCheck}
          hint={t(lang, 'webScanHint')}
        />
      ) : null}

      {isWeb ? (
        <View style={styles.webBox}>
          <TextInput
            style={styles.input}
            placeholder={t(lang, 'barcodePlaceholder')}
            value={manualCode}
            onChangeText={setManualCode}
            keyboardType="number-pad"
          />
          <PrimaryButton
            label={t(lang, 'checkProduct')}
            onPress={() => manualCode && runCheck(manualCode)}
          />
        </View>
      ) : null}

      {loading && <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 12 }} />}

      {result && <ScanResultCard result={result} lang={lang} />}

      {!scanning && (
        <PrimaryButton
          label={t(lang, 'scanAgain')}
          variant={result && !result.safe ? 'danger' : 'primary'}
          onPress={() => {
            setResult(null);
            setLastCode('');
            setScanning(true);
          }}
          style={{
            marginTop: spacing.md,
            marginBottom: spacing.xl,
            borderRadius: 14,
            ...(result?.safe ? { backgroundColor: '#1FA855' } : null),
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.md, paddingBottom: spacing.xl },
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
});
