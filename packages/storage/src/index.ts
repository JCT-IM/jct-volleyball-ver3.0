export interface StorageKeyMap {
    TEAM_SETS_KEY: string;
    MATCH_HISTORY_KEY: string;
    USER_EMBLEMS_KEY: string;
    ACHIEVEMENTS_KEY: string;
    TOURNAMENTS_KEY: string;
    LEAGUES_KEY: string;
    COACHING_LOGS_KEY: string;
    BACKUP_KEY: string;
    OPPONENT_TEAMS_KEY: string;
    LEAGUE_STANDINGS_KEY: string;
    LEAGUE_STANDINGS_LIST_KEY: string;
    PRACTICE_MATCH_HISTORY_KEY: string;
    LEAGUE_MATCH_HISTORY_KEY: string;
    SCHEDULED_BROADCASTS_KEY: string;
}

export function getStorageKeys(sportPrefix: string): StorageKeyMap {
    return {
        TEAM_SETS_KEY: sportPrefix + 'team_sets',
        MATCH_HISTORY_KEY: sportPrefix + 'match_history',
        USER_EMBLEMS_KEY: sportPrefix + 'user_emblems',
        ACHIEVEMENTS_KEY: sportPrefix + 'achievements',
        TOURNAMENTS_KEY: sportPrefix + 'tournaments',
        LEAGUES_KEY: sportPrefix + 'leagues',
        COACHING_LOGS_KEY: sportPrefix + 'coaching_logs',
        BACKUP_KEY: sportPrefix + 'backup_autosave',
        OPPONENT_TEAMS_KEY: sportPrefix + 'opponent_teams',
        LEAGUE_STANDINGS_KEY: sportPrefix + 'league_standings',
        LEAGUE_STANDINGS_LIST_KEY: sportPrefix + 'league_standings_list',
        PRACTICE_MATCH_HISTORY_KEY: sportPrefix + 'practice_match_history',
        LEAGUE_MATCH_HISTORY_KEY: sportPrefix + 'league_match_history',
        SCHEDULED_BROADCASTS_KEY: sportPrefix + 'scheduled_matches',
    };
}

export interface KeyValueStore {
    getItem(key: string): Promise<unknown>;
    setItem(key: string, value: unknown): Promise<unknown>;
    removeItem(key: string): Promise<void>;
}

export interface DataServiceKeys {
    TEAMS: string;
    MATCH_HISTORY: string;
}

export function createDataService(sportPrefix: string, store: KeyValueStore) {
    const STORAGE_KEYS: DataServiceKeys = {
        TEAMS: sportPrefix + 'teams_v3',
        MATCH_HISTORY: sportPrefix + 'match_history_v3',
    };

    const saveData = async (key: string, data: unknown): Promise<void> => {
        try {
            await store.setItem(key, data);
        } catch (error) {
            console.error('Error saving data:', error);
            throw error;
        }
    };

    const loadData = async (key: string): Promise<unknown> => {
        try {
            const data = await store.getItem(key);
            return data;
        } catch (error) {
            console.error('Error loading data:', error);
            return null;
        }
    };

    const removeData = async (key: string): Promise<void> => {
        try {
            await store.removeItem(key);
        } catch (error) {
            console.error('Error removing data:', error);
            throw error;
        }
    };

    return { STORAGE_KEYS, saveData, loadData, removeData };
}
