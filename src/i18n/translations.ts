import type { UiLanguage } from '@/types';

type Keys =
  | 'slogan'
  | 'enter'
  | 'login'
  | 'email'
  | 'password'
  | 'register'
  | 'signIn'
  | 'signOut'
  | 'languageTitle'
  | 'continue'
  | 'preferencesTitle'
  | 'searchPlaceholder'
  | 'myAvoidList'
  | 'save'
  | 'scanTitle'
  | 'scanHint'
  | 'safe'
  | 'notSafe'
  | 'matched'
  | 'disclaimer'
  | 'productNotFound'
  | 'demoBarcode'
  | 'addUnknown'
  | 'unknownPrompt'
  | 'nickname'
  | 'profilesSection'
  | 'accountLabel'
  | 'addProfile'
  | 'profileNamePlaceholder'
  | 'profileNameTooShort'
  | 'profilesHint'
  | 'scanForProfile'
  | 'removeProfileTitle'
  | 'removeProfileMessage'
  | 'remove'
  | 'cancel'
  | 'accountSettingsTitle'
  | 'saveNickname';

const en: Record<Keys, string> = {
  slogan: 'Scan. Smile. Bite.',
  enter: 'Enter',
  login: 'Login',
  email: 'Email',
  password: 'Password',
  register: 'Create account',
  signIn: 'Sign in',
  signOut: 'Sign out',
  languageTitle: 'Choose your language',
  continue: 'Continue',
  preferencesTitle: 'Add ingredients to avoid',
  searchPlaceholder: 'Search ingredient (e.g. sorbitol, corn starch)',
  myAvoidList: 'Your avoid list',
  save: 'Saved',
  scanTitle: 'Scan product',
  scanHint: 'Point the camera at the barcode',
  safe: 'OK for you',
  notSafe: 'Not OK — contains:',
  matched: 'Matched',
  disclaimer:
    'Informational only. Always read the physical package and consult a professional for allergies.',
  productNotFound: 'Product not found in database. Try another barcode or check the label manually.',
  demoBarcode: 'Try demo barcode',
  addUnknown: 'Add to dictionary',
  unknownPrompt: 'Term not found. Add "{term}" for everyone?',
  nickname: 'Your name or nickname',
  profilesSection: 'Family profiles',
  accountLabel: 'Account: {name}',
  addProfile: 'Add profile',
  profileNamePlaceholder: 'e.g. Lucía, Mom, Tom',
  profileNameTooShort: 'Name must be at least 2 characters.',
  profilesHint: 'Tap to switch. Long-press a profile to remove it.',
  scanForProfile: 'Scanning for: {name}',
  removeProfileTitle: 'Remove profile?',
  removeProfileMessage: 'Delete "{name}" and their avoid list?',
  remove: 'Remove',
  cancel: 'Cancel',
  accountSettingsTitle: 'Account settings',
  saveNickname: 'Save nickname',
};

export const translations: Record<UiLanguage, Record<Keys, string>> = {
  en,
  it: {
    ...en,
    slogan: 'Scansiona. Sai. Mangia sicuro.',
    enter: 'Entra',
    login: 'Accedi',
    languageTitle: 'Scegli la lingua',
    preferencesTitle: 'Aggiungi ingredienti da evitare',
    searchPlaceholder: 'Cerca ingrediente (es. sorbitolo, amido di mais)',
    myAvoidList: 'La tua lista da evitare',
    scanTitle: 'Scansiona prodotto',
    safe: 'OK per te',
    notSafe: 'Non OK — contiene:',
  },
  fr: {
    ...en,
    slogan: 'Scannez. Sachez. Mangez serein.',
    enter: 'Entrer',
    login: 'Connexion',
    languageTitle: 'Choisissez la langue',
    preferencesTitle: 'Ajoutez des ingrédients à éviter',
    searchPlaceholder: 'Rechercher (ex. sorbitol, amidon de maïs)',
    myAvoidList: 'Votre liste à éviter',
    scanTitle: 'Scanner le produit',
    safe: 'OK pour vous',
    notSafe: 'Pas OK — contient :',
  },
  de: {
    ...en,
    slogan: 'Scannen. Wissen. Sicher essen.',
    enter: 'Start',
    login: 'Anmelden',
    languageTitle: 'Sprache wählen',
    preferencesTitle: 'Zutaten zum Vermeiden hinzufügen',
    searchPlaceholder: 'Zutat suchen (z.B. Sorbit, Maisstärke)',
    myAvoidList: 'Ihre Vermeidungsliste',
    scanTitle: 'Produkt scannen',
    safe: 'OK für Sie',
    notSafe: 'Nicht OK — enthält:',
  },
  es: {
    ...en,
    slogan: 'Escanea. Saber. Come seguro.',
    enter: 'Entrar',
    login: 'Iniciar sesión',
    languageTitle: 'Elige idioma',
    preferencesTitle: 'Añade ingredientes a evitar',
    searchPlaceholder: 'Buscar ingrediente (ej. sorbitol, maicena)',
    myAvoidList: 'Tu lista a evitar',
    scanTitle: 'Escanear producto',
    safe: 'OK para ti',
    notSafe: 'No OK — contiene:',
    nickname: 'Tu nombre o apodo',
    profilesSection: 'Perfiles familiares',
    accountLabel: 'Cuenta: {name}',
    addProfile: 'Añadir perfil',
    profileNamePlaceholder: 'ej. Lucía, Mamá, Tomás',
    profilesHint: 'Toca para cambiar. Mantén pulsado para eliminar.',
    scanForProfile: 'Escaneando para: {name}',
    removeProfileTitle: '¿Eliminar perfil?',
    removeProfileMessage: '¿Borrar "{name}" y su lista a evitar?',
    remove: 'Eliminar',
    cancel: 'Cancelar',
    accountSettingsTitle: 'Ajustes de cuenta',
    saveNickname: 'Guardar nickname',
  },
  pt: {
    ...en,
    slogan: 'Escaneie. Saiba. Coma seguro.',
    enter: 'Entrar',
    login: 'Entrar',
    languageTitle: 'Escolha o idioma',
    preferencesTitle: 'Adicione ingredientes a evitar',
    searchPlaceholder: 'Buscar ingrediente (ex. sorbitol, amido de milho)',
    myAvoidList: 'Sua lista a evitar',
    scanTitle: 'Escanear produto',
    safe: 'OK para você',
    notSafe: 'Não OK — contém:',
  },
  ru: {
    ...en,
    slogan: 'Сканируй. Знай. Ешь безопасно.',
    enter: 'Войти',
    login: 'Вход',
    languageTitle: 'Выберите язык',
    preferencesTitle: 'Добавьте ингредиенты для исключения',
    searchPlaceholder: 'Поиск ингредиента',
    myAvoidList: 'Список исключений',
    scanTitle: 'Сканировать',
    safe: 'Подходит',
    notSafe: 'Не подходит — содержит:',
  },
  ar: {
    ...en,
    slogan: 'امسح. اعرف. كل بأمان.',
    enter: 'دخول',
    login: 'تسجيل',
    languageTitle: 'اختر اللغة',
    preferencesTitle: 'أضف مكوّنات لتجنبها',
    searchPlaceholder: 'ابحث عن مكوّن',
    myAvoidList: 'قائمة ما تتجنبه',
    scanTitle: 'مسح المنتج',
    safe: 'مناسب لك',
    notSafe: 'غير مناسب — يحتوي:',
  },
  ca: {
    ...en,
    slogan: 'Escaneja. Coneix. Menja segur.',
    enter: 'Entrar',
    login: 'Inicia sessió',
    signOut: 'Tanca sessió',
    languageTitle: 'Tria l\'idioma',
    continue: 'Continua',
    preferencesTitle: 'Afegeix ingredients a evitar',
    searchPlaceholder: 'Cerca ingredient (ex. sorbitol, midó de blat de moro)',
    myAvoidList: 'La teva llista a evitar',
    save: 'Desat',
    scanTitle: 'Escaneja producte',
    scanHint: 'Apunta la càmera al codi de barres',
    safe: 'OK per a tu',
    notSafe: 'No OK — conté:',
    matched: 'Coincideix',
    disclaimer:
      'Només informatiu. Llegeix sempre l\'envàs físic i consulta un professional per a al·lèrgies.',
    productNotFound: 'Producte no trobat a la base de dades. Prova un altre codi o revisa l\'etiqueta.',
    demoBarcode: 'Prova un codi demo',
    addUnknown: 'Afegeix al diccionari',
    unknownPrompt: 'Terme no trobat. Afegir "{term}" per a tothom?',
    nickname: 'El teu nom o sobrenom',
    profilesSection: 'Perfils familiars',
    accountLabel: 'Compte: {name}',
    addProfile: 'Afegeix perfil',
    profileNamePlaceholder: 'ex. Laia, Mama, Tomàs',
    profileNameTooShort: 'El nom ha de tenir almenys 2 caràcters.',
    profilesHint: 'Toca per canviar. Mantén premut per eliminar.',
    scanForProfile: 'Escanejant per a: {name}',
    removeProfileTitle: 'Eliminar perfil?',
    removeProfileMessage: 'Vols esborrar "{name}" i la seva llista a evitar?',
    remove: 'Eliminar',
    cancel: 'Cancel·la',
    accountSettingsTitle: 'Configuració del compte',
    saveNickname: 'Desa el sobrenom',
  },
};

export function t(lang: UiLanguage, key: Keys, vars?: Record<string, string>): string {
  let text = translations[lang]?.[key] ?? translations.en[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}
