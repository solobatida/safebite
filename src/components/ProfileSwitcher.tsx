import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FamilyProfile, UiLanguage } from '@/types';
import { FEATURES } from '@/constants/features';
import { t } from '@/i18n/translations';
import { fonts } from '@/constants/fonts';
import { colors, spacing } from '@/constants/theme';
import { PrimaryButton } from '@/components/PrimaryButton';

export function ProfileSwitcher({
  lang,
  profiles,
  activeProfileId,
  accountNickname,
  onSwitch,
  onAdd,
  onRemove,
  onOpenAccount,
}: {
  lang: UiLanguage;
  profiles: FamilyProfile[];
  activeProfileId: string;
  accountNickname: string;
  onSwitch: (profileId: string) => void;
  onAdd: (displayName: string) => Promise<void>;
  onRemove: (profileId: string) => Promise<void>;
  onOpenAccount?: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const accountRow = (
    <Pressable
      style={styles.accountRow}
      onPress={onOpenAccount}
      disabled={!onOpenAccount}
    >
      <Text style={styles.accountText} numberOfLines={1}>
        {t(lang, 'accountLabel', { name: accountNickname || '—' })}
      </Text>
      {onOpenAccount ? (
        <Ionicons name="settings-outline" size={24} color={colors.primaryDark} />
      ) : null}
    </Pressable>
  );

  if (!FEATURES.familyProfiles) {
    return <View style={styles.wrap}>{accountRow}</View>;
  }

  const saveProfile = async () => {
    const name = newName.trim();
    if (name.length < 2) {
      Alert.alert('Error', t(lang, 'profileNameTooShort'));
      return;
    }
    await onAdd(name);
    setNewName('');
    setModalOpen(false);
  };

  const confirmRemove = (profile: FamilyProfile) => {
    Alert.alert(
      t(lang, 'removeProfileTitle'),
      t(lang, 'removeProfileMessage', { name: profile.displayName }),
      [
        { text: t(lang, 'cancel'), style: 'cancel' },
        {
          text: t(lang, 'remove'),
          style: 'destructive',
          onPress: () => onRemove(profile.id),
        },
      ]
    );
  };

  const multiProfile = profiles.length > 1;

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>{t(lang, 'profilesSection')}</Text>
      {accountRow}
      <View style={styles.chips}>
        {profiles.map((p) => {
          const active = p.id === activeProfileId;
          const chip = (
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.displayName}</Text>
          );
          if (!multiProfile) {
            return (
              <View key={p.id} style={[styles.chip, styles.chipActive]}>
                {chip}
              </View>
            );
          }
          return (
            <Pressable
              key={p.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSwitch(p.id)}
              onLongPress={() => confirmRemove(p)}
            >
              {chip}
            </Pressable>
          );
        })}
        <Pressable style={styles.addChip} onPress={() => setModalOpen(true)}>
          <Text style={styles.addChipText}>+ {t(lang, 'addProfile')}</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>{t(lang, 'profilesHint')}</Text>

      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t(lang, 'addProfile')}</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder={t(lang, 'profileNamePlaceholder')}
              autoFocus
              autoCapitalize="words"
            />
            <PrimaryButton label={t(lang, 'save')} onPress={saveProfile} />
            <Pressable onPress={() => setModalOpen(false)} style={{ marginTop: 12 }}>
              <Text style={styles.cancel}>{t(lang, 'cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  accountText: {
    flex: 1,
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  sectionTitle: { fontSize: 16, fontFamily: fonts.bold, color: colors.text, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '500' },
  chipTextActive: { color: colors.white },
  addChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addChipText: { color: colors.primary, fontWeight: '600' },
  hint: { fontSize: 11, color: colors.textMuted, marginTop: spacing.xs },
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
