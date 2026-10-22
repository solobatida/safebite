import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import { HeaderBackButton } from '@/components/HeaderBackButton';
import {
  getSession,
  isGuestSession,
  updateUiLanguage,
  updateAccountNickname,
} from '@/lib/storage';
import { LANGUAGES } from '@/constants/languages';
import { t } from '@/i18n/translations';
import type { UiLanguage } from '@/types';
import { fonts } from '@/constants/fonts';
import { colors, spacing } from '@/constants/theme';

export default function AccountScreen() {
  const router = useRouter();
  const [lang, setLang] = useState<UiLanguage>('en');
  const [nickname, setNickname] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const session = await getSession();
    if (!session) {
      router.replace('/');
      return;
    }
    setIsGuest(isGuestSession(session));
    setLang(session.uiLanguage);
    setNickname(session.accountNickname);
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const changeLanguage = async (code: UiLanguage) => {
    if (code === lang) return;
    try {
      await updateUiLanguage(code);
      setLang(code);
    } catch (e) {
      Alert.alert(t(lang, 'error'), e instanceof Error ? e.message : t(lang, 'authGeneric'));
    }
  };

  const saveNickname = async () => {
    setSaving(true);
    try {
      await updateAccountNickname(nickname);
      Alert.alert('OK', t(lang, 'nicknameUpdated'));
    } catch (e) {
      Alert.alert(t(lang, 'error'), e instanceof Error ? e.message : t(lang, 'errorSave'));
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/preferences');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          title: t(lang, 'navAccount'),
          headerLeft: () => (
            <HeaderBackButton onPress={goBack} accessibilityLabel={t(lang, 'navPreferences')} />
          ),
        }}
      />
      <Text style={styles.title}>{t(lang, 'accountSettingsTitle')}</Text>

      {isGuest ? (
        <Text style={styles.guestNote}>{t(lang, 'guestAccountNote')}</Text>
      ) : null}

      <Text style={styles.label}>{t(lang, 'nickname')}</Text>
      <TextInput
        style={styles.input}
        value={nickname}
        onChangeText={setNickname}
        autoCapitalize="words"
        placeholder={t(lang, 'nicknamePlaceholder')}
        placeholderTextColor={colors.textMuted}
        editable={!saving}
      />
      <PrimaryButton
        label={saving ? '...' : t(lang, 'saveNickname')}
        onPress={saveNickname}
        style={{ marginBottom: spacing.lg }}
      />
      {saving ? <ActivityIndicator color={colors.primary} style={{ marginBottom: spacing.md }} /> : null}

      <Text style={styles.label}>{t(lang, 'languageTitle')}</Text>
      <View style={styles.langGrid}>
        {LANGUAGES.map((l) => (
          <Pressable
            key={l.code}
            style={[styles.langChip, lang === l.code && styles.langChipSelected]}
            onPress={() => changeLanguage(l.code)}
          >
            <Text style={[styles.langChipText, lang === l.code && styles.langChipTextSelected]}>
              {l.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  guestNote: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.primaryDark,
    backgroundColor: '#E8F5EE',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: fonts.regular,
    marginBottom: spacing.md,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  langChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langChipSelected: {
    borderColor: colors.primary,
    backgroundColor: '#E8F5EE',
  },
  langChipText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
  },
  langChipTextSelected: {
    color: colors.primaryDark,
  },
});
