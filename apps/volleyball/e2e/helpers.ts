import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, bootWithData, toStorageEntries, type BackupFile, type Page } from '../../../packages/e2e-kit/src/index.ts';

const backup = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fixtures/backup.json'), 'utf8'),
) as BackupFile;

export function entries(options?: { includeLeaked?: boolean }) {
  return toStorageEntries(backup, options);
}

export async function openClass(page: Page, options?: { includeLeaked?: boolean }) {
  await bootWithData(page, entries(options), '/class');
}

export async function openClub(page: Page) {
  await bootWithData(page, entries(), '/club');
}

async function chooseTeam(page: Page, sideLabel: 'A팀 선택' | 'B팀 선택', className: string, teamName: string) {
  await page.getByText(sideLabel, { exact: true }).click();
  await expect(page.getByRole('heading', { name: '팀 선택' })).toBeVisible();
  await page.getByRole('button', { name: className, exact: true }).click();
  await page.getByRole('button', { name: teamName }).click();
  await expect(page.getByRole('heading', { name: '팀 선택' })).toBeHidden();
}

export async function goToAttendance(page: Page, mode: 'class' | 'club') {
  if (mode === 'club') {
    await page.getByRole('button', { name: '🏐 연습 경기 시작' }).click();
    await page.getByRole('button', { name: '확인', exact: true }).click();
    await chooseTeam(page, 'A팀 선택', '연습조', '연습A');
    await chooseTeam(page, 'B팀 선택', '연습조', '연습B');
  } else {
    await page.getByRole('button', { name: '경기 시작', exact: true }).click();
    await chooseTeam(page, 'A팀 선택', '1반', '청팀');
    await chooseTeam(page, 'B팀 선택', '1반', '백팀');
  }
  await page.getByRole('button', { name: '출전 선수 선택으로 이동' }).click();
  if (mode === 'class') {
    await page.getByRole('button', { name: '아니요, 일반 경기로 시작' }).click();
  }
  await expect(page.getByRole('heading', { name: '출전 선수 선택', exact: true })).toBeVisible();
}

export async function pickClubLineup(page: Page) {
  for (let n = 11; n <= 22; n += 1) {
    await page.getByRole('button', { name: `학생${n}` }).click();
  }
  await expect(page.getByRole('button', { name: '경기 시작', exact: true })).toBeEnabled();
}

export async function startPreparedMatch(page: Page) {
  await page.getByRole('button', { name: '경기 시작', exact: true }).click();
  await expect(page.getByRole('button', { name: '+', exact: true }).first()).toBeVisible();
}

async function pickNamedPlayer(page: Page, name: string) {
  await page.getByRole('button', { name }).click();
}

export async function playClassSequence(page: Page) {
  const plusA = page.getByRole('button', { name: '+', exact: true }).first();
  await plusA.click();
  await page.getByRole('button', { name: '스파이크', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: '스파이크 성공! 공격수 선택' })).toBeVisible();
  await pickNamedPlayer(page, '학생1');
  await expect(page.getByRole('heading', { name: '어시스트/수비 기여자 선택' })).toBeVisible();
  await pickNamedPlayer(page, '학생2');
  await page.getByRole('button', { name: '되돌리기' }).click();
  const save = page.getByRole('button', { name: '최종 경기 결과 저장' });
  for (let i = 0; i < 4 && !(await save.isVisible()); i += 1) await plusA.click();
  await expect(save).toBeVisible();
  await save.click();
  await expect(page.getByRole('button', { name: '경기 시작', exact: true })).toBeVisible();
}

export async function playClubSequence(page: Page) {
  await page.getByRole('button', { name: '다이렉트' }).first().click();
  await expect(page.getByText('다이렉트 득점! 공격수 선택')).toBeVisible();
  await pickNamedPlayer(page, '학생11');

  await page.getByRole('button', { name: '수비 범실' }).nth(1).click();
  await expect(page.getByText('수비 범실! 누가 범실했나요?')).toBeVisible();
  await pickNamedPlayer(page, '학생17');
  await page.getByRole('button', { name: '범실 기록 저장' }).click();

  const plusA = page.getByRole('button', { name: '+', exact: true }).first();
  const save = page.getByRole('button', { name: '결과 저장', exact: true });
  for (let i = 0; i < 25 && !(await save.isVisible()); i += 1) {
    await plusA.click();
  }
  await expect(save).toBeVisible();
  await save.click();
  await expect(page.getByText('최종 경기 기록이 저장되었습니다!')).toBeVisible();
}
