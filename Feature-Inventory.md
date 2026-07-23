# J-IVE(jct-volleyball-ver3.0) 사용성 평가용 기능 인벤토리

> 석사논문 「사용성 평가」 연구용. 코드·문서 근거와 **추정**을 구분했다.  
> 근거 범위: `App.tsx`, `screens/*`, `components/*`, `contexts/DataContext.tsx`, `data/translations.ts`, `UX-Flow.md`, `Design.md` (2026-07 기준 코드 상태).

---

## 0. 한 줄 요약 (논문 abstract용)

교사(관리자)는 PIN으로 CLASS/CLUB 호스트 콘솔에 들어가 **고밀도 전광판**으로 경기를 운영하고, 학생·관중은 QR/4자리 코드로 **저밀도 관전·역할 화면**에 접속한다. 데이터는 브라우저 `localforage`(IndexedDB)에 모드별로 분리 저장되며, 실시간 동기화는 PeerJS(WebRTC) 호스트 푸시로 이루어진다. CLASS는 수업·팀빌더·평가·역할, CLUB은 방송·히트맵·리그 대시보드 중심의 **베타** 분기다.

---

## 1. 사용자 유형 · 진입점

### 1.1 유형 정의

| 사용자 유형 | 코드상 역할 | 주 진입 | 접근 범위 |
|-------------|-------------|---------|-----------|
| **교사/관리자** | 호스트, PIN 인증 (`AdminLockScreen` → `ProtectedRoute`) | `/` (코드 없음) → PIN → `/class/*` 또는 `/club/*` | 메뉴·설정·전광판·기록·데이터 관리 전체 |
| **학생/선수** | Peer 클라이언트; CLASS에서 역할(아나운서·주심 등) 배정 가능 | `/join`, Lock의 「학생용」, `/?code=` | 관전(`AnnouncerScreen`)·역할 수행; 관리자 메뉴 차단 |
| **관중·시청자** | CLUB 방송 시청 클라이언트 | `/?code=XXXX&liveView=broadcast&…` | 대기 → `LiveBroadcastScreen` (영상·스코어·채팅·결과) |

**추정:** 학생/관중은 관리자 PIN 없이 설정·데이터 초기화·팀 편집에 들어갈 수 없다(코드상 해당 경로는 Protected + 메뉴 미노출).

### 1.2 인증·모드

| 항목 | 내용 | 근거 |
|------|------|------|
| CLASS PIN | `0000` | `AdminLockScreen.tsx` |
| CLUB PIN | `9999` | 동일 |
| 마스터 | `0819` (모드 무관) | 동일 |
| 세션 유지 | `sessionStorage` `unlockedMode` | `ProtectedRoute` / Lock |
| CLASS vs CLUB | 저장 키 prefix `class_*` / `club_*` 분리; UI 테마 sky vs amber | `DataContext`, `Header` |
| CLUB 베타 | 모드 전환 시 베타 모달; Header/릴리즈 노트에도 베타 안내 | `AdminLockScreen`, `Header`, `UpdateNotesModal` |

### 1.3 진입 흐름 (요약)

```text
[/] Gate
  ├─ ?code= / ?liveCode= → StudentJoinScreen
  │     · liveView=broadcast → LIVE 대기 → LiveBroadcastScreen
  │     · 그 외 → AnnouncerScreen (키오스크형, 히스토리 탈출 축소)
  └─ 코드 없음 → AdminLockScreen → PIN → /class | /club
```

- `/join`: 학생 참여 전용.
- Protected 실패 시 **리다이렉트 없이** `LockScreen` 오버레이.

---

## 2. CLASS vs CLUB 기능 맵 (메뉴 기준)

| 기능 영역 | CLASS (수업) | CLUB (스포츠클럽) |
|-----------|--------------|-------------------|
| 경기 시작 CTA | 일반 「경기 시작」 | 「연습 경기 시작」→ `PracticeOptionsModal` |
| 팀빌더 | 메뉴 노출 | 메뉴 숨김 + URL 시 menu 리다이렉트 |
| 대회(Competition) | 토너먼트/리그 허브 | 메뉴 숨김 (딥링크만 가능) |
| 방송 예약 | — | 메뉴 「방송 예약」 |
| 전력 분석 메모 | — | 메뉴 노출 |
| 히트맵 분석 | — | 메뉴 노출 |
| 클래스 랭킹 / 업적 / 역할기록 / 응원가 | 메뉴 노출 | 숨김 |
| 리그 순위 대시보드 | (컴포넌트 존재) | 메뉴 하단 주 경로 |
| 리베로·코트체인 등 | 일부 CLASS 페어플레이/3단 중심 | 6v6 리베로·히트맵 기록 등 강화 **추정(전광판 분기)** |

---

## 3. 기능 인벤토리 표 (사용자 관점)

열 설명: **문제** = 기존 수기/일반 에듀테크 대비 완화하는 불편(코드·카피·구조에서 추론 가능한 범위). **추정**은 명시.

### 3.1 교사/관리자 — 공통·핵심 운영

| 기능명 | 담당 화면/컴포넌트 | 누가·언제 | 해결하는 문제 | UI/UX 특징 | 사용성 관련 기술 |
|--------|-------------------|-----------|---------------|------------|------------------|
| 관리자 잠금·모드 선택 | `AdminLockScreen` | 앱 최초 진입, 세션 만료 후 | 학생 기기로 관리자 설정이 열리는 것 방지 | PIN, CLASS/CLUB 토글, CLUB 시 베타 모달, 학생용 링크, 잠금화면 백업 로드 | sessionStorage 해제; 로컬 전용(서버 계정 없음) |
| 보호 라우트 오버레이 | `LockScreen` + `ProtectedRoute` | URL 직접 진입 시 미인증 | 딥링크로 관리자 화면 노출 방지 | 리다이렉트 대신 오버레이 → 복귀 후 같은 URL 유지 | sessionStorage |
| 홈 메뉴 허브 | `MenuScreen` | 잠금 해제 후 | 기능 분산 탐색 비용 감소 | 카드 그리드, 최근 경기 요약, empty 문구, `min-h-[44px]` CTA | 모드별 카드 분기 |
| 실시간 세션 참여(관리자 기기) | Menu 조인 모달 → Announcer/Live | 보조 화면으로 관전 | 별도 앱 없이 PIN으로 전광판 복제 | 조인 중 버튼 disable, 오류 문구 | PeerJS `joinSession` |
| 팀 선택(매치 셋업) | `MatchSetupScreen` | 연습/수업 경기 직전 | “지금 누가 뛰는지”를 저장 팀에서 불러옴 | 팀 선택 모달, 필터 empty | localforage teamSets |
| 출전·역할 확정 | `AttendanceScreen` | 매치 셋업/리그 라이브 후 | 종이 라인업·역할 배정 혼선 | 선발 수 검증(CLUB), 리베로, CLASS 역할 피커, CLUB 최근 라인업(최대 3) | localStorage 라인업 히스토리(CLUB) |
| **실시간 스코어링 콘솔** | `ScoreboardScreen` | 경기 중(호스트) | 수기 점수·스탯 분리, 중계 지연 | 고밀도: ±점수, 서브/스파이크/블로킹/범실/디그 등, 타임아웃, 교체, Undo(confirm 제거), PIN/QR, 채팅·이펙트, YouTube ID, 전술판·히트맵(모드별) | PeerJS host `full_state_sync` 등; AutoSave 토스트; 터치 `min-h-[44px]`; 반응형 점수 타이포 |
| 전술판 | `TacticalBoardModal` | 메뉴·전광판 | 화이트보드/앱 전환 | 자석+펜, 6/9인제 | canvas + localforage 전술 저장 |
| 기술 드릴 영상 | `SkillDrillScreen` + `VideoPlayerModal` | 수업/훈련 준비 | 유튜브 링크 모음 관리 | 정적 카탈로그 | 네트워크(YouTube) 의존 |
| 팀·명단 관리 | `TeamManagementScreen` | 시즌/학기 중 | 팀 색·엠블럼·구호·응원가 URL 일괄 관리 | CLASS/CLUB placeholder 분기, Roster 모달 | localforage |
| 경기 기록·리플레이성 분석 | `RecordScreen` | 경기 후 | 결과·MVP·타임라인·선수 스탯 회고 | 가이드 empty, 인쇄/이미지, CSV, CLASS/CLUB 탭 분기 | recharts; localforage history |
| 개인 누적 기록 | `PlayerRecordsScreen` | 평가·상담 | 개인 스탯 추적 | CLASS 반 / CLUB 대회·팀 필터 | 동일 |
| 팀 전력 비교 | `TeamAnalysisScreen` | 시즌 분석 | 팀 간 레이더/표 비교 | CLUB: 시즌 히트맵 블록 | 동일 |
| 설정 | `SettingsScreen` | 관리자(비번) | 승점·세트/점수·인제·시트 URL·관리자 비번 | CLUB에서 일부 수업 블록 숨김 | 공통 settings 키 |
| 데이터 백업/복구 | Menu import·export·reset; Lock 백업 로드 | 기기 교체·사고 대비 | 서버 없는 환경에서 데이터 유실 위험 완화 | JSON 파일, reset 2단계(비번→최종확인), toast/recovery | localforage + autosave BACKUP |
| 다국어 | `useTranslation` / `translations.ts` | 전역 | 한·인(id) 교실 혼용 | 언어 토글(설정/헤더 계열) | localStorage language |

### 3.2 교사/관리자 — CLASS(수업) 특화

| 기능명 | 담당 화면/컴포넌트 | 누가·언제 | 해결하는 문제 | UI/UX 특징 | 사용성 관련 기술 |
|--------|-------------------|-----------|---------------|------------|------------------|
| 학생 명단·스킬 입력 | `PlayerInputScreen` | 팀빌더 전 | 수기 명단·엑셀 분산 | CSV/구글시트, 성별·체력·스킬, 결석 제외, alert 검증 | 시트 URL 설정 연동; 동적 스킬 컬럼 파싱 |
| 균형 팀 구성(드래프트) | `TeamBuilderScreen` | 수업 조 편성 | 실력·성비 불균형 편성 | 주장 드래프트, 성비 쿼터, 비교 모달, 익명 토글 | **메뉴 카피 “AI 분석” vs 실제 로컬 규칙** → 기대 불일치 가능(아래 §4) |
| 대회(토너먼트/리그) | `CompetitionScreen` → `TournamentScreen` / `LeagueLobbyScreen` → `LeagueScreen` | 학급 대회 | 대진·일정 수기 관리 | 허브→대진/일정→Attendance→Scoreboard | localforage tournaments/leagues |
| 수행평가형 랭킹 | `AssessmentRankingScreen` | 학기 평가 | 참여·스탯 기반 우수/노력 구분 | 탭, 반·팀수 필터, 가중치 상수 | 기록 집계 |
| 명예의 전당(배지) | `AchievementsScreen` | 동기부여 | 성취 가시화 | 배지 정의·획득자 모달 | achievements 저장 |
| 비출전 역할 기록 | `RoleRecordScreen` | 역할 수행 평가 | 코트 밖 학생 활동 누락 방지 | 반·팀수 필터 | Attendance 역할과 연계 **추정** |
| 응원가 관리 | `CheerSongScreen` | 수업 분위기 | 팀 BGM URL 관리 | Announcer SoundPanel과 연동 **추정** | 팀 필드 + 원격 URL(jsDelivr 변환 등) |
| 페어플레이·3단 카운트 | Scoreboard (CLASS) | 수업 중 | 교육적 지표 기록 | ± 토글형 카운터 | 상태 동기화 |
| 주심 간편 모드 | `RefereeScreen` | 심판 역할 기기 | 저장 부담 없는 간이 운영(번역 카피) | **메뉴 카드 없음** → 딥링크 위주 **추정** | scoreboardMode referee |

### 3.3 교사/관리자 — CLUB(스포츠클럽) 특화

| 기능명 | 담당 화면/컴포넌트 | 누가·언제 | 해결하는 문제 | UI/UX 특징 | 사용성 관련 기술 |
|--------|-------------------|-----------|---------------|------------|------------------|
| 연습 옵션 | `PracticeOptionsModal` | 연습 경기 시작 직전 | 세트·점수·코트체인 등 매번 재설정 | 모달 옵션 묶음 | startMatch 옵션 |
| 방송 예약·공유 | `ScheduledBroadcastScreen` + Create/Manual/Court 모달 | 대회 전·당일 | “지금 PIN 만들고 공유” 병목; 출석 화면 생략 가능 | QR/URL(`liveView=broadcast`), 예약 목록, Attendance **스킵** 후 Scoreboard | localforage scheduled; Peer fixedPin |
| 리그 순위·결과 입력 | `LeagueStandingsDashboard` | 시즌 중(메뉴 하단) | 스프레드시트 순위표 이중 관리 | 조별 순위, 승점 3-1-0, 「실시간 점수 입력」→Attendance | localforage standings |
| 히트맵 분석 | `HeatmapAnalysisScreen` + `HeatmapViewer` | 경기/시즌 후 | 코트 위치별 득실 직관화 | 풀코트, aria/tooltip·키보드 | 전광판에서 위치 기록 → 집계 **추정** |
| 전력 분석 메모 | `AnalysisMemoModal` | 상대 분석 | 종이/카톡 메모 분산 | 상대/개인 메모 | localforage + opponent teams |
| 리베로·히트맵 기록 등 | Scoreboard (CLUB) | 6인 실전 | 클럽 경기 규칙·분석 니즈 | 퀵교체, 코트체인지 등 | 모드 분기 UI |

### 3.4 학생/선수

| 기능명 | 담당 화면/컴포넌트 | 누가·언제 | 해결하는 문제 | UI/UX 특징 | 사용성 관련 기술 |
|--------|-------------------|-----------|---------------|------------|------------------|
| 코드로 수업 세션 참여 | `StudentJoinScreen` | 교사가 PIN/QR 공유 후 | 계정 가입 없이 즉시 관전 | “4자리 코드” 안내, 연결 중 disable, `role="alert"` 오류 | PeerJS client; URL 코드 유지(재접속) |
| 읽기 전용 전광판·해설 | `AnnouncerScreen` | 연결 후(CLASS 기본) | 교실 대형 TV/폰으로 동일 스코어 공유 | 스코어, 로그/차트, `CommentaryGuideModal`, CLASS 응원가 SoundPanel, 채팅·이펙트 | Peer 동기화; **히스토리 네비 없음(키오스크)** |
| 역할 수행(배정 시) | Attendance에서 지정 → 해당 화면/모드 | 아나운서·주심·선심·카메라·기록관 | 전원 출전 불가 시 교육 참여 | 역할별 UI **추정(화면 분기·권한)** | 호스트 상태 의존 |
| (숨김) 카메라 디렉터 | `CameraDirectorScreen` | 딥링크/미연결 메뉴 | 녹화·하이라이트 타임스탬프 | getUserMedia; **MenuCard 없음 → 사실상 숨김** | 권한 alert, 기기 제약 |

### 3.5 관중·시청자 (CLUB 방송)

| 기능명 | 담당 화면/컴포넌트 | 누가·언제 | 해결하는 문제 | UI/UX 특징 | 사용성 관련 기술 |
|--------|-------------------|-----------|---------------|------------|------------------|
| LIVE 대기 | `StudentJoinScreen` (broadcast wait) | URL로 일찍 접속 | 호스트 전 빈 화면/수동 재시도 | 매치업 히어로+스피너, 3–5초 jitter 폴링 | Peer 재시도 |
| 라이브 관전 | `LiveBroadcastScreen` | 호스트 연결 후 | 별도 스트리밍 앱 없이 스코어+영상 | 저밀도: UI 숨김, YouTube iframe, 득점 토스트, 채팅 쿨다운, 리액션(허용 시) | PeerJS + YouTube; 호스트 채팅 on/off |
| 결과 유지 | 동일 (`keepShowingEndedBroadcast`) | 경기 종료·호스트 끊김 | 종료 직후 화면이 꺼져 결과 확인 불가 | 세트 스코어 결과 UI | 클라이언트 상태 유지 |

---

## 4. 알려진 한계 · 미완성 · 카피 불일치

| 항목 | 사용자 영향 | 근거 |
|------|-------------|------|
| CLUB **베타** | “정식 제품” 기대와 불일치; 실험 기능 인지 필요 | `AdminLockScreen` 베타 모달, Header, `UpdateNotesModal` |
| `AnalysisScreen` 제거 스텁 | 분석 메뉴로 오면 “제거되었습니다”만 표시; **라우트 미연결**로 일반 사용자 도달 낮음 | `screens/AnalysisScreen.tsx` |
| AI 분석 리포트 **미지원** | 비밀번호 후 “데모 버전…지원되지 않습니다” | `DataContext.generateAiResponse` |
| 팀빌더 메뉴 “AI 분석” 카피 | **추정:** 실제는 로컬 드래프트 규칙 → 사용성 평가 시 기대-성능 갭 | `MenuScreen` / translations vs 구현 |
| CameraDirector / Referee 메뉴 미노출 | 발견 가능성 낮음; 기능은 코드에 잔존 | `MenuScreen` props만, Card 없음 |
| CLUB에서 Competition·팀빌더 숨김 | 딥링크(`/club/competition`)만 가능 → 학습 곡선·발견성 이슈 | `MenuScreen` `!isClub`, `App.tsx` teamBuilder redirect |
| PeerJS 의존 | NAT/방화벽·모바일 네트워크에서 연결 실패·지연 가능 → Join 오류 UI에 의존 | P2P 아키텍처 |
| 서버 DB 없음 | 기기/브라우저 전환 시 export 없으면 데이터 단절; 다중 교사 동시 편집 충돌 없음 대신 **단일 호스트** | localforage |
| 하드코딩 PIN(기본) | 보안·학교 현장 비밀번호 정책과 충돌 가능(설정에서 변경 여부는 admin password util) | Lock PIN 상수 + Settings |
| 코드 `TODO`/`FIXME` | 거의 없음; 한계는 스텁·베타·숨김 메뉴로 드러남 | 저장소 검색 |

---

## 5. 사용성 평가 렌즈별 코드 관찰

### 5.1 온보딩·학습 용이성

| 관찰 | 근거/예시 |
|------|-----------|
| Lock: 인가 안내 + CLUB 베타 설명 문단 | `AdminLockScreen` |
| StudentJoin: “교사가 알려준 4자리”형 카피 | translations / Join UI |
| Footer Notion **사용 설명서** 링크 | `App.tsx` |
| 메뉴 업데이트 노트(🔔), 다수 `*_guide_*` 번역 | `UpdateNotesModal`, translations |
| Empty state: 무경기·기록/분석/팀관리 가이드 | Menu, Record, TeamAnalysis 등 |
| **추정:** 첫 화면만으로 Scoreboard 고밀도 UI는 설명 없이 숙달 어렵고, 관전(Announcer/Live)은 상대적으로 직관적 |

### 5.2 에러·예외 UI

| 유형 | 구현 |
|------|------|
| Toast | `showToast` success/error, AutoSaveToast |
| PIN/연결 | `role="alert"`, Join 오류 문구, 연결 중 disable |
| `alert()` | CSV 검증, 리그 최소팀, 카메라 권한, CLUB 베타(Header) 등 — 모달 대비 이질적 |
| 확인 모달 | PasswordModal, ConfirmationModal(import/reset 2단계) |
| 데이터 복구 | `recoveryData` 모달 경로 |

### 5.3 반응형·터치

| 관찰 | 근거 |
|------|------|
| Tailwind `sm:`/`lg:` 광범위 | 대부분 screens |
| Scoreboard 점수 `text-5xl` → `xl:text-9xl` | 대형 디스플레이 의도 |
| 터치 타깃 `min-h-[44px]` | Menu CTA, Scoreboard, TeamBuilder, Record 등 |
| UpdateNotes에 모바일 전광판 겹침 수정 이력 | 릴리즈 노트 |

### 5.4 오프라인·지속성

| 관찰 | 근거 |
|------|------|
| **오프라인 우선 SPA(추정)**: 백엔드 API 없이 로컬 저장 | localforage keys `class_*`/`club_*` |
| 설정·언어 공통 키 | `jct_volleyball_settings`, `jct_volleyball_language` |
| 실시간·영상·시트는 온라인 필요 | PeerJS 시그널링/WebRTC, YouTube, Google Sheet |
| CLASS/CLUB 데이터 물리 분리 | 모드 전환 시 덮어쓰기 방지 |

### 5.5 접근성(a11y)

| 관찰 | 근거 |
|------|------|
| 부분 적용 | `aria-label`, `role="dialog"|"alert"|"switch"|"tooltip"`, Heatmap keyboard |
| **추정:** 전역 a11y 체계는 아님(이모지 아이콘·색 의존·포커스 트랩 불균일) |

### 5.6 키오스크·탈출 경로 통제

| 관찰 | 근거 |
|------|------|
| 학생 연결 후 Announcer만 / broadcast는 Live | `StudentJoinScreen` |
| Announcer에 history 네비 생략 | props `onNavigateToHistory` 부재 |
| Header 전역 잠금(관리자 기기) | Header |
| 대회 전광판 모드: 학생 조작·BGM 원격 차단 | UpdateNotes / tournament_mode sync |

---

## 6. 실시간·저장 아키텍처 (사용성 함의)

### 6.1 PeerJS

- Peer ID: `jive-` + 4자리 PIN(혼동 문자 제외).
- Host: 주로 Scoreboard에서 세션 시작.
- Client: `joinSession(PIN)`.
- 주요 메시지 유형: `full_state_sync`, `action`, settings/team/emblem sync, ticker, broadcast video, effect, tournament mode, timeout viewer, chat, reaction, viewer count, ban/block 등 (`types.ts` `P2PMessage`).
- 채팅: 비속어 필터(`filterProfanity`), 쿨다운(시청자 UI).

**사용성 함의:** 호스트 탭/기기 하나가 진실 공급원 → 호스트 sleep/전환 시 전 클라이언트 영향. 연결 실패 시 재시도·폴링 UX가 평가 포인트.

### 6.2 저장소 요약

| 저장소 | 내용 |
|--------|------|
| localforage `class_*` / `club_*` | teamSets, matchHistory, emblems, achievements, tournaments, leagues, coachingLogs, backup, opponentTeams, leagueStandings, practice/league history, scheduledBroadcasts(CLUB) 등 |
| localforage/공통 | settings, language, 전술 목록 등 |
| localStorage | CLUB lineup history 등 |
| sessionStorage | `unlockedMode` |

---

## 7. 화면 목록 체크리스트 (컴포넌트 단위)

| 화면 | 경로/뷰 키(개념) | 주 사용자 | 메뉴 노출 |
|------|------------------|-----------|-----------|
| AdminLockScreen | `/` | 관리자 | — |
| StudentJoinScreen | `/`, `/join`, `?code=` | 학생·관중 | — |
| MenuScreen | `/class`, `/club` | 관리자 | 홈 |
| MatchSetupScreen | matchSetup | 관리자 | CTA 경유 |
| AttendanceScreen | attendance | 관리자 | 경유 |
| ScoreboardScreen | scoreboard | 관리자(호스트) | 경유 |
| AnnouncerScreen | announcer | 학생·보조 | 조인 |
| LiveBroadcastScreen | broadcast | 관중 | URL |
| ScheduledBroadcastScreen | scheduled-broadcast | CLUB 관리자 | ○ CLUB |
| RecordScreen | history | 관리자 | ○ |
| PlayerRecordsScreen | playerRecords | 관리자 | ○ |
| TeamAnalysisScreen | teamAnalysis | 관리자 | ○ |
| HeatmapAnalysisScreen | heatmap | CLUB 관리자 | ○ CLUB |
| TeamManagementScreen | teamManagement | 관리자 | ○ |
| PlayerInputScreen / TeamBuilderScreen | teamBuilder | CLASS 관리자 | ○ CLASS |
| Competition / Tournament / League* | competition… | CLASS(주) | ○ CLASS / CLUB 딥링크 |
| AssessmentRankingScreen | ranking | CLASS | ○ CLASS |
| AchievementsScreen | achievements | CLASS | ○ CLASS |
| RoleRecordScreen | roleRecord | CLASS | ○ CLASS |
| CheerSongScreen | cheerSong | CLASS | ○ CLASS |
| SkillDrillScreen | skillDrill | 관리자 | ○ |
| SettingsScreen | settings | 관리자 | ○ |
| RefereeScreen | referee | 관리자/역할 | ✕ 메뉴 |
| CameraDirectorScreen | camera | — | ✕ 메뉴 |
| AnalysisScreen | — | — | 제거 스텁 |

모달/위젯(메뉴·전광판 내): `TacticalBoardModal`, `AnalysisMemoModal`, `PracticeOptionsModal`, `LeagueStandingsDashboard`, `CommentaryGuideModal`, `Substitution`/`Heatmap` 관련 모달, `PasswordModal`, `ConfirmationModal`, `UpdateNotesModal` 등.

---

## 8. 논문 작성 AI에게 넘길 때 권장 프롬프트 조각

다음을 그대로 붙여도 된다.

```text
이 문서는 J-IVE 배구 지도 플랫폼의 코드 기반 기능 인벤토리이다.
- "추정:" 표기만 가설로 쓰고, 나머지는 구현된 기능으로 서술할 것.
- 사용자 유형은 교사/관리자, 학생/선수, 관중·시청자로 구분.
- CLASS(수업)와 CLUB(스포츠클럽 베타)의 메뉴·데이터 분리를 사용성 차이로 논의할 것.
- 핵심 대비: 고밀도 Scoreboard(호스트) vs 저밀도 Announcer/LiveBroadcast(클라이언트).
- 기술 제약(PeerJS, localforage, AI 스텁, 숨김 메뉴)을 사용성 한계로 연결할 것.
- 온보딩·에러·반응형·키오스크·오프라인 관찰은 §5를 우선 인용할 것.
```

---

## 9. 관련 문서

- `UX-Flow.md` — CLUB 중심 화면 전환·정보 밀도
- `Design.md` — 비주얼·스크린 인벤토리(디자인용)
- 본 문서 — 사용성 평가·논문용 기능·한계 인벤토리
