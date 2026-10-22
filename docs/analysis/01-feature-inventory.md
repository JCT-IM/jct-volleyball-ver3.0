# 01. 기능 목록 (J-IVE 배구)

조사 기준: 이 레포의 React 18 + TypeScript + Vite 단일 앱. 진입은 `index.html` → `index.tsx` → `App.tsx`.
화면 전환의 대부분은 URL 경로가 아니라 `App.tsx`의 `ModeLayout` 안 `view` 상태(`useState`)다. URL은 아래 4개만 확인했다.

| URL | 컴포넌트 | 근거 |
|-----|----------|------|
| `/` | `Gate` | `App.tsx` `Route path="/"` |
| `/join` | `StudentJoinRoute` → `StudentJoinScreen` | `App.tsx` |
| `/class/*` | `ProtectedRoute` + `DataProvider appMode="CLASS"` + `ModeLayout` | `App.tsx` |
| `/club/*` | 동일, `appMode="CLUB"` | `App.tsx` |

`view` 값과 렌더 컴포넌트는 `App.tsx` `renderView()` switch. CLASS/CLUB 메뉴 노출은 `screens/MenuScreen.tsx`의 `isClub = appMode === 'CLUB'`.

분류 기준:

- **A. 종목 무관**: 명단·저장·동기화·테마처럼 종목 규칙을 넣지 않아도 형태가 유지되는 것. 배구 단어가 섞여 있어도 껍데기가 공용인 경우 이유에 적는다.
- **B. 종목 특화**: 배구 득점, 로테이션, 리베로, 세트, 포지션, 기록 항목에 묶인 것.
- **C. 애매함**: 껍데기는 공용, 데이터나 카피가 배구인 것.

---

## 1. 화면별 기능

### 1.1 공개 진입 (모드 공통)

| 화면 | 하는 일 | 분류 | 근거 |
|------|---------|------|------|
| 게이트 `/` | 쿼리 `code` 또는 `liveCode`가 있으면 학생 참여, 없으면 관리자 잠금 | A | `App.tsx` `Gate` |
| 관리자 잠금 | PIN으로 CLASS/CLUB 선택, 세션 유지, 학생용 진입, 잠금 화면에서 백업 로드 | A (PIN·세션). 모드 이름은 이 제품의 수업/클럽 구분 | `screens/AdminLockScreen.tsx`, `components/LockScreen.tsx` `UNLOCKED_MODE_KEY` |
| 학생 참여 | 4자리 코드 입력, 방송 URL이면 호스트가 뜰 때까지 재시도 | A (조인). 연결 후 보여주는 화면은 B | `screens/StudentJoinScreen.tsx` `joinSession`, `nextPollDelayMs` |
| 연결 후 CLASS | `AnnouncerScreen` | B | `StudentJoinScreen` `appMode === 'CLUB' \|\| liveView === 'broadcast'`가 아니면 Announcer |
| 연결 후 CLUB 또는 `liveView=broadcast` | `LiveBroadcastScreen`. 종료 후에도 `gameOver`면 결과 유지 | B | `StudentJoinScreen` `keepShowingEndedBroadcast` |

### 1.2 CLASS 메뉴에 보이는 기능

`MenuScreen`에서 `!isClub`일 때만 카드가 있는 항목.

| view | 화면 | 기능 | 분류 |
|------|------|------|------|
| (메뉴 버튼) | `MenuScreen` | 「경기 시작」→ `matchSetup`. 「실시간 세션 참여」모달 → `joinSession` 후 `announcer` | 시작 흐름 A, 참여 후 화면 B |
| `teamBuilder` | `PlayerInputScreen` → `TeamBuilderScreen` | 학생 명단 입력(CSV), 주장 드래프트, 성비 쿼터, 비교표. CLUB이면 `renderView`가 `null`이고 메뉴로 되돌림 | C. 드래프트 절차는 공용, 입력 스탯은 배구·체육 (`Stats`) |
| `competition` | `CompetitionScreen` | 토너먼트 / 리그 허브 | C |
| `tournament` | `TournamentScreen` | 대진, 경기 시작, 기록으로 이동 | C. 브래킷은 공용, 시작 시 배구 `MatchState` |
| `leagueLobby` / `league` | `LeagueLobbyScreen`, `LeagueScreen` | 리그 생성·일정·경기 시작 | C |
| `matchSetup` | `MatchSetupScreen` | 저장된 두 팀 선택 | A (팀 키 선택). 이후 경기는 B |
| `attendance` | `AttendanceScreen` | 선발, 서브 순서 드래그, 역할 배정(아나운서·주심·선심·카메라·기록관) | B. 역할 이름 중 일부는 수업 운영(C에 가깝지만 출전 수·서브 순서는 배구) |
| `scoreboard` | `ScoreboardScreen` `entryMode` 기본 `'class'` | 점수, 서브/스파이크/블로킹/디그, 페어플레이, 3단 플레이, 타임아웃, 교체, Undo, PIN/QR, 채팅, 이펙트 | B |
| `history` | `RecordScreen` `appMode` | 지난 경기, 타임라인, MVP, CSV, 인쇄/이미지 | B (집계 항목이 배구 스탯) |
| `playerRecords` | `PlayerRecordsScreen` | 개인 누적 | B |
| `teamAnalysis` | `TeamAnalysisScreen` | 팀 비교 | B |
| `assessmentRanking` | `AssessmentRankingScreen` | 수업 랭킹 | B |
| `achievements` | `AchievementsScreen` | 배지 | B. 조건이 `serviceAces` 등 (`DataContext` 배지 계산) |
| `roleRecord` | `RoleRecordScreen` | 비출전 역할 이력 | C. 역할 문자열은 수업용, 저장은 `Player.roleHistory` |
| `skillDrill` | `SkillDrillScreen` | 배구 기술 영상 목록 | B. 카탈로그 `data/skillDrills.ts` |
| `teamManagement` | `TeamManagementScreen` | 팀 색·엠블럼·구호·응원가 URL·명단 | A (속성), 응원가 URL은 재생 화면이 배구 아나운서에 붙음 |
| (모달) | `TacticalBoardModal` | 코트 위 자석·펜 | B. 6/9인제 코트 |
| `cheerSong` | `CheerSongScreen` | 효과음·팀 응원가 재생 | C. `<audio>` 재생은 공용, 곡 목록은 팀 세트 |
| `settings` | `SettingsScreen` | 목표 점수, 보너스 점수 포함, 구글 시트 URL, 관리자 비밀번호. 비밀번호 모달 후 진입 | C. 비밀번호·시트 URL은 A, 목표 점수·보너스는 B |
| (메뉴) | import / export / reset | JSON 백업·복원·초기화 | A. `MenuScreen` `handleImportDataClick`, `DataContext` `exportData`/`import`/`reset` |
| `announcer` | `AnnouncerScreen` `appMode` 기본 `'CLASS'` | 큰 점수, 명단, 타임라인, 차트, 응원가 패널 | B |
| `cameraDirector` | `CameraDirectorScreen` | 카메라·하이라이트. 메뉴 카드 없음 | C. 촬영은 공용, 화면 카피는 경기 스코어 |
| `referee` | `RefereeScreen` | 주심용 간이 스코어. 메뉴 카드 없음 | B |

메뉴에 최근 경기 요약: `MenuScreen` `latestMatchInfo`.

### 1.3 CLUB에서만 보이거나 동작이 다른 기능

| view / UI | 기능 | 분류 | 근거 |
|-----------|------|------|------|
| 메뉴 CTA | 「연습 경기 시작」→ `PracticeOptionsModal` (무제한 세트, 코트 체인지, 3세트 15점) | B | `components/PracticeOptionsModal.tsx`, `App.tsx` `onStartMatch` 클럽 분기 |
| `scheduledBroadcast` | 예약 생성, QR/URL(`liveView=broadcast`), 코트 좌우 선택 후 전광판 | C. 예약·QR은 A, 코트 스왑은 배구 중계 | `screens/ScheduledBroadcastScreen.tsx` `buildScheduledBroadcastUrl` |
| 메뉴 카드 | 전력 분석 메모 | C. 메모 CRUD는 A, 대상이 상대 팀·선수 | `MenuScreen` → `AnalysisMemoModal` |
| `heatmapAnalysis` | 풀코트 득점/실점 위치 | B | `screens/HeatmapAnalysisScreen.tsx`, `components/HeatmapViewer.tsx` |
| 메뉴 하단 | `LeagueStandingsDashboard` 조별 순위, 실시간 점수 입력 | C. 승점표 형태는 공용, 세트 스코어는 배구 | `components/LeagueStandingsDashboard.tsx` |
| `scoreboard` | `entryMode='club'`. 리베로 퀵 교체, 서브 순서, 다이렉트, 수비 범실 메모, 히트맵 위치, 세트 스코어, 코트 체인지. 페어플레이 UI는 `entryMode !== 'club'` | B | `screens/ScoreboardScreen.tsx` `TeamColumn`, `LiberoQuickSwapModal` |
| `settings` | 대회 목표 21/25, 세트 수 3/5, 6인제/9인제. 수업용 목표 점수 블록은 `isClassMode`일 때만 | B | `screens/SettingsScreen.tsx` |
| `history` | 연습 기록 `practiceMatchHistory` / 대회 기록 `leagueMatchHistory` 분리, 세트 탭 | B | `RecordScreen`, `DataContext` `getStorageKeys` |
| `attendance` | 선발 인원 = `volleyballRuleSystem`(6 또는 9), 리베로 체크, 최근 라인업 | B | `AttendanceScreen` `requiredCount`, `CLUB_RECENT_LINEUP_HISTORY_KEY` |
| 학생 시청 | `LiveBroadcastScreen` (유튜브 iframe, 점수 바, 최근 득점, 채팅, 종료 결과) | B | `screens/LiveBroadcastScreen.tsx` |
| 팀 빌더·학급 대회·랭킹·배지·역할 기록·응원가 메뉴 | 카드 숨김. `teamBuilder` view는 CLUB에서 menu로 강제 | — | `MenuScreen` `!isClub`, `App.tsx` `if (appMode === 'CLUB' && view === 'teamBuilder')` |

CLUB에서도 공통으로 남는 메뉴: 팀 관리, 전술판, 기술 드릴, 경기 기록, 팀 분석, 개인 기록, 설정, 가져오기/내보내기, 초기화.

### 1.4 스코어보드에서 기록하는 동작 (종목 특화의 핵심)

호스트 조작은 `ScoreboardScreen`이 `dispatch`하는 `Action`. 실제 점수·문장 생성은 `DataContext`의 `matchReducer`.

| Action 타입 | 기록 내용 | 모드 |
|-------------|-----------|------|
| `SCORE` | ± 점수. CLUB이고 양수면 타입 `MANUAL_SCORE` | 둘 다 |
| `SET_SERVING_TEAM` | 서브 시작 | 둘 다 |
| `SERVICE_ACE` | 서브 에이스 + 히트맵(CLUB) | 둘 다, 위치는 CLUB |
| `SERVICE_FAULT` | 서브 범실 | 둘 다 (버튼 배치는 CLUB 그리드에 별도) |
| `SERVE_IN` | 서브 인 | 둘 다 |
| `SPIKE_SUCCESS` | 스파이크, 이어서 어시스트 모달 | 둘 다 |
| `ASSIST_SUCCESS` | 어시스트 | 둘 다 |
| `BLOCKING_POINT` | 블로킹 | 둘 다 |
| `DIG_SUCCESS` | 디그 | 둘 다 |
| `DIRECT_SUCCESS` | 다이렉트 득점 | CLUB 버튼 |
| `DEFENSE_FAULT` | 수비 범실 + 메모 | CLUB 버튼·칩 |
| `TIMEOUT` | 작전 타임 | 둘 다 |
| `ADJUST_FAIR_PLAY`, `INCREMENT_3_HIT` | 페어플레이, 3단 | CLASS이고 `includeBonusPointsInWinner` |
| `SUBSTITUTE_PLAYER` | 교체. 리베로 퀵 스왑도 이 액션 | 둘 다 / 퀵 스왑은 CLUB 6인제 |
| `UNDO` | 스택 복원 후 `full_state_sync` | 둘 다 |
| `START_NEXT_SET`, `SET_COURT_SWAPPED` | 다음 세트, 좌우 스왑 | 세트·코트는 CLUB 옵션과 결부 |

타입 정의: `types.ts` `Action`, `ScoreEventType`.

### 1.5 실시간 동기화 (껍데기 A, 페이로드 B)

| 동작 | 분류 | 근거 |
|------|------|------|
| 호스트 PIN `jive-` + 4자, PeerJS 연결 | A | `DataContext` `startHostSession`, `P2P_PIN_PREFIX` |
| 시청자 `joinSession` | A | `DataContext` `joinSession` |
| 접속 시 `full_state_sync`로 `MatchState` 전달 | B (상태 모양이 배구) | `startHostSession` connection `open` |
| 상태 변경마다 `full_state_sync`, UNDO가 아니면 `action`도 전송 | B | `localDispatch`, `useEffect` on `matchState` |
| 채팅, 리액션, 시청자 수, 자막, 유튜브 ID, 이펙트 `SPIKE`/`BLOCK` | 채팅·리액션·영상 ID는 A, 이펙트 종류는 B | `P2PMessage` (`types.ts`) |

---

## 2. 분류 요약

### A. 종목 무관으로 빼기 쉬운 것

- 라우트 가드와 PIN 세션: `ProtectedRoute`, `LockScreen`, `AdminLockScreen`, `sessionStorage` `unlockedMode`.
- 언어: `hooks/useTranslation.ts`, `data/translations.ts`, `LanguageToggle`, 키 `jct_volleyball_language`.
- 토스트·확인·비밀번호 모달: `components/common/Toast.tsx`, `ConfirmationModal.tsx`, `PasswordModal.tsx`.
- 헤더 껍데기: `components/common/Header.tsx` (브랜드 색만 CLASS/CLUB).
- JSON 백업/복원/초기화: `DataContext` export/import/reset, `utils/loadBackupOnLockScreen.ts`.
- PeerJS 연결·브로드캐스트 루프 자체: `broadcast`, `startHostSession`, `joinSession`, `closeSession`. 메시지 타입 중 `chat_*`, `viewer_*`, `REACTION`은 종목 문장이 없다.
- 팀 꾸미기 필드: `SavedTeamInfo`의 `teamName`, `color`, `emblem`, `slogan`, `cheerUrl`. 저장 키만 배구 접두사.
- QR: `qrcode.react` 사용처 `ScheduledBroadcastScreen`, `ScoreboardScreen`.
- 욕설 필터: `utils/filterProfanity.ts`.
- 자동 저장 토스트: `components/AutoSaveToast.tsx`.

### B. 배구 특화

- `MatchState` / `TeamMatchState` / `PlayerStats` / `ScoreEventType` (`types.ts`).
- `matchReducer` (`DataContext.tsx`).
- `ScoreboardScreen`, `RefereeScreen`, `AnnouncerScreen`의 `LiveGameDisplay`, `GameLog`의 이벤트 아이콘 스위치.
- 리베로, `currentServerIndex`, 6/9인제 (`AppSettings.volleyballRuleSystem`, `AttendanceScreen`, `LiberoQuickSwapModal`).
- 세트·듀스·코트 체인지·15점 결승 (`PracticeOptionsModal`, `SettingsScreen` 대회 룰, `matchReducer` 세트 종료 분기).
- 히트맵 (`HeatmapRecordModal`, `HeatmapViewer`, `HeatmapAnalysisScreen`).
- 배구 배지 수치 (`DataContext` `checkAndAddBadge`, `data/badges.ts`).
- 기술 드릴 카탈로그 (`data/skillDrills.ts`).
- 이벤트 한글 문장과 그 파서 (`utils/clubSetStats.ts`, `LiveBroadcastScreen.formatTickerFromEventDescription`). 4장.

### C. 애매함

| 항목 | 이유 |
|------|------|
| 팀 빌더 | 드래프트·성비는 종목 밖에서도 같다. `Player.stats`는 키·셔틀런·50m·언더핸드·서브 (`types.ts` `Stats`). 메뉴 문구는 「AI 분석」(`translations.ts` `menu_team_builder_desc`)이나 구현은 로컬 규칙 (`TeamBuilderScreen`). |
| 토너먼트/리그/순위표 | 대진·승점 3점은 공용 구조. 경기 본판은 `MatchState`이고 순위 입력은 세트 배열 `LeagueStandingsMatch.setScores`. |
| P2P `full_state_sync` | 전송 코드는 공용. payload가 `MatchState`라 종목을 바꾸면 프로토콜이 바뀐다. |
| 구글 시트 | `utils/googleSheetsService.ts`가 헤더에 `언더핸드`, `서브`, `셔틀런` 등을 `includes`로 찾는다. 로더는 공용, 컬럼 의미는 체육 배구. |
| 응원가 | URL 재생은 공용. 버튼이 아나운서·`CheerSongScreen`에 고정. |
| 전술판 | 캔버스 저장 키 `jive_saved_tactics_list`는 공용 이름. UI는 배구 코트·6/9 (`TacticalBoardModal`). |
| 분석 메모 | `AnalysisMemoModal` + 키 `jive_tactical_memos`. 메모 저장은 공용, 호출은 클럽 명단·스코어보드. |
| 방송 예약 | 코드·QR·명단 텍스트는 공용. 시작 시 배구 전광판과 `isSwapped`. |
| 카메라 디렉터 | `getUserMedia`는 공용. 메뉴 미노출. 화면이 배구 스코어를 읽는지 전부는 이 문서에서 줄 단위로 재인용하지 않음. 파일: `screens/CameraDirectorScreen.tsx`. |
| 수행평가 랭킹·역할 기록 | 수업 운영. 집계 입력이 배구 스탯·`MatchRoles`. |
| `Player.stats` vs `PlayerStats` | 전자는 수업 체력/기술, 후자는 경기 기록. 둘 다 타입 이름이 배구 앱에 있음. |

---

## 3. 데이터 모델

### 3.1 주요 타입 (`types.ts`)

| 타입 | 역할 | 공통으로 볼 필드 | 배구 필드 |
|------|------|------------------|-----------|
| `Player` | 학생 | `id`, `originalName`, `anonymousName`, `class`, `studentNumber`, `gender`, `isCaptain`, `memo` | `stats: Stats`, `isLibero`, `roleHistory` |
| `Stats` | 수업 측정 | 키·셔틀런·유연성·50m는 체육 공통에 가깝다 | `underhand`, `serve` |
| `SavedTeamInfo` | 저장 팀 | `teamName`, `captainId`, `playerIds`, `color`, `emblem`, `slogan`, `memo`, `cheerUrl`, `cheerUrl2` | 없음 (응원가는 수업 기능) |
| `TeamSet` | 학급/모둠 | `id`, `className`, `teams`, `players`, `teamCount` | 없음 |
| `TeamMatchState` | 경기 중 한 팀 | `name`, `score`, `players`, `timeouts`, `color` | `setsWon`, `fairPlay`, `threeHitPlays`, `serviceAces`, `serviceFaults`, `blockingPoints`, `spikeSuccesses`, `directSuccesses`, `onCourtPlayerIds`, `benchPlayerIds`, `currentServerIndex` |
| `PlayerStats` | 경기 스탯 | `points` 정도만 범용 | 나머지 전부 서브/스파이크/블로킹/디그/어시스트/다이렉트/수비 범실 |
| `MatchState` | 경기 전체 | `status`, `gameOver`, `winner`, `timeout`, `eventHistory` 껍데기, `isSwapped` | `servingTeam`, `currentSet`, `maxSets`, `isDeuce`, `setScores`, `courtChangeEnabled`, `setsUnlimited`, `tournamentTargetScore` |
| `ScoreEvent` | 로그 한 줄 | `score`, `time`, `descriptionKey`(문장), `type` | `type` 유니온이 배구, `hitLocation`, `substitution` |
| `AppSettings` | 설정 | `googleSheetUrl` | `winningScore`, `includeBonusPointsInWinner`, `tournamentTargetScore`, `tournamentMaxSets`, `volleyballRuleSystem` |
| `P2PState`, `P2PMessage` | 연결 | 연결 상태, 채팅, 시청자 | `full_state_sync` payload, `effect_broadcast`의 `'SPIKE' \| 'BLOCK'` |
| `Tournament`, `League`, `LeagueMatch` | 대진 | 이름, 팀 키, 승자 키 | `LeagueMatch.matchId`가 배구 경기 기록과 연결 |
| `ScheduledBroadcast` | 예약 | 코드, 제목, 명단 | 시작 후 배구 경기로만 이어짐 (`App.tsx` `handleStartScheduledBroadcast`) |
| `Badge`, `PlayerAchievements` | 배지 | id 집합 구조 | 배지 id가 서브/스파이크/블로킹 (`data/badges.ts`) |

`Action` 유니온(`types.ts`)은 전부 배구 기록 동사다. 종목 확장 시 이 유니온을 공유하면 안 된다.

### 3.2 저장

드라이버: `localforage` (`contexts/DataContext.tsx` import). IndexedDB를 쓰는지 드라이버 설정 코드는 `DataContext` 상단에서 확인하지 못했다. localforage 기본값은 IndexedDB다. 이 레포가 `config({ driver })`를 호출하는지는 **미확인** (호출부를 찾지 못함).

모드 접두사 `class_` / `club_` (`getStorageKeys`):

| 키 suffix | 내용 |
|-----------|------|
| `jct_volleyball_team_sets` | `TeamSet[]` |
| `jct_volleyball_match_history` | CLASS 완료 경기 |
| `jct_volleyball_practice_match_history` | CLUB 연습 |
| `jct_volleyball_league_match_history` | CLUB 대회 경기 |
| `jct_volleyball_user_emblems` | 사용자 엠블럼 |
| `jct_volleyball_achievements` | 배지 |
| `jct_volleyball_tournaments` | 토너먼트 |
| `jct_volleyball_leagues` | 리그 |
| `jct_volleyball_coaching_logs` | 코칭 로그 |
| `jct_volleyball_backup_autosave` | 자동 백업 |
| `jct_volleyball_opponent_teams` | 상대 팀 |
| `jct_volleyball_league_standings` | 순위표 단일(레거시로 보임, 로드는 함) |
| `jct_volleyball_league_standings_list` | 순위표 목록 |
| `jct_volleyball_scheduled_matches` | 방송 예약. CLUB 로드 분기 (`loadAllData`의 SCHEDULED 조건) |

모드와 무관한 키:

| 키 | 저장소 | 근거 |
|----|--------|------|
| `jct_volleyball_settings` | localforage | `SETTINGS_KEY` |
| `jct_volleyball_language` | localforage | `LANGUAGE_KEY` |
| `jive_saved_tactics_list`, `jive_tactical_memos` | localforage | `TacticalBoardModal.tsx`, `AnalysisMemoModal.tsx` |
| `unlockedMode` | sessionStorage | `LockScreen.tsx` |
| `jive_admin_password` | localStorage | `utils/adminPassword.ts` |
| `jive_custom_labels`, `jive_label_skill1`, `jive_label_skill2` | localStorage | `utils/labelUtils.ts` |
| `jct_club_recent_lineup_history_v2`, `jct_club_recent_lineup_v1` | localStorage | `AttendanceScreen.tsx` |

키 이름에 `volleyball`이 들어가 있어, 같은 브라우저에 농구 앱을 그냥 올리면 키가 겹치지 않는다. 공용 패키지로 뺄 때는 종목 접두사를 인자로 받아야 한다.

---

## 4. 로그 문장을 파싱하는 코드

통계의 1차 기록은 `matchReducer`가 `PlayerStats` 숫자를 올린다. 그와 별도로 **한글 `descriptionKey`를 다시 읽어** 팀·선수를 찾는 경로가 있다. 문장이 바뀌면 화면 통계만 어긋난다.

### 4.1 문장을 만드는 곳 (단일 출처)

`contexts/DataContext.tsx` `matchReducer` 안 `newEventDescription`.

| type | 문장 형태 |
|------|-----------|
| `SCORE` / `MANUAL_SCORE` | `` `${teamName}, ${n}점 득점` `` 또는 `` `${n}점 조정` `` |
| `ACE` | `` `${playerName}(${teamName})의 환상적인 서브 에이스!` `` |
| `FAULT` | `` `${playerName}(${teamName}), 서브 범실.` `` |
| `BLOCK` | `` `...의 완벽한 블로킹 득점!` `` |
| `SPIKE` | `` `..., 강력한 스파이크 성공!` `` |
| `DIRECT` | `` `..., 다이렉트 공격 득점!` `` |
| `DEFENSE_FAULT` | `` `..., 수비 범실${note}.` `` |
| `SERVE_IN` | `` `..., 안정적인 서브 성공.` `` |
| `DIG` | `` `..., 멋진 디그(수비) 성공!` `` |
| `ASSIST` | `` `..., 완벽한 어시스트!` `` |
| `TIMEOUT` | `` `작전 타임 요청/종료` `` |
| `FAIRPLAY` | `` `페어플레이 점수 획득!` `` |
| `3HIT` | `` `멋진 3단 플레이 성공!` `` |
| 서브 시작 | `` `서브 시작.` `` type `UNKNOWN` |
| `SUB` | `` `선수와 ... 선수를 교체` `` / `일괄 교체` |
| `GAME_END` | `세트 종료`, `경기 종료!`, `세트 획득` |
| 경기 시작 | `"경기가 시작되었습니다."` (`getInitialState` 근처 eventHistory 초기값) |
| 다음 세트 | `'다음 세트 시작.'` |

필드 이름이 `descriptionKey`지만 번역 키가 아니라 **완성된 한국어 문장**이다. `useTranslation`을 타지 않는다.

### 4.2 문장을 다시 읽는 곳

| 위치 | 함수 | 읽는 방식 | 위험 |
|------|------|-----------|------|
| `utils/clubSetStats.ts` | `findPlayerInMatch` | `description.includes(player.originalName)`. 가장 긴 이름 우선 | 동명이인·이름 포함 관계(김민 / 김민수)면 잘못된 선수. 세트별 스탯 재계산 `derivePlayerStatsFromEvents`가 이 함수에 의존 |
| 같은 파일 | `resolveTeamFromDescription` | 정규식 `\(([^)]+)\)` 후 팀 이름 비교 | 문장에 괄호 팀이 없으면 null. `buildSetScoreTrendFromEvents`가 `event.team`이 없을 때 사용 |
| 같은 파일 | `resolveScoringTeamFromManualScore` | `'득점'` 포함 + `split(',')[0]`이 팀 이름 | `점 조정`은 무시. 팀 이름에 쉼표가 있으면 깨짐 |
| `screens/LiveBroadcastScreen.tsx` | `formatTickerFromEventDescription` | 고정 문구 replace: `의 환상적인 서브 에이스!` 등 4개 | 문장 카피만 바꿔도 토스트가 원문 그대로 남음. 통계 숫자는 아님 |
| `screens/StudentJoinScreen.tsx` | `getBroadcastMetaFromUrl` 소비부 | `desc.split(/\s+VS\s+/i)` | 예약 설명 `buildMatchupDescription` (`utils/scheduledBroadcastRoster.ts`)이 ` VS `를 넣음. 통계 아님. 대기 화면 레이아웃만 |
| `screens/HeatmapAnalysisScreen.tsx` | `toHitRecord`, `isSpikeOrAceType` | `type` 문자열에 `SPIKE`, `SERVICE`, `ACE`, `SUCCESS` 포함 | `descriptionKey`는 안 읽음. 그러나 `ScoreEventType`은 `ACE`/`SPIKE`인데 함수는 `SERVE_ACE`, `SPIKE_SUCCESS`도 허용. 기록이 어느 쪽 문자열로 남았는지 데이터마다 달라지면 점이 빠짐 |
| `screens/TeamAnalysisScreen.tsx` | 동일 패턴 (약 277–324행) | 히트맵과 같은 타입 문자열 검사 | 위와 동일 |
| `screens/RecordScreen.tsx` | 타임라인 매핑 | `description: e.descriptionKey`를 표시만 | 파싱은 아님. 세트 스탯은 `clubSetStats`에 위임 |
| `components/GameLog.tsx` | 렌더 | `event.descriptionKey`를 제목으로 출력, 아이콘은 `event.type` | 표시 전용 |

배지(`DataContext` 약 1298–1496행)는 문장이 아니라 `PlayerStats` 숫자(`serviceAces >= 3` 등)를 본다. 문장 파싱 위험 목록에서는 제외한다.

`googleSheetsService.ts`의 `header.includes('서브')`는 경기 로그가 아니라 명단 CSV다. 종목을 바꾸면 컬럼 사전을 갈아야 한다.

---

## 5. 외부 의존성

루트 `package.json`이 앱이다. `components/package.json`은 React 18.2와 eslint만 있는 별도 package.json이다. 루트 `index.html`은 `/index.tsx`를 로드한다. `components/package.json`을 워크스페이스로 쓰는 설정은 루트 `package.json`에 없다. **앱 빌드에 포함되는지는 미확인** (중첩 패키지로 보임).

### dependencies

| 패키지 | 용도 | 근거 |
|--------|------|------|
| `react`, `react-dom` 18.3 | UI | `package.json`, `index.tsx` |
| `react-router-dom` 7 | `/`, `/join`, `/class/*`, `/club/*` | `App.tsx` |
| `localforage` | 팀·경기·설정 영속 | `DataContext.tsx` |
| `peerjs` | 호스트/시청자 데이터 채널 | `DataContext.tsx` `import Peer from 'peerjs'` |
| `qrcode.react` | 참여 QR | `ScoreboardScreen.tsx`, `ScheduledBroadcastScreen.tsx` |
| `recharts` | 점수 추이, 팀 비교 차트 | `AnnouncerScreen` `LineChart`, `RecordScreen`, `TeamAnalysisScreen` 등 |
| `canvas-confetti` | 득점 연출 | `ScoreboardScreen.tsx` `confetti(` |

### devDependencies

| 패키지 | 용도 |
|--------|------|
| `vite` 5, `@vitejs/plugin-react` | 번들. `vite.config.ts` |
| `typescript` 5 | `tsc` 후 `vite build` (`package.json` `scripts.build`) |
| `gh-pages` | `predeploy`/`deploy`. `homepage`는 `https://dlawocjf0837-debug.github.io/JCT-Volleyball/` |

### package.json에 없고 런타임에 쓰는 것

| 출처 | 용도 | 근거 |
|------|------|------|
| `https://cdn.tailwindcss.com` | 스타일. `tailwind.config` 파일 없음 | `index.html` |
| `https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js` | 전역 스크립트. 앱 코드는 npm `peerjs`도 import | `index.html`. 둘 중 어느 쪽이 실제 연결에 쓰이는지 **미확인** (번들 import와 스크립트 중복) |
| importmap의 esm.sh React/Recharts 등 | `index.html` importmap | Vite 빌드와 이중 구조. 프로덕션 번들이 importmap을 무시하는지는 **미확인** |
| Google STUN, `turn:openrelay.metered.ca` | ICE | `DataContext` `startHostSession` / `joinSession` `iceServers` |
| jsDelivr GitHub 음성 | 응원 효과음 | `AnnouncerScreen` `staticSounds` |
| YouTube iframe | 라이브 영상 | `LiveBroadcastScreen`, `utils/extractYoutubeVideoId.ts` |
| Google Sheets fetch | 명단 | `utils/googleSheetsService.ts` |

UI 키트(MUI, Tailwind 빌드 파이프라인, CSS Modules)는 없다. 스타일은 Tailwind 클래스 문자열과 `index.html` `<style>`이다.
