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
import { Ionicons } from '@expo/vector-icons';
import { IngredientSearch, AvoidList } from '@/components/IngredientSearch';
import { ProfileSwitcher } from '@/components/ProfileSwitcher';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getSession, getAvoidList, setAvoidList, clearSession, getProfiles, isGuestSession } from '@/lib/storage';
import { FEATURES } from '@/constants/features';
import { loadIngredients, createCustomIngredient, normalize, getDisplayLabel, getAllTerms } from '@/lib/ingredients';
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
    if (avoidIds.includes(ing.id)) {
      Alert.alert(t(lang, 'error'), t(lang, 'ingredientAlreadyAdded'));
      return;
    }
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

  const isAlreadyAvoided = (name: string): boolean => {
    const q = normalize(name);
    if (!q) return false;
    for (const id of avoidIds) {
      const item = catalog.find((c) => c.id === id);
      if (!item) {
        const fromId = id.replace(/^custom-/, '').replace(/-/g, ' ');
        if (normalize(fromId) === q) return true;
        continue;
      }
      if (getAllTerms(item).includes(q)) return true;
      if (normalize(getDisplayLabel(item, lang)) === q) return true;
    }
    return false;
  };

  const saveCustom = async () => {
    const text = customName.trim();
    if (text.length < 2) {
      Alert.alert(t(lang, 'error'), t(lang, 'errorMinChars'));
      return;
    }
    if (isAlreadyAvoided(text)) {
      Alert.alert(t(lang, 'error'), t(lang, 'ingredientAlreadyAdded'));
      return;
    }

    // If it already exists in the catalog, add that id instead of creating a duplicate custom
    const existing = catalog.find((ing) => getAllTerms(ing).includes(normalize(text)));
    if (existing) {
      if (avoidIds.includes(existing.id)) {
        Alert.alert(t(lang, 'error'), t(lang, 'ingredientAlreadyAdded'));
        return;
      }
      await addAvoid(existing);
      setCustomName('');
      setCustomModal(false);
      return;
    }

    setSavingCustom(true);
    try {
      const entry = await createCustomIngredient(text);
      if (avoidIds.includes(entry.id)) {
        Alert.alert(t(lang, 'error'), t(lang, 'ingredientAlreadyAdded'));
        return;
      }
      const next = [...avoidIds, entry.id];
      setAvoidIds(next);
      await setAvoidList(next);
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

  const goHome = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/scan');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          title: t(lang, 'navPreferences'),
          headerLeft: () => (
            <Pressable
              onPress={goHome}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t(lang, 'goToScan')}
              style={styles.headerBack}
            >
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </Pressable>
          ),
        }}
      />
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

      <PrimaryButton
        label={t(lang, 'goToScan')}
        onPress={() => router.push('/scan')}
        style={{ marginTop: spacing.md }}
      />

      <Text style={styles.title}>{t(lang, 'preferencesTitle')}</Text>
      <IngredientSearch
        lang={lang}
        placeholder={t(lang, 'searchPlaceholder')}
        onSelect={addAvoid}
        excludeIds={avoidIds}
      />
      <Text style={styles.listTitle}>{t(lang, 'myAvoidList')}</Text>
      <AvoidList ids={avoidIds} lang={lang} catalog={catalog} onRemove={removeAvoid} />
      <View style={styles.addLinkWrap}>
        <Text style={styles.addLinkText}>
          {t(lang, 'addIngredientLink')}
          <Text style={styles.addLink} onPress={() => setCustomModal(true)}>
            {t(lang, 'addIngredientLinkHere')}
          </Text>
        </Text>
      </View>
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
        label={isGuest ? t(lang, 'guestSignOut') : t(lang, 'signOut')}
        variant="danger"
        onPress={async () => {
          await clearSession();
          router.replace('/');
        }}
        style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  headerBack: {
    paddingHorizontal: Platform.OS === 'web' ? 8 : 0,
    marginLeft: Platform.OS === 'ios' ? 0 : 4,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.bold,
    marginTop: spacing.xl,
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
  listTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  addLinkWrap: {
    marginTop: spacing.md,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  addLinkText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  addLink: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.primaryDark,
    textDecorationLine: 'underline',
  },
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
