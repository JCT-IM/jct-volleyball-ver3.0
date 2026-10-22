import { test as base, expect, type Locator, type Page } from '@playwright/test';

export { expect };
export type { Page, Locator };

/** 수업 모드가 실제로 읽는 옛 키 접두사. */
export const CLASS_PREFIX = 'class_jct_volleyball_';
/** 스포츠클럽 모드가 실제로 읽는 옛 키 접두사. */
export const CLUB_PREFIX = 'club_jct_volleyball_';
export const SETTINGS_KEY = 'jct_volleyball_settings';
/** dataService가 쓰던 키. 화면은 이 키를 읽지 않는다. */
export const JIVE_TEAMS_KEY = 'jive_teams_v3';
export const JIVE_HISTORY_KEY = 'jive_match_history_v3';

const PHONE = { width: 390, height: 844 };
const TABLET = { width: 820, height: 1180 };

export const VIEWPORTS = { phone: PHONE, tablet: TABLET };

function isSignalingUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.includes('peerjs.com') || host.includes('metered.ca') || host.startsWith('stun');
  } catch {
    return false;
  }
}

/** PeerJS 브로커만 막고, unpkg의 peerjs 스크립트는 그대로 둔다. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/*', (route) => {
      if (isSignalingUrl(route.request().url())) return route.abort();
      return route.continue();
    });
    await use(page);
  },
});

export interface BackupFile {
  settings: Record<string, unknown>;
  classTeamSets: unknown[];
  classMatchHistory: unknown[];
  clubTeamSets: unknown[];
  clubMatchHistory: unknown[];
  clubPracticeMatchHistory: unknown[];
  leakedTeamSet: unknown;
  jiveTeams: unknown[];
  jiveMatchHistory: unknown[];
}

/** fixtures JSON을 localforage 키로 펼친다. 화면이 읽는 키와 jive_* 키를 함께 넣는다. */
export function toStorageEntries(data: BackupFile, options?: { includeLeaked?: boolean }): Record<string, unknown> {
  const classSets = options?.includeLeaked
    ? [...data.classTeamSets, data.leakedTeamSet]
    : data.classTeamSets;
  return {
    [`${CLASS_PREFIX}team_sets`]: classSets,
    [`${CLASS_PREFIX}match_history`]: data.classMatchHistory,
    [`${CLASS_PREFIX}user_emblems`]: [],
    [`${CLASS_PREFIX}practice_match_history`]: [],
    [`${CLUB_PREFIX}team_sets`]: data.clubTeamSets,
    [`${CLUB_PREFIX}match_history`]: data.clubMatchHistory,
    [`${CLUB_PREFIX}practice_match_history`]: data.clubPracticeMatchHistory,
    [`${CLUB_PREFIX}user_emblems`]: [],
    [SETTINGS_KEY]: data.settings,
    [JIVE_TEAMS_KEY]: data.jiveTeams,
    [JIVE_HISTORY_KEY]: data.jiveMatchHistory,
  };
}

async function openSeedDocument(page: Page) {
  const handler = async (route: import('@playwright/test').Route) => {
    if (route.request().resourceType() === 'document') {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><html><body>seed</body></html>',
      });
      return;
    }
    await route.abort();
  };
  await page.route('**/*', handler);
  try {
    await page.goto('/');
  } finally {
    await page.unroute('**/*', handler);
  }
}

/** 앱 스크립트보다 먼저 IndexedDB(localforage)에 값을 넣는다. */
export async function seedLocalForage(page: Page, entries: Record<string, unknown>) {
  await openSeedDocument(page);
  await page.evaluate(async (data) => {
    await new Promise<void>((resolve, reject) => {
      const del = indexedDB.deleteDatabase('localforage');
      del.onsuccess = () => resolve();
      del.onerror = () => reject(del.error);
      del.onblocked = () => resolve();
    });
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('localforage', 1);
      open.onupgradeneeded = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains('keyvaluepairs')) db.createObjectStore('keyvaluepairs');
        if (!db.objectStoreNames.contains('local-forage-detect-blob-support')) {
          db.createObjectStore('local-forage-detect-blob-support');
        }
      };
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('keyvaluepairs', 'readwrite');
        const store = tx.objectStore('keyvaluepairs');
        for (const [key, value] of Object.entries(data)) store.put(value, key);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      open.onerror = () => reject(open.error);
    });
    sessionStorage.clear();
    localStorage.clear();
  }, entries);
}

export async function unlock(page: Page, pin = '0819') {
  const input = page.getByLabel('잠금 해제 비밀번호');
  await input.waitFor({ timeout: 30_000 });
  await input.fill(pin);
  await page.getByRole('button', { name: '해제' }).click();
  await expect(input).toBeHidden();
}

export async function waitForMenu(page: Page) {
  await expect(page.getByRole('button', { name: /경기 시작/ }).first()).toBeVisible({ timeout: 30_000 });
}

/** 저장소를 비운 뒤 주입하고, 지정 경로에서 PIN을 해제한다. */
export async function bootWithData(page: Page, entries: Record<string, unknown>, path: string) {
  await seedLocalForage(page, entries);
  await page.goto(path);
  await unlock(page);
  await waitForMenu(page);
}

export async function readStored(page: Page, key: string): Promise<unknown> {
  return page.evaluate(async (storageKey) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('localforage');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction('keyvaluepairs', 'readonly');
      const req = tx.objectStore('keyvaluepairs').get(storageKey);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return value;
  }, key);
}

export async function readClassCounts(page: Page): Promise<{ teamSets: number; teams: number; matches: number }> {
  const teamSets = await readStored(page, `${CLASS_PREFIX}team_sets`);
  const matches = await readStored(page, `${CLASS_PREFIX}match_history`);
  const sets = Array.isArray(teamSets) ? teamSets : [];
  return {
    teamSets: sets.length,
    teams: sets.reduce((sum, set) => sum + (Array.isArray((set as { teams?: unknown[] }).teams) ? (set as { teams: unknown[] }).teams.length : 0), 0),
    matches: Array.isArray(matches) ? matches.length : 0,
  };
}

/** 시계, QR, PIN, 연결 토스트처럼 실행마다 달라지는 영역. */
export function unstableMasks(page: Page): Locator[] {
  return [
    page.getByRole('button', { name: /^\d{2}:\d{2}$/ }),
    page.locator('span.font-mono'),
    page.locator('.bg-white'),
    page.getByText(/연결 오류|실시간 세션이 시작|참여 코드/),
  ];
}

export async function settlePeerToast(page: Page) {
  const toast = page.getByText(/연결 오류|실시간 세션이 시작|참여 코드/);
  try {
    await toast.first().waitFor({ state: 'visible', timeout: 4_000 });
    await toast.first().waitFor({ state: 'hidden', timeout: 8_000 });
  } catch {
    // 토스트가 없으면 바로 찍는다.
  }
}

export async function expectScreen(page: Page, name: string) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll<HTMLElement>('*').forEach((el) => {
      if (el.scrollTop) el.scrollTop = 0;
    });
  });
  await page.evaluate(() => document.fonts?.ready);
  await expect(page).toHaveScreenshot(name, {
    animations: 'disabled',
    caret: 'hide',
    mask: unstableMasks(page),
  });
}
