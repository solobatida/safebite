import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ensureCloudAccountSession,
  registerLocalUser,
  loginLocalUser,
  hasLocalAccount,
  clearGuestSession,
} from '@/lib/storage';
import { sendPasswordResetEmail, signInWithGoogle } from '@/lib/auth';
import { LANGUAGES } from '@/constants/languages';
import { fonts } from '@/constants/fonts';
import { colors, spacing } from '@/constants/theme';
import { supabase, supabaseEnabled } from '@/lib/supabase';
import { getAuthErrorMessage, isEmailNotConfirmedError } from '@/lib/authErrors';
import { t } from '@/i18n/translations';
import type { UiLanguage } from '@/types';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('es');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendOk, setResendOk] = useState(false);
  const lang = uiLanguage;

  useEffect(() => {
    clearGuestSession();
  }, []);

  const clearFeedback = () => {
    setFormError(null);
    setNeedsEmailConfirm(false);
    setResendOk(false);
  };

  const switchMode = (register: boolean) => {
    setIsRegister(register);
    clearFeedback();
  };

  const goIn = () => router.replace('/preferences');

  const resendConfirmation = async () => {
    if (!supabase || !email.trim()) {
      setFormError(t(lang, 'resendNeedEmail'));
      return;
    }
    setResendBusy(true);
    setResendOk(false);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
      if (error) throw error;
      setFormError(t(lang, 'confirmResent'));
      setResendOk(true);
    } catch (e) {
      setFormError(getAuthErrorMessage(e, lang));
    } finally {
      setResendBusy(false);
    }
  };

  const onForgotPassword = async () => {
    clearFeedback();
    if (!email.trim()) {
      setFormError(t(lang, 'forgotNeedEmail'));
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(email);
      setFormError(t(lang, 'resetEmailSent'));
      setResendOk(true);
    } catch (e) {
      setFormError(getAuthErrorMessage(e, lang));
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    clearFeedback();
    if (!supabaseEnabled) {
      setFormError(t(lang, 'configureGoogle'));
      return;
    }
    setGoogleLoading(true);
    try {
      const session = await signInWithGoogle();
      // On web, browser redirects to /auth/callback — no session returned here
      if (session) goIn();
    } catch (e) {
      setFormError(getAuthErrorMessage(e, lang));
      setGoogleLoading(false);
    }
  };

  const submit = async () => {
    clearFeedback();

    if (!email || !password) {
      setFormError(t(lang, 'emailPasswordRequired'));
      return;
    }
    if (isRegister && nickname.trim().length < 2) {
      setFormError(t(lang, 'nicknameRequired'));
      return;
    }
    if (password.length < 8) {
      setFormError(t(lang, 'passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      if (supabaseEnabled && supabase) {
        if (isRegister) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                account_nickname: nickname.trim(),
                ui_language: uiLanguage,
              },
            },
          });
          if (error) throw error;

          if (!data.session) {
            setFormError(t(lang, 'accountCreatedConfirm'));
            setNeedsEmailConfirm(true);
            setIsRegister(false);
            return;
          }

          if (data.user) {
            await supabase
              .from('profiles')
              .update({ ui_language: uiLanguage, account_nickname: nickname.trim() })
              .eq('id', data.user.id);
          }

          clearGuestSession();
          await ensureCloudAccountSession();
          goIn();
          return;
        }

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;

        const userId = authData.user?.id;
        if (!userId) throw new Error('No se pudo iniciar sesión');

        const { data: profile, error: profErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        if (profErr) throw profErr;
        if (!profile) {
          await supabase.auth.signOut();
          throw new Error('Usuario no registrado. Crea una cuenta primero.');
        }

        clearGuestSession();
        await ensureCloudAccountSession();
        goIn();
        return;
      }

      clearGuestSession();
      if (isRegister) {
        await registerLocalUser(email, password, nickname.trim(), uiLanguage);
      } else {
        const isLocal = await hasLocalAccount(email);
        if (!isLocal) {
          setFormError(t(lang, 'authUserExists'));
          return;
        }
        await loginLocalUser(email, password);
      }
      goIn();
    } catch (e) {
      setFormError(getAuthErrorMessage(e, lang));
      if (isEmailNotConfirmedError(e)) setNeedsEmailConfirm(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.segment}>
          <Pressable
            style={[styles.segmentBtn, !isRegister && styles.segmentBtnActive]}
            onPress={() => switchMode(false)}
          >
            <Text style={[styles.segmentText, !isRegister && styles.segmentTextActive]}>
              {t(lang, 'tabSignIn')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, isRegister && styles.segmentBtnActive]}
            onPress={() => switchMode(true)}
          >
            <Text style={[styles.segmentText, isRegister && styles.segmentTextActive]}>
              {t(lang, 'tabRegister')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.langGrid}>
          {LANGUAGES.map((l) => (
            <Pressable
              key={l.code}
              style={[styles.langChip, uiLanguage === l.code && styles.langChipSelected]}
              onPress={() => setUiLanguage(l.code)}
            >
              <Text style={styles.langChipText}>{l.label}</Text>
            </Pressable>
          ))}
        </View>

        {supabaseEnabled ? (
          <Pressable
            style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}
            onPress={onGoogle}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <View style={styles.googleGWrap}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={styles.googleLabel}>{t(lang, 'continueWithGoogle')}</Text>
              </>
            )}
          </Pressable>
        ) : null}

        {supabaseEnabled ? (
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerDot} />
            <View style={styles.dividerLine} />
          </View>
        ) : null}

        {isRegister ? (
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="words"
            placeholder={t(lang, 'nickname')}
            placeholderTextColor={colors.textMuted}
          />
        ) : null}

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t(lang, 'email')}
          placeholderTextColor={colors.textMuted}
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={t(lang, 'password')}
          placeholderTextColor={colors.textMuted}
        />

        {formError ? (
          <View style={[styles.feedbackBox, resendOk && styles.feedbackBoxOk]}>
            <Text style={[styles.feedbackText, resendOk && styles.feedbackTextOk]}>{formError}</Text>
            {needsEmailConfirm ? (
              <Pressable onPress={resendConfirmation} style={styles.linkBtn}>
                <Text style={styles.link}>
                  {resendBusy ? '…' : t(lang, 'resendConfirmation')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={submit}
          disabled={loading || googleLoading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryLabel}>
              {isRegister ? t(lang, 'register') : t(lang, 'signIn')}
            </Text>
          )}
        </Pressable>

        {!isRegister ? (
          <Pressable onPress={onForgotPassword} style={styles.forgotWrap}>
            <Text style={styles.link}>{t(lang, 'forgotPassword')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.loginBg },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#E2EBE4',
    borderRadius: 28,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 24,
  },
  segmentBtnActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: '#7A8F82',
  },
  segmentTextActive: {
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingVertical: 16,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    gap: 10,
  },
  googleGWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
    color: '#4285F4',
  },
  googleLabel: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#D5DDD7' },
  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C5D0C8',
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E0E6E2',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
    marginBottom: spacing.md,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  primaryBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: spacing.sm,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryLabel: {
    color: colors.white,
    fontSize: 17,
    fontFamily: fonts.bold,
  },
  forgotWrap: { marginTop: spacing.lg, alignItems: 'center' },
  link: {
    fontFamily: fonts.semibold,
    color: colors.primaryDark,
    fontSize: 14,
  },
  linkBtn: { marginTop: spacing.sm },
  pressed: { opacity: 0.88 },
  feedbackBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  feedbackBoxOk: {
    backgroundColor: colors.safeBg,
    borderColor: '#A5D6A7',
  },
  feedbackText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular,
  },
  feedbackTextOk: { color: colors.safe },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  langChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E0E6E2',
  },
  langChipSelected: { borderColor: colors.primary, backgroundColor: '#E8F5EE' },
  langChipText: { fontSize: 13, fontFamily: fonts.semibold },
});
