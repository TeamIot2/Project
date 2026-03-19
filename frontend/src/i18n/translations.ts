// Czech and English translations for PLACEHOLDERname

export type Locale = "cs" | "en";

export interface Translations {
  // Navigation
  nav_dashboard: string;
  nav_history: string;
  nav_devices: string;
  nav_settings: string;

  // Environments
  env_sleep: string;
  env_sleep_desc: string;
  env_office: string;
  env_office_desc: string;
  env_sport: string;
  env_sport_desc: string;
  env_outdoor: string;
  env_outdoor_desc: string;
  env_school: string;
  env_school_desc: string;
  env_factory: string;
  env_factory_desc: string;
  env_greenhouse: string;
  env_greenhouse_desc: string;

  // Dashboard
  air_quality: string;
  air_quality_based_on: string;
  quality_good: string;
  quality_moderate: string;
  quality_poor: string;
  quality_loading: string;
  updated: string;
  sensor_co2: string;
  sensor_temperature: string;
  sensor_humidity: string;
  sensor_pressure: string;
  sensor_light: string;
  sensor_noise: string;

  // History
  individual: string;
  combined: string;
  all_sensors: string;
  deviation: string;
  deviation_desc: string;
  no_data_range: string;
  loading_chart: string;

  // Devices
  devices_title: string;
  registered_devices: string;
  status_online: string;
  status_offline: string;
  status_error: string;
  last_seen: string;
  ago: string;
  firmware: string;

  // Settings
  settings_title: string;
  profile: string;
  preferences: string;
  theme: string;
  theme_light: string;
  theme_dark: string;
  language: string;
  notifications: string;
  notifications_desc: string;
  data_refresh: string;
  data_refresh_desc: string;
  env_thresholds: string;
  metric: string;
  good_range: string;
  moderate_range: string;
  sign_out: string;

  // Login
  sign_in: string;
  sign_in_google: string;
  email: string;
  password: string;
  password_placeholder: string;
  env_monitoring: string;
  login_error: string;

  // Heart Rate
  sensor_heart_rate: string;
  sensor_hrv: string;
  hr_connect: string;
  hr_disconnect: string;
  hr_connecting: string;
  hr_not_supported: string;

  // Measuring
  measuring_active: string;
  measuring_inactive: string;
  measuring_start: string;
  measuring_stop: string;
  confirm_stop: string;
  confirm_start: string;
  confirm_yes: string;
  confirm_cancel: string;

  // Tips
  tip_ventilate: string;
  tip_temperature: string;
  tip_humidity: string;
  tip_light: string;
  tip_all_good: string;

  // Trends
  trend_rising: string;
  trend_falling: string;
  trend_stable: string;

  // Common
  loading: string;
  error: string;
  loading_dashboard: string;
}

const cs: Translations = {
  nav_dashboard: "Měření",
  nav_history: "Historie",
  nav_devices: "Zařízení",
  nav_settings: "Nastavení",

  env_sleep: "Spánek / Meditace",
  env_sleep_desc: "Monitorování kvality spánku",
  env_office: "Kancelář / Škola",
  env_office_desc: "Pracovní a studijní prostředí",
  env_sport: "Fitness / Manuální práce",
  env_sport_desc: "Fyzická aktivita a manuální práce",
  env_outdoor: "Město / Příroda",
  env_outdoor_desc: "Monitorování venkovního prostředí",
  env_school: "Škola",
  env_school_desc: "Školní prostředí",
  env_factory: "Továrna",
  env_factory_desc: "Průmyslové prostředí",
  env_greenhouse: "Skleník",
  env_greenhouse_desc: "Skleníkové prostředí",

  air_quality: "Celkové skóre",
  air_quality_based_on: "Počet senzorů: 6",
  quality_good: "Dobrá",
  quality_moderate: "Střední",
  quality_poor: "Špatná",
  quality_loading: "Načítání",
  updated: "Aktualizace",
  sensor_co2: "CO2",
  sensor_temperature: "Teplota",
  sensor_humidity: "Vlhkost",
  sensor_pressure: "Tlak",
  sensor_light: "Světlo",
  sensor_noise: "Hluk",

  individual: "Jednotlivé",
  combined: "Kombinované",
  all_sensors: "Všechny senzory",
  deviation: "Odchylka",
  deviation_desc: "Míra odchylky od ideálních podmínek (0 = ideální)",
  no_data_range: "Žádná data pro zvolené období.",
  loading_chart: "Načítání dat grafu...",

  devices_title: "Zařízení",
  registered_devices: "Registrováno",
  status_online: "Online",
  status_offline: "Offline",
  status_error: "Chyba",
  last_seen: "Naposledy viděno",
  ago: "před",
  firmware: "FW",

  settings_title: "Nastavení",
  profile: "Profil",
  preferences: "Předvolby",
  theme: "Motiv",
  theme_light: "Světlý",
  theme_dark: "Tmavý",
  language: "Jazyk",
  notifications: "Oznámení",
  notifications_desc: "Push notifikace (připravujeme)",
  data_refresh: "Interval aktualizace",
  data_refresh_desc: "Každých 30 sekund",
  env_thresholds: "Prahové hodnoty prostředí",
  metric: "Veličina",
  good_range: "Dobrý rozsah",
  moderate_range: "Střední rozsah",
  sign_out: "Odhlásit se",

  sign_in: "Přihlásit se",
  sign_in_google: "Přihlásit se přes Google",
  email: "Email",
  password: "Heslo",
  password_placeholder: "Zadejte heslo",
  env_monitoring: "Monitorování prostředí",
  login_error: "Nesprávný email nebo heslo",

  sensor_heart_rate: "Tep",
  sensor_hrv: "Variabilita tepu",
  hr_connect: "Připojit HR monitor",
  hr_disconnect: "Odpojit",
  hr_connecting: "Připojování...",
  hr_not_supported: "Web Bluetooth není podporován v tomto prohlížeči",

  measuring_active: "Měření probíhá",
  measuring_inactive: "Neměří se",
  measuring_start: "Spustit",
  measuring_stop: "Zastavit",
  confirm_stop: "Opravdu chcete zastavit sběr dat a měření?",
  confirm_start: "Spustit sběr dat se všemi vybranými zařízeními?",
  confirm_yes: "Ano",
  confirm_cancel: "Zrušit",

  tip_ventilate: "Doporučujeme vyvětrat místnost",
  tip_temperature: "Teplota je mimo optimální rozsah",
  tip_humidity: "Vlhkost vyžaduje pozornost",
  tip_light: "Osvětlení není ideální",
  tip_all_good: "Všechny hodnoty v normě",

  trend_rising: "Roste",
  trend_falling: "Klesá",
  trend_stable: "Stabilní",

  loading: "Načítání...",
  error: "Chyba",
  loading_dashboard: "Načítání přehledu...",
};

const en: Translations = {
  nav_dashboard: "Measurement",
  nav_history: "History",
  nav_devices: "Devices",
  nav_settings: "Settings",

  env_sleep: "Sleep / Meditation",
  env_sleep_desc: "Bedroom sleep quality monitoring",
  env_office: "Office / School",
  env_office_desc: "Work and study environment",
  env_sport: "Fitness / Manual Labor",
  env_sport_desc: "Physical activity and manual labor",
  env_outdoor: "Town / Nature",
  env_outdoor_desc: "Outdoor environment monitoring",
  env_school: "School",
  env_school_desc: "School environment",
  env_factory: "Factory",
  env_factory_desc: "Industrial environment",
  env_greenhouse: "Greenhouse",
  env_greenhouse_desc: "Greenhouse environment",

  air_quality: "Overall Score",
  air_quality_based_on: "Sensor count: 6",
  quality_good: "Good",
  quality_moderate: "Moderate",
  quality_poor: "Poor",
  quality_loading: "Loading",
  updated: "Updated",
  sensor_co2: "CO2",
  sensor_temperature: "Temperature",
  sensor_humidity: "Humidity",
  sensor_pressure: "Pressure",
  sensor_light: "Light",
  sensor_noise: "Noise",

  individual: "Individual",
  combined: "Combined",
  all_sensors: "All Sensors",
  deviation: "Deviation",
  deviation_desc: "Deviation from ideal conditions (0 = ideal)",
  no_data_range: "No data available for the selected time range.",
  loading_chart: "Loading chart data...",

  devices_title: "Devices",
  registered_devices: "Registered",
  status_online: "Online",
  status_offline: "Offline",
  status_error: "Error",
  last_seen: "Last seen",
  ago: "ago",
  firmware: "FW",

  settings_title: "Settings",
  profile: "Profile",
  preferences: "Preferences",
  theme: "Theme",
  theme_light: "Light",
  theme_dark: "Dark",
  language: "Language",
  notifications: "Notifications",
  notifications_desc: "Push notifications (coming soon)",
  data_refresh: "Data refresh interval",
  data_refresh_desc: "Every 30 seconds",
  env_thresholds: "Environment Thresholds",
  metric: "Metric",
  good_range: "Good Range",
  moderate_range: "Moderate Range",
  sign_out: "Sign out",

  sign_in: "Sign In",
  sign_in_google: "Sign in with Google",
  email: "Email",
  password: "Password",
  password_placeholder: "Enter your password",
  env_monitoring: "Environmental Monitoring",
  login_error: "Invalid email or password",

  sensor_heart_rate: "Heart Rate",
  sensor_hrv: "Heart Rate Variability",
  hr_connect: "Connect HR monitor",
  hr_disconnect: "Disconnect",
  hr_connecting: "Connecting...",
  hr_not_supported: "Web Bluetooth is not supported in this browser",

  measuring_active: "Currently measuring",
  measuring_inactive: "Not collecting data",
  measuring_start: "Start",
  measuring_stop: "Stop",
  confirm_stop: "Are you sure you want to stop collecting data?",
  confirm_start: "Start collecting data with all selected devices?",
  confirm_yes: "Yes",
  confirm_cancel: "Cancel",

  tip_ventilate: "Consider ventilating the room",
  tip_temperature: "Temperature is outside optimal range",
  tip_humidity: "Humidity needs attention",
  tip_light: "Lighting is not ideal",
  tip_all_good: "All values within normal range",

  trend_rising: "Rising",
  trend_falling: "Falling",
  trend_stable: "Stable",

  loading: "Loading...",
  error: "Error",
  loading_dashboard: "Loading dashboard...",
};

export const translations: Record<Locale, Translations> = { cs, en };
