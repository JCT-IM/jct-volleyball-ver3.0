import assert from 'node:assert/strict';
import test from 'node:test';
import { createDataService, getStorageKeys } from './index.ts';
import type { KeyValueStore } from './index.ts';

const CLASS_KEYS = {
    TEAM_SETS_KEY: 'class_jct_volleyball_team_sets',
    MATCH_HISTORY_KEY: 'class_jct_volleyball_match_history',
    USER_EMBLEMS_KEY: 'class_jct_volleyball_user_emblems',
    ACHIEVEMENTS_KEY: 'class_jct_volleyball_achievements',
    TOURNAMENTS_KEY: 'class_jct_volleyball_tournaments',
    LEAGUES_KEY: 'class_jct_volleyball_leagues',
    COACHING_LOGS_KEY: 'class_jct_volleyball_coaching_logs',
    BACKUP_KEY: 'class_jct_volleyball_backup_autosave',
    OPPONENT_TEAMS_KEY: 'class_jct_volleyball_opponent_teams',
    LEAGUE_STANDINGS_KEY: 'class_jct_volleyball_league_standings',
    LEAGUE_STANDINGS_LIST_KEY: 'class_jct_volleyball_league_standings_list',
    PRACTICE_MATCH_HISTORY_KEY: 'class_jct_volleyball_practice_match_history',
    LEAGUE_MATCH_HISTORY_KEY: 'class_jct_volleyball_league_match_history',
    SCHEDULED_BROADCASTS_KEY: 'class_jct_volleyball_scheduled_matches',
};

function memoryStore(): KeyValueStore & { snapshot(): Map<string, unknown> } {
    const data = new Map<string, unknown>();
    return {
        snapshot: () => data,
        async getItem(key) {
            return data.has(key) ? data.get(key) : null;
        },
        async setItem(key, value) {
            data.set(key, value);
            return value;
        },
        async removeItem(key) {
            data.delete(key);
        },
    };
}

test('CLASS sportPrefix keeps the existing localforage key strings', () => {
    assert.deepEqual(getStorageKeys('class_jct_volleyball_'), CLASS_KEYS);
});

test('CLUB sportPrefix keeps the existing localforage key strings', () => {
    const keys = getStorageKeys('club_jct_volleyball_');
    assert.equal(keys.TEAM_SETS_KEY, 'club_jct_volleyball_team_sets');
    assert.equal(keys.MATCH_HISTORY_KEY, 'club_jct_volleyball_match_history');
    assert.equal(keys.PRACTICE_MATCH_HISTORY_KEY, 'club_jct_volleyball_practice_match_history');
    assert.equal(keys.LEAGUE_MATCH_HISTORY_KEY, 'club_jct_volleyball_league_match_history');
    assert.equal(keys.SCHEDULED_BROADCASTS_KEY, 'club_jct_volleyball_scheduled_matches');
    assert.equal(keys.BACKUP_KEY, 'club_jct_volleyball_backup_autosave');
});

test('reads and writes the existing class match-history key', async () => {
    const store = memoryStore();
    const keys = getStorageKeys('class_jct_volleyball_');
    const payload = { matches: [{ id: 'm1' }] };
    await store.setItem(keys.MATCH_HISTORY_KEY, payload);
    assert.deepEqual(store.snapshot().get('class_jct_volleyball_match_history'), payload);
    assert.deepEqual(await store.getItem(keys.MATCH_HISTORY_KEY), payload);
});

test('dataService uses the existing jive v3 key strings', async () => {
    const store = memoryStore();
    const service = createDataService('jive_', store);
    assert.equal(service.STORAGE_KEYS.TEAMS, 'jive_teams_v3');
    assert.equal(service.STORAGE_KEYS.MATCH_HISTORY, 'jive_match_history_v3');

    const teams = [{ name: 'A' }];
    await service.saveData(service.STORAGE_KEYS.TEAMS, teams);
    assert.deepEqual(await service.loadData('jive_teams_v3'), teams);

    const history = [{ score: '11-9' }];
    await service.saveData(service.STORAGE_KEYS.MATCH_HISTORY, history);
    assert.deepEqual(await service.loadData('jive_match_history_v3'), history);

    await service.removeData(service.STORAGE_KEYS.TEAMS);
    assert.equal(await service.loadData(service.STORAGE_KEYS.TEAMS), null);
    assert.deepEqual(await service.loadData(service.STORAGE_KEYS.MATCH_HISTORY), history);
});
