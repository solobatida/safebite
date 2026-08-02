import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { IngredientSearch, AvoidList } from '@/components/IngredientSearch';
import { ProfileSwitcher } from '@/components/ProfileSwitcher';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getSession, getAvoidList, setAvoidList, clearSession, getProfiles, isGuestSession } from '@/lib/storage';
import { FEATURES } from '@/constants/features';
import { loadIngredients, createCustomIngredient } from '@/lib/ingredients';
import { t } from '@/i18n/translations';
import type { FamilyProfile, Ingredient, UiLanguage } from '@/types';
import { fonts } from '@/constants/fonts';
import { colors, spacing } from '@/constants/theme';

export default function PreferencesScreen() {
  const router = useRouter();
  const [lang, setLang] = useState<UiLanguage>('en');
  const [accountNickname, setAccountNickname] = useState('');
  const [activeProfileId, setActiveProfileId] = useState('');
  const [profiles, setProfiles] = useState<FamilyProfile[]>([]);
  const [avoidIds, setAvoidIds] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<Ingredient[]>([]);
  const [customModal, setCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [savingCustom, setSavingCustom] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const session = await getSession();
      if (!session) {
        router.replace('/');
        return;
      }
      setIsGuest(isGuestSession(session));
      setLang(session.uiLanguage);
      setAccountNickname(session.accountNickname);
      setActiveProfileId(session.activeProfileId);
      setProfiles(await getProfiles());
      const [avoid, ingredients] = await Promise.all([getAvoidList(), loadIngredients()]);
      setAvoidIds(avoid);
      setCatalog(ingredients);
    } catch (e) {
      Alert.alert(
        t(lang, 'error'),
        e instanceof Error ? e.message : t(lang, 'errorLoad')
      );
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const addAvoid = async (ing: Ingredient) => {
    if (avoidIds.includes(ing.id)) return;
    const next = [...avoidIds, ing.id];
    setAvoidIds(next);
    try {
      await setAvoidList(next);
    } catch (e) {
      setAvoidIds(avoidIds);
      Alert.alert(t(lang, 'error'), e instanceof Error ? e.message : t(lang, 'errorSave'));
    }
  };

  const removeAvoid = async (id: string) => {
    const next = avoidIds.filter((x) => x !== id);
    setAvoidIds(next);
    try {
      await setAvoidList(next);
    } catch (e) {
      setAvoidIds(avoidIds);
      Alert.alert(t(lang, 'error'), e instanceof Error ? e.message : t(lang, 'errorRemove'));
    }
  };

  const saveCustom = async () => {
    const text = customName.trim();
    if (text.length < 2) {
      Alert.alert(t(lang, 'error'), t(lang, 'errorMinChars'));
      return;
    }

    setSavingCustom(true);
    try {
      const entry = await createCustomIngredient(text);
      if (!avoidIds.includes(entry.id)) {
        const next = [...avoidIds, entry.id];
        setAvoidIds(next);
        await setAvoidList(next);
      }
      setCatalog(await loadIngredients());
      setCustomName('');
      setCustomModal(false);
    } catch (e) {
      Alert.alert(
        t(lang, 'error'),
        e instanceof Error ? e.message : t(lang, 'errorSaveCustom')
      );
    } finally {
      setSavingCustom(false);
    }
  };

  const activeName = profiles.find((p) => p.id === activeProfileId)?.displayName ?? '';

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t(lang, 'navPreferences') }} />
      {isGuest ? (
        <Text style={styles.guestBanner}>{t(lang, 'guestBanner')}</Text>
      ) : null}

      <ProfileSwitcher
        lang={lang}
        profiles={profiles}
        activeProfileId={activeProfileId}
        accountNickname={accountNickname}
        onSwitch={async () => {}}
        onAdd={async () => {}}
        onRemove={async () => {}}
        onOpenAccount={() => router.push('/account')}
      />

      {FEATURES.familyProfiles && activeName ? (
        <Text style={styles.profileSubtitle}>
          {t(lang, 'scanForProfile', { name: activeName })}
        </Text>
      ) : null}

      <Text style={styles.title}>{t(lang, 'preferencesTitle')}</Text>
      <IngredientSearch
        lang={lang}
        placeholder={t(lang, 'searchPlaceholder')}
        onSelect={addAvoid}
      />
      <Text style={styles.listTitle}>{t(lang, 'myAvoidList')}</Text>
      <AvoidList ids={avoidIds} lang={lang} catalog={catalog} onRemove={removeAvoid} />
      <PrimaryButton
        label={t(lang, 'addIngredient')}
        variant="secondary"
        onPress={() => setCustomModal(true)}
        style={{ marginTop: spacing.sm }}
      />
      <Modal visible={customModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => !savingCustom && setCustomModal(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t(lang, 'newIngredient')}</Text>
            <Text style={styles.modalHint}>{t(lang, 'newIngredientHint')}</Text>
            <TextInput
              style={styles.modalInput}
              value={customName}
              onChangeText={setCustomName}
              placeholder={t(lang, 'customIngredientPlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoFocus
              editable={!savingCustom}
            />
            <PrimaryButton label={savingCustom ? '...' : t(lang, 'save')} onPress={saveCustom} />
            {savingCustom ? (
              <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} />
            ) : (
              <Pressable onPress={() => setCustomModal(false)} style={{ marginTop: 12 }}>
                <Text style={styles.cancel}>{t(lang, 'cancel')}</Text>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <PrimaryButton
        label={t(lang, 'goToScan')}
        onPress={() => router.push('/scan')}
        style={{ marginTop: spacing.md }}
      />
      <PrimaryButton
        label={isGuest ? t(lang, 'guestSignOut') : t(lang, 'signOut')}
        variant="danger"
        onPress={async () => {
          await clearSession();
          router.replace('/');
        }}
        style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  title: {
    fontSize: 20,
    fontFamily: fonts.bold,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    color: colors.text,
  },
  guestBanner: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.primaryDark,
    backgroundColor: '#E8F5EE',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  profileSubtitle: {
    fontSize: 14,
    color: colors.primaryDark,
    fontFamily: fonts.semibold,
    marginBottom: spacing.md,
  },
  listTitle: { fontFamily: fonts.semibold, marginTop: spacing.md, marginBottom: spacing.sm },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    zIndex: 1,
  },
  modalTitle: { fontSize: 18, fontFamily: fonts.bold, marginBottom: spacing.sm },
  modalHint: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
    fontFamily: fonts.regular,
  },
  cancel: { textAlign: 'center', color: colors.textMuted, fontFamily: fonts.semibold },
});
