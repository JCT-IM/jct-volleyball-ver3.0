import { test, expectScreen, settlePeerToast } from '../../../packages/e2e-kit/src/index.ts';
import { openClass, openClub, goToAttendance, pickClubLineup, startPreparedMatch } from './helpers.ts';

test('메뉴', async ({ page }) => {
  await openClass(page);
  await expectScreen(page, 'menu.png');
});

test('스코어보드 CLASS', async ({ page }) => {
  await openClass(page);
  await goToAttendance(page, 'class');
  await startPreparedMatch(page);
  await settlePeerToast(page);
  await expectScreen(page, 'scoreboard-class.png');
});

test('스코어보드 CLUB', async ({ page }) => {
  await openClub(page);
  await goToAttendance(page, 'club');
  await pickClubLineup(page);
  await startPreparedMatch(page);
  await settlePeerToast(page);
  await expectScreen(page, 'scoreboard-club.png');
});

test('출전 선수 선택', async ({ page }) => {
  await openClass(page);
  await goToAttendance(page, 'class');
  await expectScreen(page, 'attendance.png');
});

test('경기 기록', async ({ page }) => {
  await openClass(page);
  await page.goto('/class/history');
  await page.getByText(/11\s*:\s*7/).waitFor();
  await expectScreen(page, 'history.png');
});

test('팀 관리', async ({ page }) => {
  await openClass(page);
  await page.goto('/class/team-management');
  await page.getByText('청팀').first().waitFor();
  await expectScreen(page, 'team-management.png');
});

test('아나운서', async ({ page }) => {
  await openClass(page);
  await page.goto('/class/announcer');
  await page.getByText('현재 진행 중인 경기가 없습니다.').waitFor();
  await expectScreen(page, 'announcer.png');
});
