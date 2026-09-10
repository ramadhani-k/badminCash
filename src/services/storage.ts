import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Participant {
  id: string;
  name: string;
  paid: boolean;
}

export interface SessionData {
  date: string; // e.g. "30 Agustus 2026"
  participants: Participant[];
}

export interface BackupData {
  version: number;
  timestamp: string;
  masterPlayers: string[];
  currentSession: SessionData;
}

const MASTER_PLAYERS_KEY = '@badmin_master_players';
const CURRENT_SESSION_KEY = '@badmin_current_session';

export const DEFAULT_MASTER_PLAYERS = [
  'wawan',
  'ari',
  'alif',
  'aldi',
  'diki',
  'mawad',
  'khair',
  'khalid',
  'saidi',
  'DWIKI',
  'hendra',
  'ardi',
  'syifa',
  'rafi',
];

export async function getMasterPlayers(): Promise<string[]> {
  try {
    const jsonValue = await AsyncStorage.getItem(MASTER_PLAYERS_KEY);
    if (jsonValue != null) {
      return JSON.parse(jsonValue);
    }
    // If empty, initialize with default master players
    await saveMasterPlayers(DEFAULT_MASTER_PLAYERS);
    return DEFAULT_MASTER_PLAYERS;
  } catch (e) {
    console.error('Error reading master players', e);
    return DEFAULT_MASTER_PLAYERS;
  }
}

export async function saveMasterPlayers(players: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(MASTER_PLAYERS_KEY, JSON.stringify(players));
  } catch (e) {
    console.error('Error saving master players', e);
  }
}

export function getDefaultDateString(): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const now = new Date();
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  return `${day} ${month} ${year}`;
}

export async function getCurrentSession(): Promise<SessionData> {
  try {
    const jsonValue = await AsyncStorage.getItem(CURRENT_SESSION_KEY);
    if (jsonValue != null) {
      return JSON.parse(jsonValue);
    }
    const defaultSession: SessionData = {
      date: getDefaultDateString(),
      participants: [],
    };
    return defaultSession;
  } catch (e) {
    console.error('Error reading current session', e);
    return {
      date: getDefaultDateString(),
      participants: [],
    };
  }
}

export async function saveCurrentSession(session: SessionData): Promise<void> {
  try {
    await AsyncStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Error saving current session', e);
  }
}

export function formatRecapText(session: SessionData): string {
  const total = session.participants.length;
  const allPaid = total > 0 && session.participants.every((p) => p.paid);

  let header = '';
  if (allPaid) {
    header = `${session.date}: ${total} orang ✅⏺️ selesai`;
  } else {
    header = `${session.date}: ${total} orang⏳`;
  }

  const lines = session.participants.map((p) => {
    return p.paid ? `${p.name} ✅` : p.name;
  });

  return [header, ...lines].join('\n');
}

export async function createBackupJSON(): Promise<string> {
  const masterPlayers = await getMasterPlayers();
  const currentSession = await getCurrentSession();

  const backupObj: BackupData = {
    version: 1,
    timestamp: new Date().toISOString(),
    masterPlayers,
    currentSession,
  };

  return JSON.stringify(backupObj, null, 2);
}

export async function restoreFromBackupJSON(jsonString: string): Promise<boolean> {
  try {
    const parsed: BackupData = JSON.parse(jsonString);
    if (Array.isArray(parsed.masterPlayers)) {
      await saveMasterPlayers(parsed.masterPlayers);
    }
    if (parsed.currentSession && typeof parsed.currentSession === 'object') {
      await saveCurrentSession(parsed.currentSession);
    }
    return true;
  } catch (e) {
    console.error('Error restoring backup JSON', e);
    return false;
  }
}
