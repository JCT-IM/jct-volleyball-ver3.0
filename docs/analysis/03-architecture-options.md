# 03. 구조 제안 (종목 확장)

이 문서는 J-IVE 배구 레포를 농구·배드민턴·탁구·풋살로 늘릴 때 구조를 고르기 위한 비교다. 기능 목록은 `01-feature-inventory.md`, 화면 언어는 `02-design-system.md`와 맞춰 읽으면 좋지만, 이 파일만으로도 결정에 필요한 코드 사실을 적는다.

## 현재 코드가 이미 가진 결합

한 Vite 앱이다 (`package.json` `scripts.dev` = `vite`, 진입 `index.html` → `index.tsx` → `App.tsx`).

| 사실 | 근거 | 확장 시 의미 |
|------|------|----------------|
| 화면 상태가 URL이 아님 | `App.tsx` `view` switch. 경로 4개 | 종목을 URL로 나누려면 라우터를 새로 짜야 함 |
| 상태·감속기·P2P·저장·배지가 한 파일 | `contexts/DataContext.tsx` `matchReducer`, `localDispatch`, `startHostSession`, `getStorageKeys` (약 3000줄) | 패키지 경계를 파일 복사만으로는 못 만듦 |
| 기록 타입이 배구 동사 | `types.ts` `Action`, `ScoreEventType`, `PlayerStats` | 공용 코어에 두면 농구 점프샷이 배구 유니온을 오염 |
| 로그가 한국어 문장 | `matchReducer` `newEventDescription`. 재집계는 `utils/clubSetStats.ts`가 문장을 `includes` / 정규식으로 읽음 | 설정 파일만으로 종목을 바꿀 수 없음 |
| 스타일 토큰 파일 없음 | Tailwind CDN `index.html`. `tailwind.config` 없음 | UI 패키지는 토큰을 새로 추출해야 함 |
| 저장 키가 `volleyball` | `getStorageKeys` | 같은 브라우저에 타 종목을 올려도 키는 안 겹침. 공용 스토리지 API는 prefix 인자가 필요 |
| 배포 | `gh-pages`, `homepage` GitHub Pages, `vercel.json` 존재 | 정적 호스팅. 백엔드 없음 |
| 오프라인 | localforage. 실시간·유튜브·시트·PeerJS 시그널링은 네트워크 | 기록 입력은 호스트 기기에서 오프라인 가능. 관전 동기화는 불가 |
| 모드 분기 | `appMode` `'CLASS' \| 'CLUB'`가 이미 두 제품처럼 메뉴를 가름 | 세 번째 축(종목)을 같은 플래그에 넣으면 분기가 제곱으로 늘어남 |

---

## 옵션 1. 종목별 레포 완전 분리

배구 레포를 복사한 뒤 농구 레포에서 배구 단어를 지우고 규칙을 다시 쓴다. 공용 npm 패키지는 만들지 않는다.

### 배구에서 무엇을 어디로

| 배구 레포 (유지) | 새 종목 레포 |
|------------------|--------------|
| 전체 트리를 복제 | 새 git 루트 |
| `screens/ScoreboardScreen.tsx`, `matchReducer`, `types.ts`의 스탯 | 그 레포 안에서 종목별로 수정. 배구 레포는 원본 유지 |
| `utils/clubSetStats.ts` | 삭제 후 종목 집계로 교체 |
| `data/skillDrills.ts`, `data/badges.ts` | 종목 카탈로그로 교체 |
| 히트맵·전술·리베로 | 종목에 없으면 파일 삭제 |

공유는 없다. 버그 수정은 레포 수만큼 반복한다.

### 새 종목 하나

| 항목 | 예상 |
|------|------|
| 파일 수 | 복제 직후 소스 ts/tsx 약 110개 (`Glob` 기준 110, 그중 화면·컴포넌트·컨텍스트가 대부분). 실제로 고칠 핵심은 `types.ts`, `DataContext.tsx`, `ScoreboardScreen.tsx`, `AnnouncerScreen.tsx`, `AttendanceScreen.tsx`, `RecordScreen.tsx`, `GameLog.tsx`, `clubSetStats.ts`, `badges.ts`, `skillDrills.ts`, `translations.ts`, `SettingsScreen.tsx` |
| 난이도 | 중상. 로직이 `DataContext.tsx` 한 파일에 있어 검색은 쉽고, 안전한 분리는 어렵다 |
| 첫 종목 달력 | 복사 후 점수 규칙만 바꾸는 프로토타입은 짧다. 문장 파서·배지·히트맵을 정리하지 않으면 통계가 배구 문장에 의존한 채 남는다 |

### 학교 배포

| 항목 | 평가 |
|------|------|
| 교사 한 명 | 종목마다 URL·북마크. GitHub Pages 또는 Vercel 프로젝트 N개. 계정은 여전히 없고 PIN·로컬 저장 |
| 무료 호스팅 | 정적 파일만이라 가능 (`package.json` `deploy`, `vercel.json`) |
| 오프라인 | 종목 앱을 설치형으로 묶는 코드는 없다. 브라우저에 한 번 받은 뒤 기록은 localforage. 앱 업데이트는 온라인 |
| 데이터 | 키가 `jct_volleyball_*`라 농구 복사본이 접두사를 안 바꾸면 **같은 브라우저에서 배구 데이터를 덮어씀**. 복사 직후 키 변경이 필수 (`getStorageKeys`) |

### 리스크와 완화

| 리스크 | 완화 |
|--------|------|
| 공용 버그(P2P 끊김, 백업)가 레포마다 어긋남 | 수정 체크리스트를 운영. 코드 공유는 포기한다고 문서에 명시 |
| 복제본이 배구 문장 파서를 남김 | 복제 직후 `clubSetStats.ts`와 `formatTickerFromEventDescription`을 삭제하거나 테스트로 실패하게 만듦 |
| 디자인 수정이 N번 | 허용. 종목이 2개를 넘으면 옵션 2로 이전한다고 기준을 둠 |

---

## 옵션 2. 모노레포 + 공용 패키지 + 종목 앱

예: `packages/ui`, `packages/storage`, `packages/p2p`, `packages/stats-core`, `apps/volleyball`, `apps/basketball`.

공용으로 올릴 수 있는 것(01 문서 A):

- UI: `Header`, `ConfirmationModal`, `PasswordModal`, `Toast`, `LanguageToggle`, `LiveChatOverlay`, 색·모션 (`index.html`에서 추출).
- storage: prefix를 받는 localforage 헬퍼. 지금 구현은 `getStorageKeys(appMode)`와 `utils/dataService.ts`.
- p2p: `startHostSession` / `joinSession` / `broadcast`의 연결 수명. payload 타입은 제네릭.
- stats-core: `type` 필드만 보고 집계하는 인터페이스. **문장 파싱은 넣지 않음.**

종목 앱에 남는 것(01 문서 B): `matchReducer`, `ScoreboardScreen`, `ScoreEventType`, 코트, 배지, 드릴, 한글 로그를 만든다면 그 앱 전용 파서.

### 배구에서 무엇을 어디로

| 현재 파일 | 이동 |
|-----------|------|
| `components/common/Header.tsx`, `ConfirmationModal.tsx`, `PasswordModal.tsx`, `Toast.tsx`, `LanguageToggle.tsx`, `UpdateNotesModal.tsx` | `packages/ui` |
| `components/LiveChatOverlay.tsx`, `utils/chatUtils.ts`, `utils/filterProfanity.ts` | `packages/ui` 또는 `packages/p2p`의 채팅 UI |
| `components/icons.tsx` 중 중립 아이콘 | `packages/ui`. `VolleyballIcon`은 `apps/volleyball` |
| `index.html`의 `<style>` 애니메이션·배경색 | `packages/ui`의 CSS. 배구 앱은 그 CSS를 import |
| `utils/dataService.ts`, `getStorageKeys` | `packages/storage`. 시그니처에 `sportPrefix` 추가. 배구는 `class_`/`club_` + `jct_volleyball_`를 그대로 넘겨 기존 데이터 유지 |
| `DataContext.tsx`의 Peer 생성, ICE, `broadcast`, 채팅 팬아웃 | `packages/p2p`. `full_state_sync`의 바디 타입은 앱이 정의 |
| `DataContext.tsx` `matchReducer`, 배지 루프, `utils/clubSetStats.ts` | `apps/volleyball` |
| `screens/ScoreboardScreen.tsx`, `AnnouncerScreen.tsx`, `AttendanceScreen.tsx`, `Heatmap*.tsx`, `TacticalBoardModal.tsx` | `apps/volleyball` |
| `types.ts` | 쪼갬. `P2PState`의 연결 필드만 공용. `MatchState`는 배구 앱 |
| `App.tsx` 라우트 | `apps/volleyball/App.tsx`로 유지. 농구는 별도 `apps/basketball` |

한 저장소·한 lockfile. 배포는 앱마다 정적 빌드 산출물.

### 새 종목 하나

| 항목 | 예상 |
|------|------|
| 파일 수 | 앱 스캐폴드(라우트, 메뉴, 스토리지 prefix, P2P 조립)는 작다. 종목 구현은 점수 화면 1, 감속기 1, 타입 1, 기록 화면 1, 출전 화면 1이 최소. 배구에서 복사할 화면은 10개 안쪽 |
| 난이도 | 초기 추출이 상. 추출이 끝난 뒤의 두 번째 종목은 중 |
| 조건 | `stats-core`가 문장을 모르면 새 종목은 `type`만 정의하면 된다 |

### 학교 배포

| 항목 | 평가 |
|------|------|
| 교사 | 종목별 URL은 옵션 1과 같다. 저장소는 하나라 개발·배포 파이프는 한곳 |
| 무료 호스팅 | 앱별 `dist`. Vercel/GitHub Pages 프로젝트만 종목 수만큼 |
| 오프라인 | 옵션 1과 동일. 공용 패키지가 네트워크를 추가하지는 않음 |
| 데이터 | prefix를 배구 값으로 고정하면 기존 교사 브라우저 데이터가 유지된다 |

### 리스크와 완화

| 리스크 | 완화 |
|--------|------|
| `DataContext.tsx`를 쪼개다 배구 동작이 깨짐 | 단계를 나누고, 각 단계 끝에 기존 `class_` 키로 경기 저장·P2P 참여가 되는지 확인. 아래 마이그레이션 |
| 공용 패키지에 배구 타입이 새어 들어감 | `ScoreEventType`을 packages에 두지 않는 규칙을 README에 고정. 리뷰에서 `serviceAces` 문자열 검색 |
| 모노레포 도구(pnpm workspace 등)를 이 레포가 쓰지 않음 | 첫 PR에서 workspace만 추가하고 배구 앱의 공개 동작은 유지. 교사는 빌드 결과만 받음 |
| Tailwind CDN과 패키지 CSS가 어긋남 | UI 패키지가 클래스 이름을 문서화. 배구 `index.html` CDN은 추출이 끝나기 전까지 유지 |

---

## 옵션 3. 단일 앱 + 종목 config

하나의 사이트에서 `sport: 'volleyball' | 'basketball'` 설정을 읽어 라벨·점수 버튼·승리 조건을 바꾼다.

### 배구에서 무엇을 어디로

| 현재 | 변경 |
|------|------|
| `types.ts` `Action` | 종목 플러그인이 액션을 등록하는 맵으로 교체. 배구 플러그인이 오늘 유니온을 등록 |
| `matchReducer` | 플러그인 `reduce(state, action)` |
| `ScoreboardScreen` `TeamColumn` | 버튼 배열을 config에서 생성 |
| `GameLog` | 아이콘 맵을 config |
| `clubSetStats.ts` | 플러그인 집계. 문장 파서는 배구 플러그인 안에만 남기거나, 집계는 `type`만 사용하도록 배구부터 수정 |
| `App.tsx` `view` | `sport` 쿼리 또는 설정에 따라 메뉴 필터. CLASS/CLUB과 직교 |
| 저장 키 | `getStorageKeys`에 sport 세그먼트 추가. 기존 배구는 예전 키를 그대로 읽게 fallback |

config가 JSON 라벨만이면 `matchReducer`의 한국어 템플릿과 세트 규칙(듀스, 8점 코트체인지, 리베로)을 표현하지 못한다. 그래서 이 옵션의 config는 사실 코드 플러그인이다.

### 새 종목 하나

| 항목 | 예상 |
|------|------|
| 파일 수 | 플러그인 폴더 1개(타입, 감속기, 버튼, 코트, 배지) + 메뉴 분기. 겉보기 파일 수는 옵션 2보다 적다 |
| 난이도 | 상. 배구 분기가 `appMode`와 `entryMode`에 이미 퍼져 있다 (`MenuScreen`, `ScoreboardScreen`, `SettingsScreen`, `AttendanceScreen`). 세 번째 축이 조건문을 늘린다 |
| 회귀 | 농구 수정이 배구 스코어보드 번들에 포함된다 |

### 학교 배포

| 항목 | 평가 |
|------|------|
| 교사 | URL 하나. 종목 선택만 하면 됨. 관리 포인트는 가장 적다 |
| 무료 호스팅 | 프로젝트 하나 |
| 오프라인 | 번들이 종목 전부를 포함. 용량은 커지지만 호스팅 구조는 같다 |
| 데이터 | 키를 종목별로 나누지 않으면 배구 경기 목록에 농구가 섞인다. prefix는 필수 |
| 현장 혼동 | 수업/클럽에 더해 종목까지 한 앱에 있으면 메뉴가 길어진다. 오늘도 CLASS/CLUB로 메뉴를 반으로 나눈 상태 (`MenuScreen`) |

### 리스크와 완화

| 리스크 | 완화 |
|--------|------|
| if (sport)가 화면 곳곳에 생김 | 플러그인 인터페이스 밖에서는 sport 문자열을 금지. 현실적으로 기존 코드가 이미 `isClub`을 화면마다 검사해 금지 비용이 큼 |
| 배구 로그 파서가 공용 경로에 남음 | 집계는 `event.type`만. 문장 파서는 배구 플러그인으로 격리 |
| 한 번의 배포가 모든 종목을 망가뜨림 | 종목별 빌드 플래그. 그러면 옵션 2의 앱 분리와 같아짐 |

---

## 비교

|  | 옵션 1 레포 분리 | 옵션 2 모노레포 | 옵션 3 단일 앱 config |
|--|------------------|-----------------|------------------------|
| 배구 회귀 위험 | 낮음 (원본 동결) | 중간 (추출 중에만) | 높음 (한 번들) |
| 두 번째 종목 비용 | 높음 (다시 복사) | 중간 | 중간이나 결합도 높음 |
| 공용 버그 수정 | N번 | 1번 | 1번 |
| 교사 URL | N개 | N개 | 1개 |
| 기존 로컬 데이터 | 키만 바꾸면 유지 | prefix 고정으로 유지 | fallback 없으면 유실 |
| 로그 문장 위험 | 복사본에 남기 쉬움 | 배구 앱 안으로 가둠 | 공용 경로에 남기 쉬움 |
| 이 레포와의 거리 | 가장 가까움 | 리팩터 필요 | 아키텍처 변경이 가장 큼 |

---

## 추천: 옵션 2

이 레포는 이미 「한 앱, 두 모드」다. CLASS/CLUB는 `appMode` 플래그로 메뉴와 저장 키만 나뉘고, 점수 규칙은 같은 `matchReducer`를 탄다. 종목을 세 번째 플래그로 넣는 옵션 3은 그 패턴을 반복한다. 배구 문장 파서(`clubSetStats.ts`)와 `Action` 유니온이 공용 경로에 남는 순간, 농구 로그가 배구 집계를 탄다.

옵션 1은 당장 농구 실험을 시작하기엔 맞다. 다만 P2P·백업·잠금 화면 버그를 종목 수만큼 고쳐야 하고, 이 제품은 그 세 가지가 현장 핵심이다 (`DataContext` 호스트 세션, `loadBackupOnLockScreen`, `AdminLockScreen`). 공용으로 뺄 가치가 파일 수로 증명된다.

옵션 2는 교사에게는 여전히 종목별 사이트(정적 호스팅, PIN, 오프라인 기록)를 준다. 개발 저장소만 하나다. 배구 저장 키를 바꾸지 않으면 이미 쓰던 브라우저 데이터가 유지된다.

옵션 3의 「URL 하나」가 꼭 필요해지면, 옵션 2의 앱을 나중에 한 껍데기 도메인에서 경로로 붙여도 된다 (`/volleyball`, `/basketball`). 그건 배포 합치고, 감속기를 합치는 일이 아니다.

### 단계 (각 단계 후에도 배구 앱이 동작)

전제: 저장 키 문자열과 `MatchState` JSON 모양은 단계를 건너뛰며 바꾸지 않는다. 배구 앱의 import 경로만 바뀐다.

1. **동결.** 이 분석 문서를 기준으로 배구 `Action`과 localforage 키 목록을 테스트 또는 체크리스트로 남긴다. 동작 변경 없음.
2. **워크스페이스만 추가.** 루트를 모노레포로 만들고 현재 앱을 `apps/volleyball`로 옮긴다. 빌드 명령만 경로가 바뀐다. 기능 동일. `components/package.json`은 앱이 아니면 옮기지 않고 방치 여부를 확인한 뒤 삭제 여부는 별도 결정 (**지금 빌드 포함 여부는 미확인**).
3. **스토리지 헬퍼 추출.** `getStorageKeys`를 함수로 패키지에 복사하고, 배구는 지금과 같은 문자열을 넘긴다. 읽고 쓰기는 기존 키.
4. **UI 껍데기 추출.** `Header`, `ConfirmationModal`, `Toast`, `LanguageToggle`를 패키지로 옮기고 배구가 re-export. 클래스 이름은 유지해 화면이 같아 보이게 한다. Tailwind CDN은 이 단계까지 배구 `index.html`에 둔다.
5. **P2P 전송 추출.** 연결·`broadcast`·채팅 팬아웃만 패키지로. `full_state_sync`는 `unknown` payload로 두고 배구 `localDispatch`가 `MatchState`를 넣는다. ICE 서버 목록은 그대로 복사.
6. **집계 계약.** 배구 `derivePlayerStatsFromEvents`가 문장 대신 `event.type`과 명시적 `playerId`를 우선하게 배구 앱 안에서 수정한다. 문장 fallback은 옛 기록용으로 배구 앱에만 남긴다. 이 단계만 배구 동작이 살짝 달라질 수 있으므로, 옛 경기 JSON으로 세트 스탯이 같은지 비교한다.
7. **농구 앱 추가.** `apps/basketball`는 단계 3–5 패키지만 쓰고, 점수 감속기와 화면은 새로 작성한다. 배구 앱 코드는 import하지 않는다.
8. **배포.** 배구 GitHub Pages/Vercel 프로젝트는 `apps/volleyball` 빌드 산출물만 가리키게 바꾼다. 공개 URL은 유지.

6을 3보다 앞으로 당기지 않는다. 파서 수정과 폴더 이동을 한 PR에 넣으면 회귀 원인을 나누기 어렵다.

### 하지 말 것

- 공용 패키지에 `ScoreEventType` 배구 유니온을 넣는 것.
- 농구 앱이 `descriptionKey.includes('스파이크')`를 호출하는 것.
- CLASS/CLUB 플래그를 종목 대신 재사용하는 것. 수업/클럽은 배구 앱 안의 모드로 남긴다.
