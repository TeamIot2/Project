// Czech and English translations for Team2App

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
  time_window: string;
  custom_time_window: string;
  time_from: string;
  time_to: string;
  graph_style: string;
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
  disconnect_device: string;
  connect_new_device: string;
  connect_new_device_subtitle: string;
  device_name_label: string;
  device_name_placeholder: string;
  device_name_required: string;
  connect_ready: string;
  location_label: string;
  location_placeholder: string;
  connection_type_label: string;
  close: string;
  connect: string;

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
  instant_login: string;

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
  mode_without_device_message: string;
  mode_without_device_action: string;

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

  // Validation
  invalid_date_range: string;
  invalid_date_values: string;
  avatar_too_large: string;
  avatar_invalid_type: string;

  // Favorites
  add_to_favorites: string;
  remove_from_favorites: string;
  favorites_limit: string;
  favorite: string;

  // Common
  loading: string;
  error: string;
  loading_dashboard: string;
  storage_error: string;
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

  time_window: "Časové okno",
  custom_time_window: "Vlastní časové okno",
  time_from: "Od",
  time_to: "Do",
  graph_style: "Vizualizace",
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
  disconnect_device: "Odpojit zařízení",
  connect_new_device: "Připojit nové zařízení",
  connect_new_device_subtitle: "Vytvořte připojovací profil nového senzoru.",
  device_name_label: "Název zařízení",
  device_name_placeholder: "např. Třída 2A",
  device_name_required: "Vyplňte název zařízení.",
  connect_ready: "Připojení nového zařízení je připraveno (demo flow).",
  location_label: "Místo",
  location_placeholder: "např. 2. patro",
  connection_type_label: "Typ připojení",
  close: "Zavřít",
  connect: "Připojit",

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
  instant_login: "Přihlásit okamžitě",

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
  mode_without_device_message: "Vybraný režim nemá zatím přiřazené žádné zařízení.",
  mode_without_device_action: "Vyberte 1",

  tip_ventilate: "Doporučujeme vyvětrat místnost",
  tip_temperature: "Teplota je mimo optimální rozsah",
  tip_humidity: "Vlhkost vyžaduje pozornost",
  tip_light: "Osvětlení není ideální",
  tip_all_good: "Všechny hodnoty v normě",

  trend_rising: "Roste",
  trend_falling: "Klesá",
  trend_stable: "Stabilní",

  invalid_date_range: "Počáteční datum musí být před koncovým datem.",
  invalid_date_values: "Zadané datum nebo čas jsou neplatné.",
  avatar_too_large: "Obrázek je příliš velký (max 5 MB).",
  avatar_invalid_type: "Soubor musí být obrázek.",

  add_to_favorites: "Přidat do oblíbených",
  remove_from_favorites: "Odebrat z oblíbených",
  favorites_limit: "Limit dosažen (3/3)",
  favorite: "Oblíbené",

  loading: "Načítání...",
  error: "Chyba",
  loading_dashboard: "Načítání přehledu...",
  storage_error: "Uložení se nezdařilo.",
};

const en: Translations = {
  nav_dashboard: "Monitoring",
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

  time_window: "Time Window",
  custom_time_window: "Custom Time Window",
  time_from: "From",
  time_to: "To",
  graph_style: "Visualization",
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
  disconnect_device: "Disconnect device",
  connect_new_device: "Connect new device",
  connect_new_device_subtitle: "Create a new sensor connection profile.",
  device_name_label: "Device name",
  device_name_placeholder: "e.g. Office sensor",
  device_name_required: "Enter a device name.",
  connect_ready: "New device connect flow is ready (demo mode).",
  location_label: "Location",
  location_placeholder: "e.g. 2nd floor",
  connection_type_label: "Connection type",
  close: "Close",
  connect: "Connect",

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
  instant_login: "Instant Login",

  sensor_heart_rate: "Heart Rate",
  sensor_hrv: "Heart Rate Variability",
  hr_connect: "Connect HR monitor",
  hr_disconnect: "Disconnect",
  hr_connecting: "Connecting...",
  hr_not_supported: "Web Bluetooth is not supported in this browser",

  measuring_active: "Monitoring",
  measuring_inactive: "Paused",
  measuring_start: "Start",
  measuring_stop: "Stop",
  confirm_stop: "Are you sure you want to stop collecting data?",
  confirm_start: "Start collecting data with all selected devices?",
  confirm_yes: "Yes",
  confirm_cancel: "Cancel",
  mode_without_device_message: "Selected mode has no assigned devices yet.",
  mode_without_device_action: "Choose one",

  tip_ventilate: "Consider ventilating the room",
  tip_temperature: "Temperature is outside optimal range",
  tip_humidity: "Humidity needs attention",
  tip_light: "Lighting is not ideal",
  tip_all_good: "All values within normal range",

  trend_rising: "Rising",
  trend_falling: "Falling",
  trend_stable: "Stable",

  invalid_date_range: "Start date must be before end date.",
  invalid_date_values: "The entered date or time is invalid.",
  avatar_too_large: "Image is too large (max 5 MB).",
  avatar_invalid_type: "File must be an image.",

  add_to_favorites: "Add to favorites",
  remove_from_favorites: "Remove from favorites",
  favorites_limit: "Limit reached (3/3)",
  favorite: "Favorite",

  loading: "Loading...",
  error: "Error",
  loading_dashboard: "Loading dashboard...",
  storage_error: "Saving failed.",
};

export const translations: Record<Locale, Translations> = { cs, en };
