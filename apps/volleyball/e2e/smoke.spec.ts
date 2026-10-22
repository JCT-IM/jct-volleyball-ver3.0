import { test, expect, readClassCounts, readStored, JIVE_TEAMS_KEY } from '../../../packages/e2e-kit/src/index.ts';
import { openClass, openClub, goToAttendance, pickClubLineup, startPreparedMatch, playClassSequence, playClubSequence } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
});

test('옛 키로 저장한 팀과 경기 기록이 그대로 보인다', async ({ page }) => {
  await openClass(page);
  await expect(page.getByText('청팀').first()).toBeVisible();
  await expect(page.getByText('백팀').first()).toBeVisible();
  await expect(page.getByText(/11\s*:\s*7/)).toBeVisible();

  await page.goto('/club');
  await expect(page.getByRole('button', { name: '🏐 연습 경기 시작' })).toBeVisible();
  await page.getByRole('button', { name: '팀 관리' }).click();
  await expect(page.getByText('연습A').first()).toBeVisible();
  await expect(page.getByText('연습B').first()).toBeVisible();
  await page.goto('/club/history');
  await expect(page.getByRole('button', { name: '🏐 연습경기' })).toBeVisible();
  await expect(page.getByText(/15\s*:\s*10/)).toBeVisible();

  const jiveTeams = await readStored(page, JIVE_TEAMS_KEY);
  expect(Array.isArray(jiveTeams)).toBe(true);
  expect((jiveTeams as { name?: string }[])[0]?.name).toBe('학생41');
});

test('수업 경기: 출전, 득점, 스파이크, 어시스트, 되돌리기, 종료 후 기록과 MVP', async ({ page }) => {
  await openClass(page);
  await goToAttendance(page, 'class');
  await startPreparedMatch(page);
  await playClassSequence(page);
  await page.getByRole('button', { name: '경기 기록' }).click();
  await expect(page.getByText(/3\s*:\s*0/)).toBeVisible();
  await page.getByText(/3\s*:\s*0/).click();
  await expect(page.getByText('MATCH MVP')).toBeVisible();
  await expect(page.getByText('학생1').first()).toBeVisible();
});

test('클럽 연습 경기: 범실과 다이렉트를 기록하고 연습 기록에 저장된다', async ({ page }) => {
  await openClub(page);
  await goToAttendance(page, 'club');
  await pickClubLineup(page);
  await startPreparedMatch(page);
  await playClubSequence(page);
  await page.getByRole('button', { name: '경기 기록' }).click();
  await expect(page.getByRole('button', { name: '🏐 연습경기' })).toBeVisible();
  await expect(page.getByText('연습A').first()).toBeVisible();
  await expect(page.getByText(/21\s*:\s*1|21\s*:\s*0/)).toBeVisible();
});

test('백업을 내보낸 뒤 초기화하고 가져오면 팀 수와 경기 수가 같다', async ({ page }) => {
  await openClass(page);
  const before = await readClassCounts(page);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '데이터 내보내기' }).click();
  const download = await downloadPromise;
  const filePath = await download.path();
  expect(filePath).toBeTruthy();

  await page.getByRole('button', { name: '데이터 초기화' }).click();
  await page.locator('#password-confirm').fill('0819');
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page.getByText('정말로 모든 데이터를 삭제하시겠습니까?')).toBeVisible();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page.getByText('모든 데이터가 초기화되었습니다.')).toBeVisible();

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '데이터 불러오기' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(filePath!);
  await page.getByRole('button', { name: '덮어쓰기' }).click();
  await expect(page.getByText('데이터를 성공적으로 가져왔습니다.')).toBeVisible();

  const after = await readClassCounts(page);
  expect(after.teams).toBe(before.teams);
  expect(after.matches).toBe(before.matches);
  await expect(page.getByText('청팀').first()).toBeVisible();
});

test('수업과 클럽을 오가도 모드 데이터가 섞이지 않는다', async ({ page }) => {
  await openClass(page);
  await page.goto('/class/team-management');
  await expect(page.getByText('청팀').first()).toBeVisible();
  await expect(page.getByText('연습A')).toHaveCount(0);
  await page.goto('/class/history');
  await expect(page.getByText(/11\s*:\s*7/)).toBeVisible();
  await expect(page.getByText(/15\s*:\s*10/)).toHaveCount(0);

  await page.goto('/club/team-management');
  await expect(page.getByText('연습A').first()).toBeVisible();
  await expect(page.getByText('청팀')).toHaveCount(0);
  await page.goto('/club/history');
  await expect(page.getByText(/15\s*:\s*10/)).toBeVisible();
  await expect(page.getByText(/11\s*:\s*7/)).toHaveCount(0);
});

test('팀 상세 모달에서 경기별 추이 차트가 보인다', async ({ page }) => {
  await openClass(page);
  await page.goto('/class/team-analysis');
  await page.getByTitle('청팀 상세 보기').click();
  await expect(page.getByRole('heading', { name: '청팀', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '경기별 추이' })).toBeVisible();
  await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
});

test('소급 노력상 모달이 열린다', async ({ page }) => {
  await openClass(page);
  await page.goto('/class/history');
  await page.getByRole('button', { name: '허슬 지정' }).click();
  const password = page.getByRole('dialog', { name: '비밀번호 확인' });
  await password.getByPlaceholder('비밀번호 입력').fill('0819');
  await password.getByRole('button', { name: '확인', exact: true }).click();
  await expect(page.getByRole('heading', { name: '허슬 플레이어 지정/수정' })).toBeVisible();
  await expect(page.getByText('학생1').first()).toBeVisible();
});

test('팀 관리 반 이름에 내부 키가 보이지 않는다', async ({ page }) => {
  await openClass(page, { includeLeaked: true });
  await page.goto('/class/team-management');
  await expect(page.getByText('키확인팀').first()).toBeVisible();
  await expect(page.getByText('1반').first()).toBeVisible();
  await expect(page.getByText(/player_records_class_suffix/)).toHaveCount(0);
});

test('호스트 PIN으로 학생 참여 후 점수가 반영된다', async () => {
  // PeerJS 시그널링(0.peerjs.com)은 외부 네트워크라 CI에서 연결이 보장되지 않고,
  // 로컬 브로커 상태에 따라서도 참여 코드 연결이 불안정하다.
  test.skip(true, 'PeerJS 시그널링이 외부 네트워크라 CI에서는 건너뛰고, 로컬 연결도 불안정하다.');
});
