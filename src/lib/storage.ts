import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FamilyProfile, Ingredient, UiLanguage, UserSession } from '@/types';
import { supabase, supabaseEnabled } from '@/lib/supabase';

const KEYS = {
  session: '@safebyte/session',
  accounts: '@safebyte/accounts',
  avoid: '@safebyte/avoid',
  customIngredients: '@safebyte/custom_ingredients',
};

interface LocalAccount {
  passwordHash: string;
  accountNickname: string;
  profiles: FamilyProfile[];
  activeProfileId: string;
}

export async function getSession(): Promise<UserSession | null> {
  const raw = await AsyncStorage.getItem(KEYS.session);
  if (raw) {
    const session = JSON.parse(raw) as UserSession;
    return migrateSessionShape(session);
  }

  // If Supabase has a persisted auth session, reconstruct app session.
  if (supabaseEnabled && supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const cloud = await ensureCloudAccountSession();
      if (cloud) return cloud;
    }
  }

  return null;
}

async function migrateSessionShape(session: UserSession): Promise<UserSession> {
  if (session.activeProfileId && session.activeProfileName && session.accountNickname) {
    return session;
  }
  const account = await getLocalAccount(session.email);
  if (!account) return session;
  const profile = account.profiles.find((p) => p.id === account.activeProfileId) ?? account.profiles[0];
  const migrated: UserSession = {
    email: session.email,
    userId: session.userId,
    accountNickname: account.accountNickname,
    activeProfileId: profile.id,
    activeProfileName: profile.displayName,
    uiLanguage: session.uiLanguage,
  };
  await setSession(migrated);
  return migrated;
}

export async function setSession(session: UserSession): Promise<void> {
  await AsyncStorage.setItem(KEYS.session, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.session);
  if (supabaseEnabled && supabase) {
    await supabase.auth.signOut();
  }
}

type DbProfileRow = {
  id: string;
  email: string;
  account_nickname: string;
  ui_language: UiLanguage;
};

type DbFamilyProfileRow = {
  id: string;
  display_name: string;
};

export async function ensureCloudAccountSession(): Promise<UserSession | null> {
  if (!supabaseEnabled || !supabase) return null;

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const user = userData.user;
  if (!user?.id || !user.email) return null;

  // Load profile (created by trigger) or fallback to auth metadata.
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('id,email,account_nickname,ui_language')
    .eq('id', user.id)
    .maybeSingle<DbProfileRow>();
  if (profErr) throw profErr;

  const accountNickname =
    profile?.account_nickname?.trim() ||
    (typeof user.user_metadata?.account_nickname === 'string'
      ? user.user_metadata.account_nickname
      : '') ||
    user.email.split('@')[0];

  const uiLanguage: UiLanguage =
    (profile?.ui_language as UiLanguage | undefined) ||
    (typeof user.user_metadata?.ui_language === 'string'
      ? (user.user_metadata.ui_language as UiLanguage)
      : 'en');

  // Default family profile row is created by trigger.
  const { data: fp, error: fpErr } = await supabase
    .from('family_profiles')
    .select('id,display_name')
    .eq('account_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<DbFamilyProfileRow>();
  if (fpErr) throw fpErr;

  const activeProfileId = fp?.id ?? user.id;
  const activeProfileName = fp?.display_name?.trim() || accountNickname;

  const session: UserSession = {
    email: user.email,
    userId: user.id,
    accountNickname,
    activeProfileId,
    activeProfileName,
    uiLanguage,
  };
  await setSession(session);
  return session;
}

export async function registerLocalUser(
  email: string,
  password: string,
  accountNickname: string,
  uiLanguage: UiLanguage = 'en'
): Promise<UserSession> {
  const normalized = email.trim().toLowerCase();
  const nickname = accountNickname.trim();
  if (!normalized.includes('@') || password.length < 8) {
    throw new Error('Use a valid email and password (min 8 characters).');
  }
  if (nickname.length < 2) {
    throw new Error('Enter your name or nickname (min 2 characters).');
  }

  const accounts = await getLocalAccounts();
  if (accounts[normalized]) {
    throw new Error('An account with this email already exists.');
  }

  const profileId = `profile-${Date.now()}`;
  const defaultProfile: FamilyProfile = {
    id: profileId,
    displayName: nickname,
    createdAt: new Date().toISOString(),
  };

  accounts[normalized] = {
    passwordHash: simpleHash(password),
    accountNickname: nickname,
    profiles: [defaultProfile],
    activeProfileId: profileId,
  };
  await AsyncStorage.setItem(KEYS.accounts, JSON.stringify(accounts));

  const session: UserSession = {
    email: normalized,
    userId: `local-${normalized}`,
    accountNickname: nickname,
    activeProfileId: profileId,
    activeProfileName: nickname,
    uiLanguage,
  };
  await setSession(session);
  return session;
}

export async function ensureLocalAccountSession(
  email: string,
  password: string,
  accountNickname: string,
  uiLanguage: UiLanguage = 'en'
): Promise<UserSession> {
  const normalized = email.trim().toLowerCase();
  const accounts = await getLocalAccounts();

  if (accounts[normalized]) {
    return loginLocalUser(email, password, accountNickname)
  }

  return registerLocalUser(email, password, accountNickname, uiLanguage)
}

export async function hasLocalAccount(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const accounts = await getLocalAccounts();
  return Boolean(accounts[normalized]);
}

export async function loginLocalUser(
  email: string,
  password: string,
  accountNickname?: string
): Promise<UserSession> {
  const normalized = email.trim().toLowerCase();
  const accounts = await getLocalAccounts();
  let account = accounts[normalized];
  if (!account || account.passwordHash !== simpleHash(password)) {
    throw new Error('Invalid email or password.');
  }

  account = migrateAccountShape(normalized, account, accountNickname?.trim());
  accounts[normalized] = account;
  await AsyncStorage.setItem(KEYS.accounts, JSON.stringify(accounts));

  const profile =
    account.profiles.find((p) => p.id === account.activeProfileId) ?? account.profiles[0];

  const prev = await getSession();
  const session: UserSession = {
    email: normalized,
    userId: `local-${normalized}`,
    accountNickname: account.accountNickname,
    activeProfileId: profile.id,
    activeProfileName: profile.displayName,
    uiLanguage: prev?.email === normalized ? prev.uiLanguage : 'en',
  };
  await setSession(session);
  await migrateLegacyAvoidList(normalized, profile.id);
  return session;
}

function migrateAccountShape(
  email: string,
  account: LocalAccount,
  nicknameOnLogin?: string
): LocalAccount {
  let next = { ...account };

  if (!next.accountNickname) {
    next.accountNickname =
      nicknameOnLogin && nicknameOnLogin.length >= 2
        ? nicknameOnLogin
        : email.split('@')[0] || 'User';
  } else if (nicknameOnLogin && nicknameOnLogin.length >= 2) {
    next.accountNickname = nicknameOnLogin;
  }

  if (!next.profiles?.length) {
    const profileId = `profile-${Date.now()}`;
    next.profiles = [
      {
        id: profileId,
        displayName: next.accountNickname,
        createdAt: new Date().toISOString(),
      },
    ];
    next.activeProfileId = profileId;
  }

  if (!next.activeProfileId) {
    next.activeProfileId = next.profiles[0].id;
  }

  return next;
}

async function migrateLegacyAvoidList(email: string, profileId: string): Promise<void> {
  const legacyKey = `${KEYS.avoid}:${email}`;
  const newKey = `${KEYS.avoid}:${email}:${profileId}`;
  const legacy = await AsyncStorage.getItem(legacyKey);
  const current = await AsyncStorage.getItem(newKey);
  if (legacy && !current) {
    await AsyncStorage.setItem(newKey, legacy);
    await AsyncStorage.removeItem(legacyKey);
  }
}

export async function getProfiles(): Promise<FamilyProfile[]> {
  const session = await getSession();
  if (!session) return [];
  const account = await getLocalAccount(session.email);
  return account?.profiles ?? [];
}

export async function addFamilyProfile(displayName: string): Promise<FamilyProfile> {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');
  const name = displayName.trim();
  if (name.length < 2) throw new Error('Profile name must be at least 2 characters.');

  const accounts = await getLocalAccounts();
  const account = accounts[session.email];
  if (!account) throw new Error('Account not found');

  const profile: FamilyProfile = {
    id: `profile-${Date.now()}`,
    displayName: name,
    createdAt: new Date().toISOString(),
  };
  account.profiles.push(profile);
  account.activeProfileId = profile.id;
  accounts[session.email] = account;
  await AsyncStorage.setItem(KEYS.accounts, JSON.stringify(accounts));

  await setSession({
    ...session,
    activeProfileId: profile.id,
    activeProfileName: profile.displayName,
  });
  return profile;
}

export async function setActiveProfile(profileId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  const accounts = await getLocalAccounts();
  const account = accounts[session.email];
  if (!account) throw new Error('Account not found');

  const profile = account.profiles.find((p) => p.id === profileId);
  if (!profile) throw new Error('Profile not found');

  account.activeProfileId = profileId;
  accounts[session.email] = account;
  await AsyncStorage.setItem(KEYS.accounts, JSON.stringify(accounts));

  await setSession({
    ...session,
    activeProfileId: profile.id,
    activeProfileName: profile.displayName,
  });
}

export async function removeFamilyProfile(profileId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  const accounts = await getLocalAccounts();
  const account = accounts[session.email];
  if (!account) throw new Error('Account not found');
  if (account.profiles.length <= 1) {
    throw new Error('You must keep at least one profile.');
  }

  account.profiles = account.profiles.filter((p) => p.id !== profileId);
  if (account.activeProfileId === profileId) {
    account.activeProfileId = account.profiles[0].id;
  }
  accounts[session.email] = account;
  await AsyncStorage.setItem(KEYS.accounts, JSON.stringify(accounts));

  await AsyncStorage.removeItem(`${KEYS.avoid}:${session.email}:${profileId}`);

  const active = account.profiles.find((p) => p.id === account.activeProfileId)!;
  await setSession({
    ...session,
    activeProfileId: active.id,
    activeProfileName: active.displayName,
  });
}

async function getLocalAccount(email: string): Promise<LocalAccount | null> {
  const accounts = await getLocalAccounts();
  const raw = accounts[email];
  if (!raw) return null;
  return migrateAccountShape(email, raw);
}

async function getLocalAccounts(): Promise<Record<string, LocalAccount>> {
  const raw = await AsyncStorage.getItem(KEYS.accounts);
  return raw ? JSON.parse(raw) : {};
}

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return `h${h}`;
}

export async function updateUiLanguage(lang: UiLanguage): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await setSession({ ...session, uiLanguage: lang });

  if (supabaseEnabled && supabase) {
    // Keep profile in sync for cloud accounts
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) {
      await supabase.from('profiles').update({ ui_language: lang }).eq('id', data.user.id);
    }
  }
}

function avoidKey(email: string, profileId: string): string {
  return `${KEYS.avoid}:${email}:${profileId}`;
}

export async function getAvoidList(): Promise<string[]> {
  const session = await getSession();
  if (!session) return [];

  if (supabaseEnabled && supabase && !session.userId.startsWith('local-')) {
    const { data, error } = await supabase
      .from('user_avoid_ingredients')
      .select('ingredient_id')
      .eq('family_profile_id', session.activeProfileId);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.ingredient_id as string);
  }

  await migrateLegacyAvoidList(session.email, session.activeProfileId);
  const raw = await AsyncStorage.getItem(avoidKey(session.email, session.activeProfileId));
  return raw ? JSON.parse(raw) : [];
}

export async function setAvoidList(ids: string[]): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  if (supabaseEnabled && supabase && !session.userId.startsWith('local-')) {
    // Replace set for this profile.
    const profileId = session.activeProfileId;
    const { error: delErr } = await supabase
      .from('user_avoid_ingredients')
      .delete()
      .eq('family_profile_id', profileId);
    if (delErr) throw delErr;

    if (ids.length > 0) {
      const rows = ids.map((ingredient_id) => ({
        family_profile_id: profileId,
        ingredient_id,
      }));
      const { error: insErr } = await supabase.from('user_avoid_ingredients').insert(rows);
      if (insErr) throw insErr;
    }

    return;
  }

  await AsyncStorage.setItem(avoidKey(session.email, session.activeProfileId), JSON.stringify(ids));
}

export async function getCustomIngredients(): Promise<Ingredient[]> {
  const raw = await AsyncStorage.getItem(KEYS.customIngredients);
  return raw ? JSON.parse(raw) : [];
}

export async function addCustomIngredient(entry: Ingredient): Promise<void> {
  const list = await getCustomIngredients();
  if (list.some((i) => i.id === entry.id)) return;
  list.push(entry);
  await AsyncStorage.setItem(KEYS.customIngredients, JSON.stringify(list));
}
