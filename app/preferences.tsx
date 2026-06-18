import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Modal, Pressable, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { IngredientSearch, AvoidList } from '@/components/IngredientSearch';
import { ProfileSwitcher } from '@/components/ProfileSwitcher';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getSession, getAvoidList, setAvoidList, clearSession, getProfiles, isGuestSession } from '@/lib/storage';
import { FEATURES } from '@/constants/features';
import { loadIngredients, addCustomIngredient } from '@/lib/ingredients';
import { t } from '@/i18n/translations';
import type { FamilyProfile, Ingredient, UiLanguage } from '@/types';
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
  const [isGuest, setIsGuest] = useState(false);

  const refresh = useCallback(async () => {
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
    setAvoidIds(await getAvoidList());
    setCatalog(await loadIngredients());
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
    await setAvoidList(next);
  };

  const removeAvoid = async (id: string) => {
    const next = avoidIds.filter((x) => x !== id);
    setAvoidIds(next);
    await setAvoidList(next);
  };

  const saveCustom = async () => {
    const text = customName.trim();
    if (!text) return;
    const slug = text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const entry: Ingredient = {
      id: `custom-${slug}-${Date.now()}`,
      category: 'other',
      labels: { en: text },
    };
    await addCustomIngredient(entry);
    await addAvoid(entry);
    setCatalog(await loadIngredients());
    setCustomName('');
    setCustomModal(false);
  };

  const activeName = profiles.find((p) => p.id === activeProfileId)?.displayName ?? '';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t(lang, 'preferencesTitle')}</Text>

      {isGuest ? (
        <Text style={styles.guestBanner}>
          Modo amigo — tus ingredientes no se guardan al cerrar la app.
        </Text>
      ) : null}

      <ProfileSwitcher
        lang={lang}
        profiles={profiles}
        activeProfileId={activeProfileId}
        accountNickname={accountNickname}
        onSwitch={async () => {}}
        onAdd={async () => {}}
        onRemove={async () => {}}
      />

      {FEATURES.familyProfiles && activeName ? (
        <Text style={styles.profileSubtitle}>
          {t(lang, 'scanForProfile', { name: activeName })}
        </Text>
      ) : null}

      <IngredientSearch
        lang={lang}
        placeholder={t(lang, 'searchPlaceholder')}
        onSelect={addAvoid}
      />
      <Text style={styles.listTitle}>{t(lang, 'myAvoidList')}</Text>
      <AvoidList ids={avoidIds} lang={lang} catalog={catalog} onRemove={removeAvoid} />
      <PrimaryButton
        label="Add custom ingredient"
        variant="secondary"
        onPress={() => setCustomModal(true)}
        style={{ marginTop: spacing.sm }}
      />
      <Modal visible={customModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add ingredient</Text>
            <TextInput
              style={styles.modalInput}
              value={customName}
              onChangeText={setCustomName}
              placeholder="e.g. sorbitol, corn starch"
              autoFocus
            />
            <PrimaryButton label="Save" onPress={saveCustom} />
            <Pressable onPress={() => setCustomModal(false)} style={{ marginTop: 12 }}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <PrimaryButton
        label="Go to scan"
        onPress={() => router.push('/scan')}
        style={{ marginTop: spacing.md }}
      />
      <PrimaryButton
        label={isGuest ? 'Salir (modo amigo)' : t(lang, 'signOut')}
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
  title: { fontSize: 20, fontWeight: '700', marginBottom: spacing.md, color: colors.text },
  guestBanner: {
    fontSize: 13,
    color: colors.primaryDark,
    backgroundColor: '#E8F5EE',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  profileSubtitle: { fontSize: 14, color: colors.primaryDark, fontWeight: '600', marginBottom: spacing.md },
  listTitle: { fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm },
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
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
  },
  cancel: { textAlign: 'center', color: colors.textMuted },
});
