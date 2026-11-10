import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FamilyProfile, Ingredient, UiLanguage, UserSession } from '@/types';
import { supabase, supabaseEnabled } from '@/lib/supabase';

const KEYS = {
  session: '@safebite/session',
  accounts: '@safebite/accounts',
  avoid: '@safebite/avoid',
  customIngredients: '@safebite/custom_ingredients',
};

let storageMigrated = false;

/** In-memory guest session — also mirrored to sessionStorage on web so refresh keeps the list */
let guestSession: UserSession | null = null;
let guestAvoidList: string[] = [];
let guestCustomIngredients: Ingredient[] = [];

const GUEST_AVOID_KEY = '@safebite/guest_avoid';
const GUEST_CUSTOM_KEY = '@safebite/guest_custom';
const GUEST_SESSION_KEY = '@safebite/guest_session';

/** Serialize cloud avoid writes so rapid taps cannot race */
let avoidWriteChain: Promise<void> = Promise.resolve();

function enqueueAvoidWrite(task: () => Promise<void>): Promise<void> {
  avoidWriteChain = avoidWriteChain.then(task, task);
  return avoidWriteChain;
}

function readGuestAvoidFromWeb(): string[] {
  try {
    if (typeof sessionStorage === 'undefined') return [];
    const raw = sessionStorage.getItem(GUEST_AVOID_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeGuestAvoidToWeb(ids: string[]): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(GUEST_AVOID_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function readGuestCustomFromWeb(): Ingredient[] {
  try {
    if (typeof sessionStorage === 'undefined') return [];
    const raw = sessionStorage.getItem(GUEST_CUSTOM_KEY);
    return raw ? (JSON.parse(raw) as Ingredient[]) : [];
  } catch {
    return [];
  }
}

function writeGuestCustomToWeb(list: Ingredient[]): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(GUEST_CUSTOM_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function readGuestSessionFromWeb(): UserSession | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(GUEST_SESSION_KEY);
    return raw ? (JSON.parse(raw) as UserSession) : null;
  } catch {
    return null;
  }
}

function writeGuestSessionToWeb(session: UserSession | null): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (!session) {
      sessionStorage.removeItem(GUEST_SESSION_KEY);
      sessionStorage.removeItem(GUEST_AVOID_KEY);
      return;
    }
    sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function isGuestSession(session: UserSession | null): boolean {
  return Boolean(session?.isGuest);
}

export async function createGuestSession(uiLanguage: UiLanguage): Promise<UserSession> {
  const session: UserSession = {
    email: 'guest@safebite.local',
    userId: 'guest',
    accountNickname: 'Guest',
    activeProfileId: 'guest-profile',
    activeProfileName: 'Guest',
    uiLanguage,
    isGuest: true,
  };
  guestSession = session;
  guestAvoidList = readGuestAvoidFromWeb();
  guestCustomIngredients = readGuestCustomFromWeb();
  writeGuestSessionToWeb(session);
  writeGuestAvoidToWeb(guestAvoidList);
  writeGuestCustomToWeb(guestCustomIngredients);
  return session;
}

export function clearGuestSession(): void {
  guestSession = null;
  guestAvoidList = [];
  guestCustomIngredients = [];
  writeGuestSessionToWeb(null);
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(GUEST_CUSTOM_KEY);
    }
  } catch {
    // ignore
  }
}

async function migrateLegacyStorageKeys(): Promise<void> {
  if (storageMigrated) return;
  storageMigrated = true;

  const allKeys = await AsyncStorage.getAllKeys();
  for (const key of allKeys) {
    if (!key.startsWith('@safebyte/')) continue;
    const newKey = key.replace('@safebyte/', '@safebite/');
    const value = await AsyncStorage.getItem(key);
    if (value !== null && (await AsyncStorage.getItem(newKey)) === null) {
      await AsyncStorage.setItem(newKey, value);
    }
    await AsyncStorage.removeItem(key);
  }
}

interface LocalAccount {
  passwordHash: string;
  accountNickname: string;
  profiles: FamilyProfile[];
  activeProfileId: string;
}

export async function getSession(): Promise<UserSession | null> {
  if (guestSession) return guestSession;

  const webGuest = readGuestSessionFromWeb();
  if (webGuest?.isGuest) {
    guestSession = webGuest;
    guestAvoidList = readGuestAvoidFromWeb();
    return guestSession;
  }

  await migrateLegacyStorageKeys();

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
  if (session.isGuest) {
    guestSession = session;
    return;
  }
  // Real login replaces guest mode completely
  clearGuestSession();
  await AsyncStorage.setItem(KEYS.session, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  clearGuestSession();
  await AsyncStorage.removeItem(KEYS.session);
  try {
    const { clearIngredientsCache } = await import('@/lib/ingredients');
    clearIngredientsCache();
  } catch {
    // ignore
  }
  if (supabaseEnabled && supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      await supabase.auth.signOut({ scope: 'local' });
    }
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

  // Prefer getSession — getUser() throws AuthSessionMissingError when logged out
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
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
    (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '') ||
    (typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : '') ||
    user.email.split('@')[0];

  const uiLanguage: UiLanguage =
    (profile?.ui_language as UiLanguage | undefined) ||
    (typeof user.user_metadata?.ui_language === 'string'
      ? (user.user_metadata.ui_language as UiLanguage)
      : 'es');

  // Default family profile row is created by trigger; recreate if missing.
  let { data: fp, error: fpErr } = await supabase
    .from('family_profiles')
    .select('id,display_name')
    .eq('account_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<DbFamilyProfileRow>();
  if (fpErr) throw fpErr;

  if (!fp?.id) {
    const { data: created, error: createErr } = await supabase
      .from('family_profiles')
      .insert({ account_id: user.id, display_name: accountNickname })
      .select('id,display_name')
      .single<DbFamilyProfileRow>();
    if (createErr) throw createErr;
    fp = created;
  }

  const activeProfileId = fp.id;
  const activeProfileName = fp.display_name?.trim() || accountNickname;

  const session: UserSession = {
    email: user.email,
    userId: user.id,
    accountNickname,
    activeProfileId,
    activeProfileName,
    uiLanguage,
  };
  await setSession(session);

  // One-shot orphan recovery (must not live inside getAvoidList reads)
  try {
    await recoverOrphanAvoidLists(session);
  } catch {
    // non-fatal
  }

  try {
    const { clearIngredientsCache } = await import('@/lib/ingredients');
    clearIngredientsCache();
  } catch {
    // ignore
  }
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
  if (session.isGuest) {
    return [
      {
        id: session.activeProfileId,
        displayName: session.activeProfileName,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  // Cloud account: profiles live in Supabase; session already has the active one
  if (supabaseEnabled && supabase && !session.userId.startsWith('local-')) {
    const { data, error } = await supabase
      .from('family_profiles')
      .select('id,display_name,created_at')
      .eq('account_id', session.userId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    if (data?.length) {
      return data.map((row: { id: string; display_name: string; created_at: string }) => ({
        id: row.id,
        displayName: row.display_name,
        createdAt: row.created_at,
      }));
    }
    return [
      {
        id: session.activeProfileId,
        displayName: session.activeProfileName || session.accountNickname,
        createdAt: new Date().toISOString(),
      },
    ];
  }

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

  if (session.isGuest) return;

  if (supabaseEnabled && supabase && !session.userId.startsWith('local-')) {
    const { error } = await supabase
      .from('profiles')
      .update({ ui_language: lang })
      .eq('id', session.userId);
    if (error) throw error;
  }
}

export async function updateAccountNickname(nickname: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');
  const name = nickname.trim();
  if (name.length < 2) throw new Error('Nickname must be at least 2 characters.');

  await setSession({ ...session, accountNickname: name });

  if (session.isGuest) return;

  if (supabaseEnabled && supabase && !session.userId.startsWith('local-')) {
    const { error } = await supabase
      .from('profiles')
      .update({ account_nickname: name })
      .eq('id', session.userId);
    if (error) throw error;
    return;
  }

  // Local accounts
  const accounts = await getLocalAccounts();
  const account = accounts[session.email];
  if (account) {
    account.accountNickname = name;
    accounts[session.email] = account;
    await AsyncStorage.setItem(KEYS.accounts, JSON.stringify(accounts));
  }
}

function avoidKey(email: string, profileId: string): string {
  return `${KEYS.avoid}:${email}:${profileId}`;
}

/** Read-only: active profile avoid ids (no writes). */
export async function getAvoidList(): Promise<string[]> {
  const session = await getSession();
  if (!session) return [];

  if (session.isGuest) {
    if (guestAvoidList.length === 0) guestAvoidList = readGuestAvoidFromWeb();
    return [...guestAvoidList];
  }

  if (supabaseEnabled && supabase && !session.userId.startsWith('local-')) {
    const { data, error } = await supabase
      .from('user_avoid_ingredients')
      .select('ingredient_id')
      .eq('family_profile_id', session.activeProfileId);
    if (error) throw error;
    return [...new Set((data ?? []).map((r: { ingredient_id: string }) => r.ingredient_id))];
  }

  await migrateLegacyAvoidList(session.email, session.activeProfileId);
  try {
    const raw = await AsyncStorage.getItem(avoidKey(session.email, session.activeProfileId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Copy orphan avoid rows from other family profiles onto the active one.
 * Call from login/session setup only — never from getAvoidList.
 */
export async function recoverOrphanAvoidLists(session: UserSession): Promise<void> {
  if (!supabaseEnabled || !supabase || session.isGuest || session.userId.startsWith('local-')) {
    return;
  }
  const activeId = session.activeProfileId;
  const { data: profiles, error: profErr } = await supabase
    .from('family_profiles')
    .select('id')
    .eq('account_id', session.userId);
  if (profErr) throw profErr;

  const otherIds = (profiles ?? [])
    .map((p: { id: string }) => p.id)
    .filter((id: string) => id && id !== activeId);
  if (otherIds.length === 0) return;

  const { data: orphanRows, error: orphanErr } = await supabase
    .from('user_avoid_ingredients')
    .select('ingredient_id')
    .in('family_profile_id', otherIds);
  if (orphanErr) throw orphanErr;

  const recovered = [
    ...new Set((orphanRows ?? []).map((r: { ingredient_id: string }) => r.ingredient_id)),
  ];
  if (recovered.length === 0) return;

  const { data: known, error: knownErr } = await supabase
    .from('ingredients')
    .select('id')
    .in('id', recovered);
  if (knownErr) throw knownErr;
  const knownIds = new Set((known ?? []).map((r: { id: string }) => r.id));
  const toInsert = recovered.filter((id) => knownIds.has(id));
  if (toInsert.length === 0) return;

  const { error: insErr } = await supabase.from('user_avoid_ingredients').upsert(
    toInsert.map((ingredient_id) => ({
      family_profile_id: activeId,
      ingredient_id,
    })),
    { onConflict: 'family_profile_id,ingredient_id', ignoreDuplicates: true }
  );
  if (insErr) throw insErr;

  // Only delete orphans that were successfully known+copied
  const { error: delErr } = await supabase
    .from('user_avoid_ingredients')
    .delete()
    .in('family_profile_id', otherIds)
    .in('ingredient_id', toInsert);
  if (delErr) throw delErr;
}

async function filterKnownIngredientIds(ids: string[]): Promise<string[]> {
  if (!supabase || ids.length === 0) return [];
  const { data, error } = await supabase.from('ingredients').select('id').in('id', ids);
  if (error) throw error;
  const known = new Set((data ?? []).map((r: { id: string }) => r.id));
  return ids.filter((id) => known.has(id));
}

/** Add one ingredient to the active avoid list (queued, idempotent). */
export async function addAvoidIngredient(ingredientId: string): Promise<void> {
  return enqueueAvoidWrite(async () => {
    const session = await getSession();
    if (!session) throw new Error('Not signed in');

    if (session.isGuest) {
      if (!guestAvoidList.includes(ingredientId)) {
        guestAvoidList = [...guestAvoidList, ingredientId];
        writeGuestAvoidToWeb(guestAvoidList);
      }
      return;
    }

    if (supabaseEnabled && supabase && !session.userId.startsWith('local-')) {
      const known = await filterKnownIngredientIds([ingredientId]);
      if (known.length === 0) {
        throw new Error(
          'Este ingrediente aún no está en la base de datos. Ejecuta supabase/seed-ingredients.sql y vuelve a intentarlo.'
        );
      }
      const { error } = await supabase.from('user_avoid_ingredients').upsert(
        {
          family_profile_id: session.activeProfileId,
          ingredient_id: ingredientId,
        },
        { onConflict: 'family_profile_id,ingredient_id', ignoreDuplicates: true }
      );
      if (error) throw error;
      return;
    }

    const current = await getAvoidList();
    if (!current.includes(ingredientId)) {
      await AsyncStorage.setItem(
        avoidKey(session.email, session.activeProfileId),
        JSON.stringify([...current, ingredientId])
      );
    }
  });
}

/** Remove one ingredient from the active avoid list (queued). */
export async function removeAvoidIngredient(ingredientId: string): Promise<void> {
  return enqueueAvoidWrite(async () => {
    const session = await getSession();
    if (!session) throw new Error('Not signed in');

    if (session.isGuest) {
      guestAvoidList = guestAvoidList.filter((id) => id !== ingredientId);
      writeGuestAvoidToWeb(guestAvoidList);
      return;
    }

    if (supabaseEnabled && supabase && !session.userId.startsWith('local-')) {
      const { error } = await supabase
        .from('user_avoid_ingredients')
        .delete()
        .eq('family_profile_id', session.activeProfileId)
        .eq('ingredient_id', ingredientId);
      if (error) throw error;
      return;
    }

    const current = await getAvoidList();
    await AsyncStorage.setItem(
      avoidKey(session.email, session.activeProfileId),
      JSON.stringify(current.filter((id) => id !== ingredientId))
    );
  });
}

/** Replace avoid list via per-id add/remove (skips unknown cloud ids instead of failing the batch). */
export async function setAvoidList(ids: string[]): Promise<void> {
  return enqueueAvoidWrite(async () => {
    const session = await getSession();
    if (!session) throw new Error('Not signed in');
    const desired = [...new Set(ids)];

    if (session.isGuest) {
      guestAvoidList = desired;
      writeGuestAvoidToWeb(desired);
      return;
    }

    if (supabaseEnabled && supabase && !session.userId.startsWith('local-')) {
      const profileId = session.activeProfileId;
      const { data: existingRows, error: readErr } = await supabase
        .from('user_avoid_ingredients')
        .select('ingredient_id')
        .eq('family_profile_id', profileId);
      if (readErr) throw readErr;

      const current = new Set(
        (existingRows ?? []).map((r: { ingredient_id: string }) => r.ingredient_id)
      );
      const desiredSet = new Set(desired);
      const toAdd = desired.filter((id) => !current.has(id));
      const toRemove = [...current].filter((id) => !desiredSet.has(id));

      const knownToAdd = await filterKnownIngredientIds(toAdd);
      if (knownToAdd.length > 0) {
        const { error: insErr } = await supabase.from('user_avoid_ingredients').upsert(
          knownToAdd.map((ingredient_id) => ({
            family_profile_id: profileId,
            ingredient_id,
          })),
          { onConflict: 'family_profile_id,ingredient_id', ignoreDuplicates: true }
        );
        if (insErr) throw insErr;
      }

      if (toRemove.length > 0) {
        const { error: delErr } = await supabase
          .from('user_avoid_ingredients')
          .delete()
          .eq('family_profile_id', profileId)
          .in('ingredient_id', toRemove);
        if (delErr) throw delErr;
      }
      return;
    }

    await AsyncStorage.setItem(
      avoidKey(session.email, session.activeProfileId),
      JSON.stringify(desired)
    );
  });
}

export async function getCustomIngredients(): Promise<Ingredient[]> {
  const session = await getSession();
  if (session?.isGuest) {
    if (guestCustomIngredients.length === 0) {
      guestCustomIngredients = readGuestCustomFromWeb();
    }
    return [...guestCustomIngredients];
  }
  try {
    const raw = await AsyncStorage.getItem(KEYS.customIngredients);
    return raw ? (JSON.parse(raw) as Ingredient[]) : [];
  } catch {
    return [];
  }
}

export async function addCustomIngredient(entry: Ingredient): Promise<void> {
  const session = await getSession();
  if (session?.isGuest) {
    if (guestCustomIngredients.some((i) => i.id === entry.id)) return;
    guestCustomIngredients = [...guestCustomIngredients, entry];
    writeGuestCustomToWeb(guestCustomIngredients);
    return;
  }
  const list = await getCustomIngredients();
  if (list.some((i) => i.id === entry.id)) return;
  list.push(entry);
  await AsyncStorage.setItem(KEYS.customIngredients, JSON.stringify(list));
}
