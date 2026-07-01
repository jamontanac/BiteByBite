// ── i18n ────────────────────────────────────────────────
// Lightweight dictionary translation. `t(key)` returns the string for the
// current language, falling back to English, then to the key itself (so nothing
// ever renders blank). The baked-in dictionaries below are the offline/fallback
// source AND the canonical English; config/i18n_<lang>.json is fetched at boot
// (see loadConfigs) and merged over them. Keys are namespaced because option
// values aren't globally unique (e.g. `normal` is both a mood and a stool).
//
// English (`en`) values MUST match the strings the app renders verbatim — the
// test suite asserts them. Option labels (`opt.*`) are only listed for Spanish;
// in English they fall back to the config `label` (see optLabel).
let LANG = 'en';

let I18N = {
  en: {
    // Tabs / chrome
    'tab.log': 'Log', 'tab.history': 'History', 'tab.patterns': 'Patterns', 'tab.settings': 'Settings',
    'header.syncNow': 'Sync now', 'header.theme': 'Theme',
    'sync.saved': 'Saved', 'sync.saving': 'Saving…', 'sync.offline': 'Offline',
    'loading.sub': 'Loading journal…',
    // Login
    'login.tagline': 'A lightweight, data-driven food and symptom diary designed to track daily meals and identify potential food allergies or sensitivities over time.',
    'login.heading': 'Connect your journal',
    'login.intro': 'Entries are stored as a JSON file in a private GitHub repo — free, version-controlled, and accessible from any device.',
    'login.username': 'GitHub username',
    'login.repo': 'Repository name',
    'login.repoHint': 'Create a <strong>private</strong> repo on GitHub first. The data file will be stored at <code>journal.json</code>.',
    'login.token': 'Personal Access Token',
    'login.tokenHint': 'Generate one at <a href="https://github.com/settings/tokens/new" target="_blank">GitHub → Settings → Tokens</a>. Scope needed: <code>repo</code>. The token is stored only in this browser.',
    'login.button': 'Connect & open journal',
    'login.connecting': 'Connecting…',
    'login.errFields': 'Please fill in all fields.',
    'login.errConnect': 'Could not connect. Check your username, repo name, and token permissions (needs "repo" scope).',
    // Edit banner
    'editbanner.editing': 'Editing', 'editbanner.cancel': 'Cancel ×',
    // Section headers
    'sec.dayOverview': 'Day overview', 'sec.meals': 'Meals & feeds', 'sec.vomiting': 'Vomiting episodes',
    'sec.symptoms': 'Other symptoms', 'sec.notes': 'Notes', 'sec.account': 'Account',
    'sec.data': 'Data', 'sec.preferences': 'Preferences',
    // Day overview labels
    'label.date': 'Date', 'label.sleep': 'Sleep last night', 'label.mood': 'Mood / energy',
    'label.activity': 'Activity level', 'label.stool': 'Stool consistency', 'label.hydration': 'Hydration',
    // Toggles
    'toggle.newenv': 'Different environment', 'toggle.newenv.hint': 'Travel, eating out, visiting family',
    'toggle.sick': 'Signs of illness / teething', 'toggle.sick.hint': 'Runny nose, fever, inflamed gums',
    'toggle.meds': 'New medication today', 'toggle.meds.hint': 'Outside usual routine',
    'label.medName': 'Medication name & dose', 'ph.medName': 'e.g. Amoxicillin 250mg',
    // Buttons / misc log
    'btn.addMeal': 'Add meal or snack', 'btn.addVomiting': 'Add vomiting episode',
    'ph.symptomOther': 'Describe the symptom…', 'label.severity': 'Overall severity',
    'ph.notes': "Doctor's observations, new foods introduced, anything unusual…",
    'btn.save': 'Save entry', 'btn.update': 'Update entry', 'btn.saving': 'Saving to GitHub…',
    // Settings
    'settings.language': 'Language', 'settings.repo': 'GitHub repository', 'settings.entries': 'Entries stored',
    'settings.lastSync': 'Last synced', 'settings.export': 'Export as JSON', 'settings.exportSub': 'Download a local backup',
    'settings.logout': 'Sign out & clear local data',
    'settings.footer': 'BiteByBite · open source, no tracking<br>Data lives in your GitHub repo',
    'settings.never': 'Never', 'settings.todayAt': 'Today at {time}', 'settings.dateAt': '{date} at {time}',
    'settings.entryOne': '{n} entry', 'settings.entryMany': '{n} entries',
    // Toasts
    'toast.exported': 'Export downloaded', 'toast.offline': 'Could not reach GitHub. Working offline.',
    'toast.synced': 'Synced with GitHub', 'toast.syncFailed': 'Sync failed — check connection',
    'toast.updated': 'Entry updated ✓', 'toast.merged': 'Merged into existing day ✓', 'toast.saved': 'Entry saved ✓',
    'toast.saveFailed': 'Save failed: {msg}', 'toast.pickDate': 'Please pick a date', 'toast.addMeal': 'Add at least one meal',
    'logout.confirm': 'Sign out? Your data stays on GitHub. Local cache will be cleared.',
    // History
    'hist.empty': 'No entries yet.<br>Log your first day using the ✏️ tab.',
    'hist.vomited': '🤢 Vomited ({detail})', 'hist.episode': 'episode', 'hist.episodes': 'episodes',
    'hist.noVomiting': '✓ No vomiting',
    'hist.severeDay': 'Severe day', 'hist.moderateDay': 'Moderate day', 'hist.mildDay': 'Mild day',
    'hist.newFood': 'New food', 'hist.leftover': 'Leftover food', 'hist.gluten': 'Gluten', 'hist.dairy': 'Dairy',
    'hist.awayFromHome': 'Away from home', 'hist.illnessSigns': 'Illness signs', 'hist.medication': 'Medication',
    'hist.sleepTag': 'Sleep: {v}', 'hist.noDetail': '(no detail)',
    'hist.leftoverNote': 'leftover', 'hist.newFoodFallback': 'new food', 'hist.glutenNote': 'gluten',
    'hist.after': 'after', 'hist.lastMeal': 'last meal', 'hist.reaction': 'Reaction', 'hist.edit': 'Edit',
    // Patterns
    'pat.empty': 'Log at least 2 days to start<br>seeing patterns.',
    'pat.daysLogged': 'Days logged', 'pat.daysVomiting': 'Days with vomiting', 'pat.vomitRate': 'Vomit rate', 'pat.clearDays': 'Clear days',
    'pat.corrTitle': 'Possible correlations',
    'pat.corr.gluten': 'Gluten days with vomiting', 'pat.corr.dairy': 'Dairy days with vomiting',
    'pat.corr.egg': 'Egg days with vomiting', 'pat.corr.newFood': 'New food days with vomiting',
    'pat.corr.leftover': 'Leftover food days with vomiting', 'pat.corr.poorSleep': 'Poor-sleep days with vomiting',
    'pat.corr.away': 'Away-from-home days with vomiting', 'pat.corr.illness': 'Illness-sign days with vomiting',
    'pat.corr.heavy': 'Heavy-meal days with vomiting',
    'pat.corrSub': '{hits} of {total} days', 'pat.timingTitle': 'Reaction timing',
    'pat.timingNote': 'Fast reactions (&lt;2 h) suggest IgE allergy. Delayed reactions (2–8 h) are more typical of non-IgE allergy, celiac, or intolerance.',
    'pat.symptomsTitle': 'Most frequent symptoms', 'pat.howtoTitle': 'How to use these numbers',
    'pat.howtoBody': 'These percentages are descriptive, not diagnostic. A high correlation is a signal worth investigating — share this log with your pediatric gastroenterologist or allergist. They can order a targeted celiac panel (tTG-IgA, DGP-IgG) or design a supervised elimination diet based on the patterns you see here.',
    // Meal card
    'meal.remove': 'Remove', 'meal.time': 'Time given', 'meal.source': 'Source', 'meal.foods': 'Foods eaten',
    'meal.foodsPh': 'e.g. oatmeal, banana, apple juice…', 'meal.heavy': 'Meal heaviness', 'meal.amount': 'Amount eaten',
    'meal.newFood': 'New food', 'meal.newFoodHint': 'Ingredient rarely or never eaten before',
    'meal.newIngredient': 'New ingredient', 'meal.newIngredientPh': 'e.g. mango, wheat bread…',
    'meal.fresh': 'Fresh food', 'meal.freshHint': 'Cooked today, not a leftover',
    'meal.cookedWhen': 'When was it cooked?', 'meal.cookedWhenPh': 'e.g. yesterday evening, 2 days ago…',
    'meal.gluten': 'Contains gluten', 'meal.glutenHint': 'Wheat, barley, rye, spelt, or oats',
    'meal.dairy': 'Contains dairy', 'meal.egg': 'Contains egg',
    // Reaction card
    'rx.title': 'Vomiting episode', 'rx.meal': 'Meal that triggered it', 'rx.count': 'Times vomited',
    'rx.delay': 'Delay after meal', 'rx.content': 'What was vomited', 'rx.contentPh': 'e.g. breakfast residue, mucus',
    'rx.selectMeal': '— select meal —', 'rx.alreadyLogged': 'Already logged today', 'rx.addingNow': 'Adding now',
    // Meal-type short labels (typeName)
    'type.breakfast': 'Breakfast', 'type.snack': 'Snack', 'type.lunch': 'Lunch', 'type.dinner': 'Dinner', 'type.other': 'Other',
  },

  es: {
    'tab.log': 'Registro', 'tab.history': 'Historial', 'tab.patterns': 'Patrones', 'tab.settings': 'Ajustes',
    'header.syncNow': 'Sincronizar', 'header.theme': 'Tema',
    'sync.saved': 'Guardado', 'sync.saving': 'Guardando…', 'sync.offline': 'Sin conexión',
    'loading.sub': 'Cargando diario…',
    'login.tagline': 'Un diario ligero de comidas y síntomas, orientado a datos, para registrar las comidas diarias e identificar posibles alergias o sensibilidades alimentarias con el tiempo.',
    'login.heading': 'Conecta tu diario',
    'login.intro': 'Las entradas se guardan como un archivo JSON en un repositorio privado de GitHub: gratis, con control de versiones y accesible desde cualquier dispositivo.',
    'login.username': 'Usuario de GitHub',
    'login.repo': 'Nombre del repositorio',
    'login.repoHint': 'Crea primero un repositorio <strong>privado</strong> en GitHub. El archivo de datos se guardará en <code>journal.json</code>.',
    'login.token': 'Token de acceso personal',
    'login.tokenHint': 'Genera uno en <a href="https://github.com/settings/tokens/new" target="_blank">GitHub → Settings → Tokens</a>. Permiso necesario: <code>repo</code>. El token se guarda solo en este navegador.',
    'login.button': 'Conectar y abrir diario',
    'login.connecting': 'Conectando…',
    'login.errFields': 'Por favor completa todos los campos.',
    'login.errConnect': 'No se pudo conectar. Revisa tu usuario, nombre del repositorio y permisos del token (necesita el alcance "repo").',
    'editbanner.editing': 'Editando', 'editbanner.cancel': 'Cancelar ×',
    'sec.dayOverview': 'Resumen del día', 'sec.meals': 'Comidas y tomas', 'sec.vomiting': 'Episodios de vómito',
    'sec.symptoms': 'Otros síntomas', 'sec.notes': 'Notas', 'sec.account': 'Cuenta',
    'sec.data': 'Datos', 'sec.preferences': 'Preferencias',
    'label.date': 'Fecha', 'label.sleep': 'Sueño anoche', 'label.mood': 'Ánimo / energía',
    'label.activity': 'Nivel de actividad', 'label.stool': 'Consistencia de las heces', 'label.hydration': 'Hidratación',
    'toggle.newenv': 'Entorno diferente', 'toggle.newenv.hint': 'Viajes, comer fuera, visitar familia',
    'toggle.sick': 'Signos de enfermedad / dentición', 'toggle.sick.hint': 'Mocos, fiebre, encías inflamadas',
    'toggle.meds': 'Medicamento nuevo hoy', 'toggle.meds.hint': 'Fuera de la rutina habitual',
    'label.medName': 'Nombre y dosis del medicamento', 'ph.medName': 'p. ej. Amoxicilina 250mg',
    'btn.addMeal': 'Añadir comida o merienda', 'btn.addVomiting': 'Añadir episodio de vómito',
    'ph.symptomOther': 'Describe el síntoma…', 'label.severity': 'Severidad general',
    'ph.notes': 'Observaciones del médico, alimentos nuevos introducidos, cualquier cosa inusual…',
    'btn.save': 'Guardar entrada', 'btn.update': 'Actualizar entrada', 'btn.saving': 'Guardando en GitHub…',
    'settings.language': 'Idioma', 'settings.repo': 'Repositorio de GitHub', 'settings.entries': 'Entradas guardadas',
    'settings.lastSync': 'Última sincronización', 'settings.export': 'Exportar como JSON', 'settings.exportSub': 'Descargar una copia local',
    'settings.logout': 'Cerrar sesión y borrar datos locales',
    'settings.footer': 'BiteByBite · código abierto, sin rastreo<br>Tus datos viven en tu repositorio de GitHub',
    'settings.never': 'Nunca', 'settings.todayAt': 'Hoy a las {time}', 'settings.dateAt': '{date} a las {time}',
    'settings.entryOne': '{n} entrada', 'settings.entryMany': '{n} entradas',
    'toast.exported': 'Exportación descargada', 'toast.offline': 'No se pudo conectar con GitHub. Trabajando sin conexión.',
    'toast.synced': 'Sincronizado con GitHub', 'toast.syncFailed': 'Falló la sincronización — revisa la conexión',
    'toast.updated': 'Entrada actualizada ✓', 'toast.merged': 'Combinada con el día existente ✓', 'toast.saved': 'Entrada guardada ✓',
    'toast.saveFailed': 'Error al guardar: {msg}', 'toast.pickDate': 'Por favor elige una fecha', 'toast.addMeal': 'Añade al menos una comida',
    'logout.confirm': '¿Cerrar sesión? Tus datos permanecen en GitHub. Se borrará la caché local.',
    'hist.empty': 'Aún no hay entradas.<br>Registra tu primer día en la pestaña ✏️.',
    'hist.vomited': '🤢 Vómito ({detail})', 'hist.episode': 'episodio', 'hist.episodes': 'episodios',
    'hist.noVomiting': '✓ Sin vómito',
    'hist.severeDay': 'Día severo', 'hist.moderateDay': 'Día moderado', 'hist.mildDay': 'Día leve',
    'hist.newFood': 'Comida nueva', 'hist.leftover': 'Sobras', 'hist.gluten': 'Gluten', 'hist.dairy': 'Lácteos',
    'hist.awayFromHome': 'Fuera de casa', 'hist.illnessSigns': 'Signos de enfermedad', 'hist.medication': 'Medicamento',
    'hist.sleepTag': 'Sueño: {v}', 'hist.noDetail': '(sin detalle)',
    'hist.leftoverNote': 'sobras', 'hist.newFoodFallback': 'comida nueva', 'hist.glutenNote': 'gluten',
    'hist.after': 'después de', 'hist.lastMeal': 'la última comida', 'hist.reaction': 'Reacción', 'hist.edit': 'Editar',
    'pat.empty': 'Registra al menos 2 días para empezar<br>a ver patrones.',
    'pat.daysLogged': 'Días registrados', 'pat.daysVomiting': 'Días con vómito', 'pat.vomitRate': 'Tasa de vómito', 'pat.clearDays': 'Días despejados',
    'pat.corrTitle': 'Posibles correlaciones',
    'pat.corr.gluten': 'Días con gluten y vómito', 'pat.corr.dairy': 'Días con lácteos y vómito',
    'pat.corr.egg': 'Días con huevo y vómito', 'pat.corr.newFood': 'Días con comida nueva y vómito',
    'pat.corr.leftover': 'Días con sobras y vómito', 'pat.corr.poorSleep': 'Días con mal sueño y vómito',
    'pat.corr.away': 'Días fuera de casa con vómito', 'pat.corr.illness': 'Días con signos de enfermedad y vómito',
    'pat.corr.heavy': 'Días con comida pesada y vómito',
    'pat.corrSub': '{hits} de {total} días', 'pat.timingTitle': 'Tiempo de reacción',
    'pat.timingNote': 'Las reacciones rápidas (&lt;2 h) sugieren alergia IgE. Las reacciones tardías (2–8 h) son más típicas de alergia no IgE, celiaquía o intolerancia.',
    'pat.symptomsTitle': 'Síntomas más frecuentes', 'pat.howtoTitle': 'Cómo usar estos números',
    'pat.howtoBody': 'Estos porcentajes son descriptivos, no diagnósticos. Una correlación alta es una señal que vale la pena investigar: comparte este registro con tu gastroenterólogo o alergólogo pediátrico. Pueden solicitar un panel de celiaquía específico (tTG-IgA, DGP-IgG) o diseñar una dieta de eliminación supervisada según los patrones que ves aquí.',
    'meal.remove': 'Quitar', 'meal.time': 'Hora', 'meal.source': 'Origen', 'meal.foods': 'Alimentos',
    'meal.foodsPh': 'p. ej. avena, plátano, jugo de manzana…', 'meal.heavy': 'Pesadez de la comida', 'meal.amount': 'Cantidad comida',
    'meal.newFood': 'Comida nueva', 'meal.newFoodHint': 'Ingrediente rara vez o nunca comido antes',
    'meal.newIngredient': 'Ingrediente nuevo', 'meal.newIngredientPh': 'p. ej. mango, pan de trigo…',
    'meal.fresh': 'Comida fresca', 'meal.freshHint': 'Cocinada hoy, no son sobras',
    'meal.cookedWhen': '¿Cuándo se cocinó?', 'meal.cookedWhenPh': 'p. ej. ayer por la tarde, hace 2 días…',
    'meal.gluten': 'Contiene gluten', 'meal.glutenHint': 'Trigo, cebada, centeno, espelta o avena',
    'meal.dairy': 'Contiene lácteos', 'meal.egg': 'Contiene huevo',
    'rx.title': 'Episodio de vómito', 'rx.meal': 'Comida que lo provocó', 'rx.count': 'Veces que vomitó',
    'rx.delay': 'Tiempo tras la comida', 'rx.content': 'Qué vomitó', 'rx.contentPh': 'p. ej. restos del desayuno, moco',
    'rx.selectMeal': '— elegir comida —', 'rx.alreadyLogged': 'Ya registrado hoy', 'rx.addingNow': 'Añadiendo ahora',
    'type.breakfast': 'Desayuno', 'type.snack': 'Merienda', 'type.lunch': 'Almuerzo', 'type.dinner': 'Cena', 'type.other': 'Otro',
    // Option labels (English falls back to config; Spanish provided here)
    'opt.sleep.great': 'Genial', 'opt.sleep.ok': 'Bien (algunos despertares)', 'opt.sleep.poor': 'Malo', 'opt.sleep.very-poor': 'Muy malo',
    'opt.mood.happy': 'Feliz, con energía', 'opt.mood.normal': 'Normal', 'opt.mood.fussy': 'Irritable', 'opt.mood.tired': 'Cansado, apático',
    'opt.activity.low': 'Baja / tranquila', 'opt.activity.normal': 'Juego normal', 'opt.activity.high': 'Muy activo',
    'opt.stool.normal': 'Normal', 'opt.stool.soft': 'Blanda / suelta', 'opt.stool.watery': 'Líquida / diarrea', 'opt.stool.hard': 'Dura / estreñido', 'opt.stool.none': 'Ninguna hoy',
    'opt.hydration.good': 'Buena', 'opt.hydration.low': 'Por debajo de lo normal', 'opt.hydration.poor': 'Mala / rechazó',
    'opt.mealType.breakfast': 'Desayuno', 'opt.mealType.snack': 'Merienda de la mañana', 'opt.mealType.lunch': 'Almuerzo', 'opt.mealType.snack2': 'Merienda de la tarde', 'opt.mealType.dinner': 'Cena', 'opt.mealType.other': 'Otro',
    'opt.source.homemade': 'Casera', 'opt.source.packaged': 'Empaquetada / comercial', 'opt.source.restaurant': 'Restaurante / fuera', 'opt.source.formula': 'Fórmula / leche materna',
    'opt.heavy.light': 'Ligera', 'opt.heavy.moderate': 'Moderada', 'opt.heavy.heavy': 'Pesada / grasosa',
    'opt.amount.all': 'Todo / casi todo', 'opt.amount.half': 'Aproximadamente la mitad', 'opt.amount.little': 'Solo un poco', 'opt.amount.refused': 'Rechazó',
    'opt.count.1': 'Una vez', 'opt.count.2': 'Dos veces', 'opt.count.3+': '3 o más',
    'opt.delay.': 'No aplica', 'opt.delay.<30m': 'Menos de 30 min', 'opt.delay.30-60m': '30 – 60 min', 'opt.delay.1-2h': '1 – 2 horas', 'opt.delay.2-3h': '2 – 3 horas', 'opt.delay.3-4h': '3 – 4 horas', 'opt.delay.>4h': 'Más de 4 horas',
    'opt.symptom.bloating': 'Hinchazón', 'opt.symptom.gas': 'Exceso de gases', 'opt.symptom.cramps': 'Calambres estomacales', 'opt.symptom.rash': 'Sarpullido', 'opt.symptom.itching': 'Picazón', 'opt.symptom.swelling': 'Hinchazón de labios / cara', 'opt.symptom.reflux': 'Reflujo / regurgitación', 'opt.symptom.crying': 'Llanto inconsolable', 'opt.symptom.constipation': 'Estreñimiento', 'opt.symptom.other': 'Otro…',
    'opt.severity.1': 'Leve', 'opt.severity.2': 'Moderada', 'opt.severity.3': 'Severa',
  },
};

// Translate a key. Optional `vars` fills {placeholders}. Falls back
// current-language → English → the key itself.
function t(key, vars) {
  const dict = I18N[LANG] || {};
  let s = (key in dict) ? dict[key] : (I18N.en[key] != null ? I18N.en[key] : key);
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}

// Translated label for a config option `o` in namespace `ns` (e.g. 'opt.sleep').
// Falls back to the config-provided English `label` when there's no translation.
function optLabel(ns, o) {
  if (!ns) return o.label;
  const key = ns + '.' + o.value;
  const s = t(key);
  return s === key ? o.label : s;
}

// Fills every translatable node under `root` and syncs the language selector.
// Called on boot and whenever the language changes.
function applyI18n(root) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  root.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  const sel = document.getElementById('lang-select');
  if (sel) sel.value = LANG;
}

// Switches language: persists it, re-fills static text, and re-renders the
// data-driven views (History / Patterns / Settings) and the Log-tab controls.
function setLang(lang) {
  LANG = lang;
  saveLang(lang);
  applyI18n(document);
  refreshViews();
  retranslateLogForm();
}
