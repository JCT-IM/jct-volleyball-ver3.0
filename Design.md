# J-IVE Design System

> Google Stitch 등 AI UI 도구에 넘길 **디자인 컨텍스트 문서**.  
> 아래 내용은 코드(`index.html`, `App.tsx`, `screens/*`, `components/*`)에서 확인한 값만 정리했다.  
> Tailwind는 CDN(`cdn.tailwindcss.com`)을 사용하며, 프로젝트 루트에 커스텀 `tailwind.config` / `App.css` / CSS 변수는 없다. Tailwind 기본 팔레트 hex는 Tailwind v3 기본값을 병기한다.  
> UI 컴포넌트 라이브러리(MUI 등) 없음. 차트·QR 등은 `recharts`, `qrcode.react` 등. `index.html`이 `/index.css`를 링크하나, 디자인 토큰의 실질 소스는 `index.html` 인라인 스타일 + Tailwind 클래스다.

---

## 1. 전체 톤앤매너

다크 네이비/슬레이트 배경 위에 **일렉트릭 블루(`#00A3FF`)** 액센트를 올린 **스포츠·e스포츠형 다크 UI**다.  
브랜드 `J-IVE`는 헤더에서 **기울기(`-skew-x-12`) + uppercase + extrabold**로 전광판/게이밍 타이틀 느낌을 낸다.  
수업 모드(CLASS)는 블루/스카이 계열, 스포츠클럽 모드(CLUB)는 **앰버/골드(`amber-*`)** 로 모드 정체성을 나눈다.

---

## 2. 색상 팔레트

### 2.1 글로벌 배경

| 용도 | 코드에서 확인된 값 | 출처 |
|------|-------------------|------|
| `body` 배경 | `#1A1A2E` | `index.html` → `body class="bg-[#1A1A2E] text-slate-200"` |
| `body` 기본 텍스트 | `text-slate-200` → `#e2e8f0` | 동일 |
| 그리드 패턴 오버레이 | 흰 1px 라인 `rgba(255,255,255,0.03)`, 간격 `30px` | `index.html` `<style>` |
| 앱 루트 (CLUB) | `bg-gradient-to-b from-slate-950 via-amber-950/12 to-slate-950` | `App.tsx` |
| 잠금/로그인 화면 | `bg-gradient-to-b from-slate-900 to-slate-800` | `AdminLockScreen.tsx`, `StudentJoinScreen.tsx` |
| 학생 대기/조인 | `from-slate-950 to-slate-900` | `StudentJoinScreen.tsx` |

**자주 쓰는 패널 배경**

- `bg-slate-900` / `bg-slate-900/50` / `bg-slate-900/60` / `bg-slate-900/80`
- `bg-slate-800` / `bg-slate-800/30` / `bg-slate-800/50` / `bg-slate-800/80` / `bg-slate-800/90`
- `bg-slate-700` / `bg-slate-700/90` (버튼·인풋 보조)

| Tailwind | Hex (기본 팔레트) |
|----------|-------------------|
| `slate-950` | `#020617` |
| `slate-900` | `#0f172a` |
| `slate-800` | `#1e293b` |
| `slate-700` | `#334155` |
| `slate-600` | `#475569` |
| `slate-500` | `#64748b` |
| `slate-400` | `#94a3b8` |
| `slate-300` | `#cbd5e1` |
| `slate-200` | `#e2e8f0` |

### 2.2 Accent (브랜드 / 포커스)

코드 주석에서 **electric-blue**로 명시됨 (`index.html`).

| 용도 | 값 | 사용처 예시 |
|------|-----|------------|
| Primary accent | `#00A3FF` | 제목, 포커스 링, Primary 버튼, 토글 ON, glow |
| Primary hover | `#0082cc` | 버튼 `hover:bg-[#0082cc]` (다수 화면) |
| Primary hover (잠금) | `#0090e0` | `App.tsx` 잠금 해제 버튼 |
| Focus ring | `focus:ring-[#00A3FF]` / `focus:ring-sky-500` | 인풋·메뉴 카드 |
| Soft accent fill | `bg-[#00A3FF]/10`, `border-[#00A3FF]` | 결과/강조 박스 |
| Sky 보조 | `text-sky-400` `#38bdf8`, `sky-500` `#0ea5e9`, `bg-sky-500/10` | 메뉴 카드 아이콘·호버 |

### 2.3 모드별 브랜드 색 (CLASS vs CLUB)

| 모드 | 브랜드/강조 | 코드 |
|------|-------------|------|
| CLASS | `text-[#00A3FF]` | `Header.tsx` |
| CLUB | `text-amber-400`, 배지 `bg-amber-500/20 text-amber-400 border-amber-500/50` | `Header.tsx` |
| CLUB 앱 배경 | `via-amber-950/12` | `App.tsx` |
| CLUB CTA (메뉴 시작) | `bg-amber-600 hover:bg-amber-500` | `MenuScreen.tsx` |
| CLASS CTA (메뉴 시작) | `bg-green-600 hover:bg-green-700` | `MenuScreen.tsx` |

### 2.4 팀 / 차트 색

**팀 빌더·팀 관리 팔레트** (`TEAM_COLORS` / `TEAM_COLORS_PALETTE`):

| Hex | 대략적 Tailwind |
|-----|-----------------|
| `#3b82f6` | blue-500 |
| `#ef4444` | red-500 |
| `#22c55e` | green-500 |
| `#eab308` | yellow-500 |
| `#8b5cf6` | violet-500 |
| `#ec4899` | pink-500 |
| `#14b8a6` | teal-500 |
| `#f97316` | orange-500 |
| (+ 확장) `#64748b`, `#f472b6`, `#06b6d4`, `#f59e0b` | slate / pink / cyan / amber |

**스코어보드 A/B 관례**

- 팀 색 폴백 (코드에서 반복): Team A `#38bdf8` (sky-400), Team B `#f87171` (red-400) — `ScoreboardScreen`, `LiveBroadcastScreen`, `MatchSetupScreen` 등
- UI 클래스 관례: Team A `bg-blue-500` / `bg-blue-500/20 text-blue-300`; Team B `bg-red-500`–`600` / `bg-red-500/20 text-red-300` (`ScoreboardScreen`)

**비교 차트** (`ComparisonModal.tsx`):

- Player1: `#00A3FF` (주석: electric-blue)
- Player2: `#fb923c` (주석: orange-400)

**라인 차트 폴백** (`MatchDetailAnalysis.tsx`):

- Team A: `match.teamA.color || '#3b82f6'`
- Team B: `match.teamB.color || '#10b981'`

### 2.5 텍스트

| 역할 | 클래스 | Hex |
|------|--------|-----|
| 본문/기본 | `text-slate-200`, `text-white` | `#e2e8f0`, `#ffffff` |
| 보조 | `text-slate-300`, `text-slate-400` | `#cbd5e1`, `#94a3b8` |
| 캡션/희미 | `text-slate-500` | `#64748b` |
| 강조 제목 | `text-[#00A3FF]`, `text-sky-400` | `#00A3FF`, `#38bdf8` |
| CLUB 강조 | `text-amber-400` | `#fbbf24` |
| 에러 | `text-red-400` | `#f87171` |
| 성공/상태 | `text-emerald-300`, `text-green-*` | — |
| MVP/하이라이트 | `text-yellow-300` | `#fde047` |

### 2.6 테두리 / 오버레이

| 용도 | 클래스 |
|------|--------|
| 기본 카드 보더 | `border-slate-700`, `border-slate-700/50`, `border-slate-600` |
| 액센트 보더 | `border-sky-500/80`, `border-[#00A3FF]`, `border-amber-500/40` |
| 모달 딤 | `bg-black/60`, `bg-black/80`, `bg-black/90` |
| 스크롤바 track/thumb | `#1e293b` / `#475569` (hover `#64748b`) — `index.html` |

### 2.7 상태 / 액션 색

| 의미 | 예시 클래스 |
|------|-------------|
| Success / Primary CTA (녹색) | `bg-green-600 hover:bg-green-500\|700`, `bg-emerald-600` |
| Danger / 확인(삭제) | `bg-red-600 hover:bg-red-500` |
| Warning / Undo | `bg-yellow-600`, `border-yellow-400`, `yellow-glowing-border` (`#facc15`) |
| Info / Secondary | `bg-sky-600`, `bg-slate-700` |
| Libero (클럽 6인제) | `bg-pink-500/20`, `ring-pink-500`, `pink-glowing-border` (`#ec4899`) |
| Toast success | `AutoSaveToast`: `bg-green-600` |
| Toast (공통) | `components/common/Toast.tsx` — success `bg-green-600`, error `bg-red-600` (하단 중앙 `fixed bottom-8`) |

### 2.8 Glow / 모션 컬러 (`index.html`)

- `.glowing-border` → `#00A3FF`
- `.yellow-glowing-border` → `#facc15` (yellow-400)
- `.strong-yellow-glowing-border` → `#fef08a` / `#facc15` / `#fde047`
- `.pink-glowing-border` → `#ec4899` (pink-500)

---

## 3. 타이포그래피

### 3.1 폰트

- 명시적 Google Fonts / `@font-face` **없음**.
- 앱 루트: `font-sans` (`App.tsx`) → Tailwind/브라우저 기본 sans 스택.
- 데이터/CSV 영역: `font-mono` (`PlayerInputScreen` textarea 등).
- `body` 기본: `text-slate-200`.

### 3.2 크기 체계 (실제 사용 범위)

| 스케일 | 용도 예시 |
|--------|-----------|
| `text-[10px]` ~ `text-[11px]` | 배지·초소형 라벨 |
| `text-xs` | 캡션, 필터 칩, 가이드 |
| `text-sm` | 본문 보조, 버튼(모바일), 테이블 |
| `text-base` | 본문, 메뉴 카드 제목(모바일) |
| `text-lg` | 섹션 소제목, 모달 본문 강조 |
| `text-xl` / `text-2xl` | 화면/모달 제목 |
| `text-3xl` | 페이지 타이틀, 잠금 아이콘 주변 |
| `text-4xl` / `text-5xl` | 헤더 브랜드 (`Header`: `text-3xl sm:text-4xl lg:text-5xl`) |
| `text-6xl` | 잠금 이모지 등 |

**그라데이션 타이틀 패턴** (설정·업적·스킬드릴·토너먼트 등):

```text
text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400
```

### 3.3 굵기 / 트래킹

| 패턴 | 용도 |
|------|------|
| `font-extrabold` + `tracking-wider` + `uppercase` + `-skew-x-12` | 브랜드 `J-IVE` 헤더 |
| `font-bold` | 버튼, 모달 제목, 카드 타이틀 (가장 흔함) |
| `font-semibold` | 테이블 헤더, 보조 버튼, 배지 |
| `font-medium` | 서브타이틀, 토글 라벨 |
| `font-light` + `tracking-[0.3em]` | 헤더 크레딧 `By JCT` |
| `tracking-[0.4em]` | PIN 입력 |
| `tracking-tight` / `tracking-widest` | 잠금 타이틀 / MVP 타이틀 |

---

## 4. 레이아웃 / 간격 규칙

### 4.1 앱 셸

```text
min-h-screen font-sans p-4 sm:p-6 lg:p-8 flex flex-col
```

- 페이지 컨테이너: 자주 `max-w-2xl` / `max-w-4xl` / `max-w-6xl` + `mx-auto`
- 섹션 간격: `space-y-4 sm:space-y-6`, 메뉴 카테고리 `space-y-8 sm:space-y-12`
- 그리드 gap: `gap-4 sm:gap-6`
- 터치 최소 높이: `min-h-[44px]` (버튼·인풋에 반복)

### 4.2 카드 패턴

**메뉴 카드 (`MenuScreen` `MenuCard`)**

```text
p-4 sm:p-6
bg-slate-800/30 backdrop-blur-lg
border border-slate-700/50 rounded-2xl
hover:border-sky-500/80 hover:-translate-y-1
focus:ring-2 focus:ring-sky-500
min-h-[120px] sm:min-h-[140px]
```

호버 오버레이: `bg-sky-500/10 opacity-0 group-hover:opacity-100`

**콘텐츠 패널 (설정·팀빌더·입력 등)**

```text
bg-slate-900/50 backdrop-blur-sm border border-slate-700
p-4 sm:p-6 rounded-lg shadow-2xl
animate-fade-in
```

**라운딩**

- 메뉴/히어로 CTA: `rounded-2xl`
- 일반 패널·모달: `rounded-lg` (가장 흔함)
- 칩/배지/토글 트랙: `rounded-full`
- 일부 모달: `rounded-xl` / `rounded-2xl`

**블러**

- `backdrop-blur-sm` / `backdrop-blur-lg` / `backdrop-blur-md` (잠금 오버레이)

### 4.3 모달 오버레이 (공통)

```text
fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4
```

내부:

```text
bg-slate-900 rounded-lg shadow-2xl p-6 w-full max-w-* max-h-[90vh] overflow-y-auto
text-white border border-slate-700
```

특수 z-index:

| z | 용도 (코드에서 확인) |
|---|---------------------|
| `z-50` | 일부 구형 토너먼트/리그 모달 |
| `z-[60]` | 일부 오버레이/툴팁 |
| `z-[100]` | 표준 모달 (`ConfirmationModal`, `StatModal` 등) |
| `z-[110]` | 중첩 모달 (전술판·선수히스토리·스코어보드 일부) |
| `z-[200]`–`z-[250]` | 방송 예약·연습옵션·팀선택 등 |
| `z-[9999]` | `LockScreen`, Toast, 앱 잠금, LiveBroadcast UI 토글 |
| `z-[99999]` | Portal 최상위 (리그 시작 모달·히트맵 요약 등) |

열림 시 `document.body.style.overflow = 'hidden'` 패턴이 다수 모달에 있음.

### 4.4 반응형

| Breakpoint | 패턴 |
|------------|------|
| 기본 → `sm:` | 패딩·텍스트·버튼 크기 확대, `flex-col` → `sm:flex-row` |
| `md:` | 2열 그리드 (비교 정보 등) |
| `lg:` | 헤더 `text-5xl`, 그리드 `lg:grid-cols-2`, 타이틀 정렬 |
| `xl:` | 메뉴 `xl:grid-cols-4` |
| `max-md:` | 채팅 플로팅 위치 보정 (`LiveChatOverlay`) |

메뉴 카드 그리드:

```text
grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6
```

---

## 5. 컴포넌트 인벤토리

### 5.1 주요 화면 (`screens/` + `App.tsx` ViewKey)

라우트는 `/class/*`, `/club/*` 아래에 세그먼트로 매핑된다.

| View / Screen | 역할 |
|---------------|------|
| `AdminLockScreen` (`/`) | 관리자 PIN + CLASS/CLUB 모드 선택 |
| `StudentJoinScreen` (`/?code=` / `/join`) | 학생·관중 라이브 세션 참여 |
| `MenuScreen` | 메인 타일 메뉴 (준비 / 분석 / 앱 관리) |
| `TeamBuilderScreen` | 구글시트 기반 능력치·스네이크 드래프트 |
| `PlayerInputScreen` | 시트 CSV 불러오기·반 선택·결석 제외 |
| `MatchSetupScreen` | 경기 팀 선택 |
| `AttendanceScreen` | 출전/선발·리베로·경기 시작 |
| `ScoreboardScreen` | 실시간 전광판·스탯·QR·교체·히트맵 입력 |
| `AnnouncerScreen` | 애너운서/관전용 라이브 뷰 |
| `CameraDirectorScreen` | 카메라 디렉터 화면 |
| `LiveBroadcastScreen` / `ScheduledBroadcastScreen` | 라이브·방송 예약 (CLUB) |
| `RecordScreen` (`history`) | 경기 기록·상세 분석 |
| `PlayerRecordsScreen` | 개인 기록 |
| `RoleRecordScreen` | 역할 수행 기록 (CLASS) |
| `AssessmentRankingScreen` | 클래스 랭킹 보드 (CLASS) |
| `TeamAnalysisScreen` | 팀 누적 분석·레이더 |
| `HeatmapAnalysisScreen` | 히트맵 대시보드 (CLUB) |
| `TeamManagementScreen` | 팀/로스터 관리 |
| `TournamentScreen` / `LeagueScreen` / `LeagueLobbyScreen` | 토너먼트·리그 |
| `CompetitionScreen` | 대회/수업 경쟁 진입 |
| `AchievementsScreen` | 배지·업적 (CLASS) |
| `SkillDrillScreen` | 기능 연습 가이드 |
| `CheerSongScreen` | 응원가 관리 |
| `SettingsScreen` | 환경설정 |
| `RefereeScreen` | 심판 화면 |
| `LockScreen` (component) | URL 보호용 제자리 잠금 오버레이 |

### 5.2 반복 UI 패턴

| 패턴 | 특징 |
|------|------|
| **MenuCard** | 반투명 슬레이트 + blur + `rounded-2xl` + sky 호버 |
| **Primary button** | `bg-[#00A3FF] hover:bg-[#0082cc] text-white font-bold rounded-lg` |
| **Success CTA** | `bg-green-600` / CLUB 시작 `bg-amber-600` |
| **Secondary** | `bg-slate-700 hover:bg-slate-600` |
| **Danger** | `bg-red-600 hover:bg-red-500` |
| **Pill / chip** | `rounded-full` + `bg-*-500/20 text-*-300 border-*-500/40` |
| **Segmented filter** | 활성 `bg-[#00A3FF] text-white font-bold`, 비활성 `bg-slate-700 text-slate-300` |
| **Toggle** | `rounded-full` 스위치 + `#00A3FF` 또는 `amber-500` (모드) |
| **Modal** | 위 4.3 패턴 + 제목 `text-2xl font-bold text-[#00A3FF]` |
| **ConfirmationModal** | 취소 slate / 확인 red |
| **Toast** | `Toast.tsx` fixed 하단 중앙, success green / error red; `AutoSaveToast` 우측 상단 green |
| **Header** | 브랜드 skew + 뒤로가기 `rounded-xl bg-slate-700/90` + 잠금 버튼 |
| **Tables** | `border-slate-700`, 헤더 `text-slate-400`, 리더 `text-[#00A3FF]` |
| **Charts** | Recharts Radar/Bar/Line, 축 라벨 `slate`, 시리즈는 팀 color / `#00A3FF` |

### 5.3 애니메이션 (`index.html` + Tailwind)

- `animate-fade-in` — 화면 진입
- `animate-pulse` — 드래프트 턴 등
- `animate-marquee` — 티커성 텍스트
- `animate-shake` / `animate-float-up` / `animate-effect-popup` — 피드백
- Glow 보더 클래스들 (득점/하이라이트)

---

## 6. 개선하고 싶은 부분

TODO — Stitch에 넘기기 전에 여기에 직접 적어 주세요.

- [ ] 바꾸고 싶은 화면:
- [ ] 현재 문제 / 아쉬운 점:
- [ ] 목표 분위기 / 참고 레퍼런스:
- [ ] 유지해야 할 제약 (체육관 터치, 다크 필수, CLASS/CLUB 색 구분 등):
- [ ] 우선순위:

---

## Appendix — Stitch용 한 줄 요약

> Dark slate/navy sports UI, brand electric blue `#00A3FF`, CLASS=blue/sky · CLUB=amber gold, glass cards (`slate-800/30` + blur + `rounded-2xl`), bold skewed `J-IVE` wordmark, large touch targets (`min-h-[44px]`), modal = centered dark panel on `black/60`.
