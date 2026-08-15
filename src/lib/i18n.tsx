import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'rw';

const en = {
  appName: 'Fleet Management & GPS Tracking System',
  shortOrg: 'Fleet FMS',
  orgName: 'Management Sciences for Health',
  orgLine: 'USAID-IREME Project · Rwanda',
  location: 'Kigali, Rwanda · USAID-IREME',
  signIn: 'Sign In',
  signInSubtitle: 'Enter your credentials to access the system.',
  emailLabel: 'Email Address',
  emailPlaceholder: 'yourname@msh.rw',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter your password',
  signingIn: 'Signing in…',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  forgotPassword: 'Forgot password?',
  resetPassword: 'Reset password',
  resetPasswordTitle: 'Reset your password',
  resetPasswordIntro:
    'Forgotten your password? Verify your email using the password you last used, then choose a new one. An administrator must approve the request before the new password takes effect.',
  resetEmailLabel: 'Email Address',
  resetLastUsedLabel: 'Recent / last used password',
  resetLastUsedHint: 'The password you last successfully used to sign in. It is verified before the request is sent.',
  resetNewLabel: 'New Password',
  resetConfirmLabel: 'Confirm New Password',
  resetNotifyHint: 'Passwords must be at least 6 characters.',
  resetSubmitted:
    'Your reset request was submitted. An administrator must approve it before the new password becomes active.',
  resetSubmit: 'Submit Reset Request',
  resetBack: 'Back to sign in',
  heroDescription:
    'A centralized platform for managing organizational vehicles, travel requests, driver assignments, fuel and maintenance records, and fleet visibility across Rwanda.',
  featTracking: 'Real-time vehicle GPS tracking',
  featRequests: 'Travel request workflow',
  featRecords: 'Fuel & maintenance records',
  featReports: 'Fleet reports & analytics',
  missionTitle: 'Rwanda',
  missionText: 'Dependable fleet operations in support of health programs across Rwanda.',
  navOverview: 'Overview',
  navDashboard: 'Dashboard',
  navLiveTracking: 'Live Tracking',
  navRequests: 'Requests',
  navAllRequests: 'All Requests',
  navFleet: 'Fleet',
  navVehicles: 'Vehicles',
  navDrivers: 'Drivers',
  navUsers: 'Users',
  navOperations: 'Operations',
  navFuel: 'Fuel',
  navMaintenance: 'Maintenance',
  navReports: 'Reports',
  navDepartments: 'Departments',
  navAuditLogs: 'Audit Logs',
  navSettings: 'Settings',
  navPasswordResets: 'Password Resets',
  navSystem: 'System',
  navMyWorkspace: 'My Workspace',
  navNewRequest: 'New Request',
  navMyRequests: 'My Requests',
  navMyAccount: 'My Account',
  navMyTrips: 'My Trips',
  navAssignedTrips: 'Assigned Trips',
  notifications: 'Notifications',
  markAllRead: 'Mark all read',
  noNotifications: 'No notifications',
  signOut: 'Sign out',
  offline: 'Offline',
  lastSync: 'Last synchronized',
  installApp: 'Install Fleet FMS',
  openMenu: 'Open menu',
} as const;

const rw: Record<keyof typeof en, string> = {
  appName: 'Gucunga Ibinyabiziga & Gukurikirana GPS',
  shortOrg: 'Fleet FMS',
  orgName: 'Management Sciences for Health',
  orgLine: 'Umushinga wa USAID-IREME · Rwanda',
  location: 'Kigali, Rwanda · USAID-IREME',
  signIn: 'Injira',
  signInSubtitle: 'Andika ibimenyetso byawe kugira ngo winjire muri sisitemu.',
  emailLabel: 'Aderesi ya imeri',
  emailPlaceholder: 'yourname@msh.rw',
  passwordLabel: 'Ijambobanga',
  passwordPlaceholder: 'Andika ijambobanga',
  signingIn: 'Kwinjira…',
  showPassword: 'Erekana ijambobanga',
  hidePassword: 'Hisha ijambobanga',
  forgotPassword: 'Wibagiwe ijambobanga?',
  resetPassword: 'Hindura ijambobanga',
  resetPasswordTitle: 'Hindura ijambobanga yawe',
  resetPasswordIntro:
    'Wibagiwe ijambobanga? Gamba aderesi ya imeri ujya ukoresha ijambobanga wakoresheje, hanyuma hitamo irindi jambobanga. Umuyobozi agomba kwemeza isabwa mbere y’uko ijambobanga rishya rikoreshwa.',
  resetEmailLabel: 'Aderesi ya imeri',
  resetLastUsedLabel: 'Ijambobanga rishya / rya nyuma',
  resetLastUsedHint: 'Ijambobanga wakoresheje mu gihe cya nyuma winjira. Riragenzurwa mbere yo kohereza isabwa.',
  resetNewLabel: 'Ijambobanga Rishya',
  resetConfirmLabel: 'Emeza Ijambobanga Rishya',
  resetNotifyHint: 'Ijambobanga rigomba kuba nibura inyuguti 6.',
  resetSubmitted:
    'Isabwa ryawe ryo guhindura ijambobanga ryoherejwe. Umuyobozi agomba kurwemeza mbere y’uko ijambobanga rishya rikoreshwa.',
  resetSubmit: 'Ohereza Isabwa',
  resetBack: 'Subira ku kwinira',
  heroDescription:
    'Urubuga rw’urwego rumwe rwo gucunga ibinyabiziga by’umuryango, amasabwa y’ingendo, abashoferi, amaserivisi ya lisansi n’imirimo y’ubukungu, ndetse no gukurikirana ibinyabiziga mu Rwanda.',
  featTracking: 'Gukurikirana ibinyabiziga kuri GPS mu gihe nyacyo',
  featRequests: 'Urukurikirane rw’amasabwa y’ingendo',
  featRecords: 'Amanota ya lisansi n’imirimo y’ubukungu',
  featReports: 'Raporo n’isesengura ry’ibinyabiziga',
  missionTitle: 'Rwanda',
  missionText: 'Gucunga ibinyabiziga mu buryo bwizewe mu rwego rw’imirimo y’ubuzima mu Rwanda.',
  navOverview: 'INKAMO — URUHIMBIKO',
  navDashboard: 'Ikibaho',
  navLiveTracking: 'Gukurikirana kuri GPS',
  navRequests: 'Amasabwa',
  navAllRequests: 'Amasabwa yose',
  navFleet: 'Ibinyabiziga',
  navVehicles: 'Ibinyabiziga',
  navDrivers: 'Abashoferi',
  navUsers: 'Abakoresha',
  navOperations: 'Imikorere',
  navFuel: 'Lisansi',
  navMaintenance: 'Serivisi n’ubukungu',
  navReports: 'Raporo',
  navDepartments: 'Amashami',
  navAuditLogs: 'Amanota y’ibikorwa',
  navSettings: 'Imigenzura',
  navPasswordResets: 'Guhindura Ijambobanga',
  navSystem: 'Sisitemu',
  navMyWorkspace: 'Aho Nkorera',
  navNewRequest: 'Isabwa Rishya',
  navMyRequests: 'Amasabwa Yanjye',
  navMyAccount: 'Konti Yanjye',
  navMyTrips: 'Ingendo Zanjye',
  navAssignedTrips: 'Ingendo Zashyizweho',
  notifications: 'Amamenyesha',
  markAllRead: 'Soma byose',
  noNotifications: 'Nta mamenyesha',
  signOut: 'Sohoka',
  offline: 'Offline',
  lastSync: 'Iheruka guhuza',
  installApp: 'Shyiramo Fleet FMS',
  openMenu: 'Fungura imenyu',
};

export type I18nKey = keyof typeof en;

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: I18nKey) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key) => en[key],
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = window.localStorage.getItem('fms-lang');
    return stored === 'rw' || stored === 'en' ? stored : 'en';
  });

  useEffect(() => {
    window.localStorage.setItem('fms-lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (next: Lang) => setLangState(next);
  const t = (key: I18nKey) => (lang === 'rw' ? rw[key] : en[key]);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}