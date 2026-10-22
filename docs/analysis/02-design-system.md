# 02. 디자인 양식 (J-IVE 배구)

이 문서는 다른 종목 앱에 같은 화면 언어를 옮기기 위한 조사다. 토큰 파일은 없다. 값은 `index.html`, Tailwind 클래스, 일부 inline `style`에 흩어져 있다.

확인 사실:

- `tailwind.config.*` 없음 (레포 루트 검색).
- CSS 변수(`--color` 등)는 `index.html`에서 찾지 못했다.
- `index.html`이 `/index.css`를 링크한다. 워크스페이스에서 `index.css` 파일은 열리지 않았다. **파일 존재는 미확인.** 디자인 값의 확인 출처는 `index.html` 인라인 `<style>`과 컴포넌트 `className`이다.
- 컴포넌트 라이브러리 없음. 루트 `package.json`에 MUI/Chakra 없음.

기존 `Design.md`는 같은 코드를 요약한 문서다. 아래 표는 소스 파일을 다시 기준으로 한다.

---

## 1. 색, 글자, 간격, 모서리, 그림자

### 1.1 다크 모드

라이트 테마 전환 스위치는 `Header.tsx`, `SettingsScreen.tsx`, `index.html`에서 찾지 못했다. 기본은 어두운 배경 고정이다.

| 역할 | 값 | 근거 |
|------|-----|------|
| 페이지 배경 | `#1A1A2E` | `index.html` `body` `bg-[#1A1A2E]` |
| 본문 글자 | `text-slate-200` | 같은 `body` |
| 배경 그리드 | 흰색 3% 1px, 30px 간격 | `index.html` `body` background-image |
| CLUB 앱 배경 | `from-slate-950 via-amber-950/12 to-slate-950` | `App.tsx` 모드 레이아웃 className (CLUB 분기) |
| 잠금 | `from-slate-900 to-slate-800` | `AdminLockScreen.tsx`, `LockScreen.tsx` |

패널은 `bg-slate-900/50`, `bg-slate-800`, `bg-slate-800/80`, 테두리 `border-slate-700` / `border-slate-600`이 반복된다. 예: `MenuScreen` 카드, `ScoreboardScreen` `TeamColumn` `bg-slate-900/50`.

### 1.2 브랜드 색

| 이름 | 값 | 쓰는 곳 |
|------|-----|---------|
| electric-blue | `#00A3FF` | `index.html` 주석, 버튼 `bg-[#00A3FF]`, 포커스 `focus:ring-[#00A3FF]`, `.glowing-border` |
| 호버 | `#0082cc` | `ScoreboardScreen` 서브 시작 버튼 `hover:bg-[#0082cc]` |
| 잠금 호버 | `#0090e0` | `App.tsx` / `LockScreen.tsx` `hover:bg-[#0090e0]` |
| CLASS 헤더 | `text-[#00A3FF]` | `components/common/Header.tsx` |
| CLUB 헤더·메뉴 | `text-amber-400`, CTA `bg-amber-600` | `Header.tsx`, `MenuScreen.tsx` 연습 시작 버튼 |
| CLASS 경기 시작 CTA | `bg-green-600` | `MenuScreen.tsx` |

팀 기본색(경기 중 팀 색이 없을 때): A `#38bdf8`, B `#f87171`. `ScoreboardScreen` `TeamColumn` `team.color || ...`.

팀 팔레트 12색: `DataContext.tsx` `TEAM_COLORS_PALETTE` (`#3b82f6` … `#f59e0b`).

### 1.3 상태 색 (이벤트 카드)

`components/GameLog.tsx` `getEventIcon` / `getEventStyles`. `RecordScreen.tsx`와 `MatchDetailAnalysis.tsx`의 `Timeline`이 같은 스위치다.

| type | 아이콘 색 | 카드 |
|------|-----------|------|
| SCORE | sky-400 | `border-sky-500/50 bg-sky-900/10` |
| ACE | yellow-400 | yellow |
| SPIKE | orange-400 | orange |
| BLOCK | blue-400 | blue |
| FAULT | 이모지 | red |
| DIG | green-400 | 기본 슬레이트 (스타일 switch에 case 없음) |
| ASSIST | sky-400 | 기본 슬레이트 |
| SERVE_IN | yellow-400 | 기본 슬레이트 |
| TIMEOUT | slate-400 | slate |
| GAME_END | yellow-500 | green |
| 3HIT | purple-400 | purple |
| FAIRPLAY | green-400 | green |
| SUB | 이모지 | 기본 슬레이트 |
| 그 외 (`DIRECT`, `DEFENSE_FAULT` 포함) | 회색 점 | `border-slate-700 bg-slate-800/30` |

점수 버튼: 감소 `bg-red-600`, 증가 `bg-green-600` (`ScoreboardScreen` `TeamColumn`). 참여 코드 숫자 `text-yellow-400`.

서브를 넣는 팀 카드는 `.glowing-border` (`index.html`: `#00A3FF` box-shadow 2초 반복). 팀 빌더 현재 픽은 `.strong-yellow-glowing-border` (`TeamPanel.tsx`).

### 1.4 타이포그래피

`index.html`에 `font-family`나 웹폰트 `<link>`가 없다. 글꼴은 브라우저 기본이다.

자주 쓰는 Tailwind:

- 브랜드: `font-extrabold tracking-wider uppercase -skew-x-12` (`Header.tsx`의 J-IVE).
- 화면 제목: `text-2xl`~`text-3xl font-bold`.
- 전광판 점수: `text-5xl`부터 `xl:text-9xl font-extrabold` (`ScoreboardScreen`), 아나운서 `text-6xl`~`xl:text-9xl font-black tabular-nums` (`AnnouncerScreen` `LiveGameDisplay`).
- 타임라인 제목 `font-bold`, 부제 `text-xs font-mono text-slate-500` (`GameLog.tsx`).

### 1.5 간격, 모서리, 그림자

토큰 객체가 없다. 반복 클래스만 있다.

| 패턴 | 클래스 | 예 |
|------|--------|-----|
| 화면 폭 | `max-w-6xl` 또는 `max-w-7xl mx-auto px-4` | `MenuScreen`, `ScoreboardScreen` |
| 카드 간격 | `gap-4 sm:gap-6`, `space-y-8` | `MenuScreen` |
| 모서리 | `rounded-lg`, `rounded-xl`, `rounded-2xl` | 메뉴 버튼 `rounded-2xl`, 로그 `rounded-xl` |
| 그림자 | `shadow-lg`, `shadow-2xl`, 모드색 `shadow-green-900/50` / `shadow-amber-900/50` | `MenuScreen` CTA |
| 터치 | `min-h-[44px]` | `MenuScreen` CTA, `ScoreboardScreen` 버튼 |

8px 스케일 강제 규칙은 코드에 없다.

---

## 2. 레이아웃

### 2.1 브레이크포인트

Tailwind 기본 `sm` `md` `lg` `xl`만 쓴다. 커스텀 스크린 없음 (config 파일 없음).

| 구간 | 관찰 | 근거 |
|------|------|------|
| 모바일 | 스코어보드 팀 카드가 세로 (`flex-col lg:flex-row`) | `ScoreboardScreen` 메인 영역 class |
| 아나운서 | 명단 그리드 `grid-cols-1 lg:grid-cols-[1fr_2fr_1fr]` | `AnnouncerScreen` `LiveGameDisplay` |
| 메뉴 | 카드 `grid-cols-1 lg:grid-cols-2 xl:grid-cols-4` | `MenuScreen` |
| 라이브 | 점수 바 `grid-cols-[1fr_auto_1fr]`, 채팅은 우측 하단 `min(320px, 100vw-1.5rem)` | `LiveBroadcastScreen` |
| 참여 코드 | `hidden md:flex`로 데스크톱만 QR | `ScoreboardScreen` PIN 블록 |

태블릿 전용 레이아웃 분기는 없다. `md`와 `lg` 사이는 모바일 스택에 가깝다.

### 2.2 코트 그림

| 화면 | 방식 | 근거 |
|------|------|------|
| 히트맵 | 비율 좌표 0–100%를 직사각형 코트에 점 | `HeatmapViewer.tsx` `HitRecord.x/y`, `HeatmapRecordModal.tsx` |
| 전술판 | 캔버스에 자석·펜. 6인제/9인제 | `components/TacticalBoardModal.tsx` |
| 스코어보드 | 코트를 그리지 않음. 좌우 팀 카드 | `ScoreboardScreen` `TeamColumn` |

히트맵이 배구 코트의 엔드라인·어택라인 좌표를 데이터 모델에 갖는지는 `HitLocation {x,y}` (`types.ts`)뿐이라, 라인 그림은 뷰어 JSX에 있다. 정확한 라인 픽셀은 `HeatmapViewer.tsx`를 열어 확인해야 하며 이 문서에서는 좌표 계약만 확정한다.

### 2.3 점수판

- 기록용: 팀 색 점수 + 빨강 `-` / 초록 `+` + 2열 액션 그리드 (`TeamColumn`).
- 아나운서: 상단 풀폭 바, 가운데에 한 번 더 작은 점수 (`LiveGameDisplay`).
- 관중: 영상 위 오버레이 또는 중앙 대형 숫자 (`LiveBroadcastScreen` `renderDefaultScoreScreen`).
- 세트 스코어: 앰버 배지 (`ScoreboardScreen` `showSetScore`).

### 2.4 버튼 크기

최소 높이 44px가 스코어 조작과 메뉴 CTA에 반복된다. 아이콘 원형 리액션은 `w-14 h-14` (`AnnouncerScreen`). 작은 텍스트 버튼(`text-xs px-2 py-1`)도 공존한다 (서브 순서 버튼). 44px가 전역 규칙은 아니다.

---

## 3. 재사용 컴포넌트와 스타일 방식

스타일 방식: **Tailwind 유틸 클래스 + 가끔 inline style(팀 색)**. CSS Modules 없음. styled-components 없음.

공용으로 옮길 후보와, 배구에 묶인 것을 구분한다.

### 3.1 종목 몰라도 되는 UI

| 컴포넌트 | props (요약) | 사용처 |
|----------|----------------|--------|
| `Header` | `title`, `showBackButton`, `onBack`, `appMode`, `onLockClick`, `showLanguageToggle`, `showUpdateNotesIcon`, `brand` | `App.tsx` `headerProps` |
| `ConfirmationModal` | `isOpen`, `onClose`, `onConfirm`, `title`, `message`, `confirmText`, `children`, `usePortal` | `MenuScreen` 참여·초기화·가져오기 |
| `PasswordModal` | 비밀번호 확인 (파일 `components/common/PasswordModal.tsx`) | 설정 진입 `App.tsx` `requestPassword` |
| `Toast` | `message`, `type` | `DataContext` `showToast`가 상태로 들고 있음 |
| `LanguageToggle` | 언어 전환 | `Header` |
| `UpdateNotesModal` | 릴리즈 노트 | `Header` |
| `AutoSaveToast` | 저장 알림 | 스코어보드 import |
| `LiveChatOverlay` | `messages`, `onSend`, `isInputEnabled`, `raiseOnMobile`, `maxLength` | `ScoreboardScreen`, `AnnouncerScreen` |
| `TeamEmblem` | `emblem`, `color`, `className` | 스코어·아나운서·출석. 아이콘 맵에 `icon_volleyball` 포함이라 완전 무관은 아님 |
| `PlayerCard` | `player`, `onClick`, `showRealNames`, `isDraggable`, 비교·주장 토글 | 팀 빌더 |
| `TeamPanel` | `teamId`, `name`, `color`, `onDrop`, `isCurrentPick`, `children` | 팀 빌더 드롭 영역 |
| `VideoPlayerModal` | 제목·URL | `SkillDrillScreen` |
| `QRCodeSVG` | 라이브러리 컴포넌트 | 스코어보드, 방송 예약 |

`TeamEmblem`은 `useData()`로 사용자 엠블럼을 읽는다 (`TeamEmblem.tsx`). UI 패키지로 빼려면 데이터 의존을 props로 바꿔야 한다.

### 3.2 배구 화면에 붙은 것

| 컴포넌트 | 이유 |
|----------|------|
| `GameLog` | `ScoreEvent` + 배구 type 스위치 |
| `ScoreboardScreen` `TeamColumn` | 파일 내부 컴포넌트. export 아님 |
| `HeatmapViewer` / `HeatmapRecordModal` | 배구 코트·스파이크/에이스 |
| `TacticalBoardModal` | 배구 코트 |
| `SubstitutionModal`, `PlayerSelectionModal` | 교체·득점 선수 선택 |
| `PracticeOptionsModal` | 세트·코트체인지 |
| `LiberoQuickSwapModal` | `ScoreboardScreen.tsx` 내부 |
| `CommentaryGuideModal`, `RulesModal` | 배구 해설/규칙 문구 |
| `StatModal` | 선수 `Stats` 레이더 (`recharts`) |
| `EffectPopup` | `SPIKE` \| `BLOCK` |
| `LeagueStandingsDashboard` | 세트 승점 |
| `AnalysisMemoModal`, `MemoTimelinePanel` | 클럽 메모. UI는 비교적 범용 |
| `HustlePlayerModal` | 수업 노력상 |
| `RosterManagementModal`, `AddNewPlayerModal`, `EmblemModal` | 명단·엠블럼. 필드가 `Player` |
| `MatchDetailAnalysis` | 기록 상세. `RecordScreen`과 타임라인 중복 |
| `components/untitled.tsx` | 배지 랭킹 조각. 사용처는 **미확인** (앱 엔트리에서 import를 찾지 못함) |
| `components/PlayerInputScreen.tsx` 와 `screens/PlayerInputScreen.tsx` | 동명 두 파일. 라우트는 `App.tsx`가 `screens/PlayerInputScreen`을 씀 |

### 3.3 아이콘

`components/icons.tsx`. SVG, `className`으로 `currentColor`. 배구 공 `VolleyballIcon`은 종목 아이콘이다. `FireIcon`, `ShieldIcon`, `BoltIcon`, `TargetIcon`, `WallIcon`, `StopwatchIcon`, `TrophyIcon`, `UndoIcon`, `HandshakeIcon`, `LinkIcon`는 형태만 보면 다른 종목에도 쓸 수 있다. 의미 매핑은 `GameLog.getEventIcon`에 하드코딩.

이모지(⚠️ 🔄 👏 🔥 🏐)는 컴포넌트가 아니다.

---

## 4. 애니메이션·접근성

`index.html` `<style>`:

| 클래스 | 동작 |
|--------|------|
| `.animate-fade-in` | 0.5s 아래서 나타남 |
| `.animate-float-up` | 이모지 상승 |
| `.animate-marquee` | 자막 12s |
| `.animate-shake` | 이펙트 시 화면 흔들림 (`ScoreboardScreen`, `AnnouncerScreen`) |
| `.animate-effect-popup` | 확대 후 사라짐 |
| `.glowing-border`, `.yellow-glowing-border`, `.strong-yellow-glowing-border`, `.pink-glowing-border` | 네온 테두리 |
| 스크롤바 | 슬레이트 `#1e293b` / `#475569` |

`canvas-confetti`는 CSS가 아니다 (`ScoreboardScreen`).

접근성으로 확인된 것:

- 일부 `aria-label` (`Header` 뒤로, `LockScreen` PIN, `StudentJoinScreen` 코드 input).
- 모달 `role="dialog" aria-modal` (`PracticeOptionsModal`, 세트 종료 다이얼로그 `ScoreboardScreen`).
- 오류 `role="alert"` (`StudentJoinScreen`).
- 포커스 링 `focus:ring-2`.
- 터치 44px는 일부 버튼만.
- 색만으로 팀·이벤트 구분 (아이콘이 있는 로그는 예외). 대비를 WCAG로 측정한 코드는 없다.
- 전역 스킵 링크·포커스 트랩 유틸은 찾지 못했다. **체계적 a11y 레이어는 없는 것으로 본다.**

인쇄: `no-print`, `print-text-black` (`RecordScreen`, `GameLog`이 아닌 기록 타임라인).

---

## 5. 다른 종목 앱으로 옮길 때 추출 목록

그대로 복사하면 되는 토큰 (새 파일로 모으기 전 현재 위치):

1. 배경 `#1A1A2E`, 글자 slate-200, 그리드 배경 (`index.html`).
2. 액센트 `#00A3FF` / `#0082cc` / `#0090e0`.
3. 모드 보조색 amber vs green CTA (`MenuScreen`, `Header`). 종목 앱이 하나면 모드 색은 빼도 된다.
4. 상태 색 표 (성공 green, 위험 red, 경고 yellow, 정보 sky). 이벤트 종류 이름은 종목 패키지로.
5. 반경 `rounded-xl`/`2xl`, 그림자는 Tailwind 기본.
6. 모션 6종 (`index.html`).
7. 컴포넌트: `Header`, `ConfirmationModal`, `PasswordModal`, `Toast`, `LanguageToggle`, `LiveChatOverlay`, `PlayerCard`, `TeamPanel`.
8. 아이콘 SVG 중 종목 중립인 것 (`icons.tsx`에서 `VolleyballIcon` 분리).

남길 것 (배구 앱 전용): `GameLog`의 type 스위치, `TeamColumn`, 히트맵 코트, 전술 코트, 점수 버튼 라벨, 배구 아이콘.

팀 색은 토큰이 아니라 데이터다 (`TEAM_COLORS_PALETTE`). 공용 팔레트 상수로 빼면 된다.

---

## 6. 대표 화면 묘사

### 6.1 메뉴 (`screens/MenuScreen.tsx`)

어두운 슬레이트 위에 최대 너비 6xl. CLUB이면 카드 영역 전체에 amber 얇은 테두리와 `bg-slate-900/50`. 맨 위 두 개의 큰 둥근 버튼이 가로(좁으면 세로)로 놓인다. CLASS 시작은 녹색, CLUB 시작은 호박색, 둘 다 흰 글자·아이콘·호버 시 살짝 떠오른다. 그 아래 슬레이트 패널에 「최근 경기」 한 줄(팀명, 점수, 승자, 하늘색 강조). 이어서 세 구역 제목(준비 / 분석 / 앱 관리)과 카드 그리드. 카드는 아이콘, 굵은 제목, 회색 설명. CLUB이면 맨 아래에 리그 순위 대시보드, 마지막에 빨간 테두리의 데이터 초기화.

### 6.2 스코어보드 팀 카드 (`ScoreboardScreen.tsx` `TeamColumn`)

좌우(좁은 화면에서는 위아래) 두 장. 배경 `slate-900/50`, 모서리 `rounded-lg`, 2px 테두리. 서버 팀은 `#00A3FF` 글로우, 아니면 `#334155`. 위: 엠블럼, 흰 팀명, CLUB이면 「서브 순서」 작은 버튼, 이탤릭 구호(팀 색). 가운데: 팀 색의 매우 큰 점수, 그 아래 빨간 `-`와 초록 `+` (`rounded-xl`, 최소 44px). 그 아래 서브 시작(파란색) 또는 SERVING 표시. 구분선 아래 2열 그리드 버튼(`bg-slate-700`, 슬레이트 글자). CLASS는 에이스·서브·스파이크·블로킹·디그·타임아웃·페어플레이. CLUB은 범실·다이렉트 행이 더 있다. 아이콘은 번개(노랑), 방패(초록), 스톱워치.

### 6.3 아나운서 (`AnnouncerScreen.tsx`)

세로 스크롤, `max-w-7xl`. CLASS이고 대회 모드가 아니면 맨 위 슬레이트 유리 패널에 소리 버튼(파랑 시작, 초록 타임아웃, 노랑 응원, 빨강 종료, 보라 응원가 목록). 재생 중에는 주황. 그 다음 거의 검은(`slate-950`) 가로 바: 왼쪽 팀, 거대한 숫자, 콜론, 오른쪽 팀. 세트·서버·듀스가 바 하단 중앙. 그 아래 세 칸. 양쪽은 팀 색 테두리 명단(주장 왕관, 벤치는 반투명). 가운데는 작은 점수, 타임아웃 시계, 부가 점수, 해설 버튼, `GameLog`(높이 제한 스크롤, 아이콘 원 + 굵은 문장 + 회색 `스코어 a:b`). 점수 이력이 있으면 슬레이트 패널 안 꺾은선 차트. 화면 하단 고정으로 박수·불꽃·배구 원형 버튼. 채팅은 호스트가 켜면 오버레이.

### 6.4 라이브 관전 (`LiveBroadcastScreen.tsx`)

`fixed inset-0` 검정. 안쪽 층: 경기 종료면 중앙에 승자와 세트 스코어 카드. 아니면 유튜브 iframe이 가득 차거나, 영상이 없으면 세로 가운데에 LIVE 라벨, 세트, 좌우 큰 점수, 「최근 득점」 카드. 그 위 층은 클릭이 통과하고 버튼만 받는다. 오른쪽 위 「UI 숨기기」. 영상이 있을 때만 상단 반투명 점수 바. 득점 토스트는 하단 중앙 캡슐. 채팅은 오른쪽 아래 약 320px, 검정 60% 블러. 이모지는 떠오르다 사라진다.

### 6.5 학생 입장 (`StudentJoinScreen.tsx`)

연결 전: 세로 중앙 카드(`slate-800/80`, `rounded-2xl`). 제목은 에메랄드. 코드 입력은 넓은 자간. 버튼은 에메랄드, 비활성은 슬레이트. 방송 대기: 더 어두운 그라데이션, 하늘색 「LIVE 대기」 알약, 매치업을 좌(sky) VS 우(rose)로 나눈 카드, 회전 스피너. 연결 후 CLASS는 아나운서, CLUB은 라이브로 교체된다.
