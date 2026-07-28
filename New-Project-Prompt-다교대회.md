# 아래 블록 전체를 새 Cursor 빈 프로젝트 채팅에 붙여넣으세요

---

당신은 빈 프로젝트에서 **다교(多校) 배구 대회 지원 웹앱 프로토타입**을 처음부터 만든다.
기존 J-IVE 앱을 포크하지 말고, 아래 **디자인 시스템·인증 패턴·기능 요구사항**만 따라 React + TypeScript + Vite + Tailwind(CDN 또는 Vite 플러그인) + React Router로 구현한다.
DB/백엔드/인증 서버는 쓰지 않는다. 데이터는 하드코딩 샘플만 사용한다.

이건 **제안·시연용 프로토타입**이다. 완성도·엣지케이스보다 **역할 권한 구조·화면 분기·데이터 마스킹**이 한눈에 보이도록 구현하라.

---

## A. 디자인 시스템 (J-IVE에서 추출 — 그대로 따를 것)

### A1. 톤앤매너
- 다크 네이비/슬레이트 배경 + **일렉트릭 블루 `#00A3FF`** 액센트
- 스포츠/e스포츠형 다크 UI
- 브랜드명 예: `J-TOURNEY` 또는 `J-IVE TOURNAMENT` — 헤더는 **기울기 `-skew-x-12` + uppercase + extrabold**

### A2. 색상 (실제 hex)

| 용도 | 값 |
|------|-----|
| body 배경 | `#1A1A2E` |
| 본문 텍스트 | `#e2e8f0` (`text-slate-200`) |
| Primary accent | `#00A3FF` |
| Primary hover | `#0082cc` / 잠금 버튼 `#0090e0` |
| 패널 | `slate-900` `#0f172a`, `slate-800` `#1e293b`, `slate-700` `#334155` |
| 보조 텍스트 | `slate-400` `#94a3b8`, `slate-500` `#64748b` |
| 에러 | `red-400` `#f87171` / 삭제 버튼 `bg-red-600` |
| 성공 CTA | `bg-green-600` / `emerald-600` |
| 하이라이트/MVP | `yellow-300` `#fde047` |
| 스크롤바 track/thumb | `#1e293b` / `#475569` |
| glow | `#00A3FF` |

팀/학교 구분용 팔레트 예시: `#3b82f6`, `#ef4444`, `#22c55e`, `#eab308`, `#8b5cf6`, `#ec4899`, `#14b8a6`, `#f97316`

### A3. 폰트
- Google Fonts 없음. `font-sans` (시스템/Tailwind 기본 sans)
- 코드/PIN: `tracking-[0.4em]`, 필요 시 `font-mono`
- 브랜드: `font-extrabold tracking-wider uppercase -skew-x-12 text-[#00A3FF]`
- 크레딧: `text-slate-500 text-xs tracking-[0.3em] font-light` → `By JCT`

### A4. 레이아웃 / spacing
```
앱 셸: min-h-screen font-sans p-4 sm:p-6 lg:p-8 flex flex-col
컨테이너: max-w-2xl | max-w-4xl | max-w-6xl + mx-auto
섹션: space-y-4 sm:space-y-6 / 카테고리 space-y-8 sm:space-y-12
그리드 gap: gap-4 sm:gap-6
터치 최소: min-h-[44px]
메뉴 카드 그리드: grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6
```

**카드(MenuCard 패턴)**
```
p-4 sm:p-6 bg-slate-800/30 backdrop-blur-lg border border-slate-700/50 rounded-2xl
hover:border-sky-500/80 hover:-translate-y-1 focus:ring-2 focus:ring-sky-500
min-h-[120px] sm:min-h-[140px]
```

**콘텐츠 패널**
```
bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-4 sm:p-6 rounded-lg shadow-2xl animate-fade-in
```

**모달**
```
오버레이: fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4
패널: bg-slate-900 rounded-lg shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto text-white border border-slate-700
제목: text-2xl font-bold text-[#00A3FF]
잠금 오버레이: z-[9999] bg-black/90
```

### A5. index.html에 넣을 글로벌 스타일 (필수)
```html
<body class="bg-[#1A1A2E] text-slate-200">
<style>
body {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 30px 30px;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
@keyframes glow {
  0%, 100% { box-shadow: 0 0 5px #00A3FF, 0 0 10px #00A3FF, 0 0 15px #00A3FF; }
  50% { box-shadow: 0 0 10px #00A3FF, 0 0 20px #00A3FF, 0 0 30px #00A3FF; }
}
.glowing-border { animation: glow 2s ease-in-out infinite; border-color: #00A3FF; }
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #1e293b; border-radius: 10px; }
::-webkit-scrollbar-thumb { background: #475569; border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: #64748b; }
</style>
```

### A6. 공통 컴포넌트 — 아래 코드를 새 프로젝트에 이식·단순화해서 사용

#### Header (J-IVE `components/common/Header.tsx` 기반 — i18n/CLUB 토글 제거한 단순 버전으로 재작성 가능하되 시각 패턴 유지)
```tsx
import React from 'react';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  onLockClick?: () => void;
  subtitle?: string;
  brand?: string;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton,
  onBack,
  onLockClick,
  subtitle,
  brand = 'J-TOURNEY',
}) => {
  return (
    <header className="text-center mb-8 relative flex items-center justify-center">
      {showBackButton && onBack && (
        <button
          onClick={onBack}
          className="absolute left-0 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-700/90 hover:bg-slate-600 border border-slate-600/80 text-white font-semibold text-sm sm:text-base transition-all duration-200 z-10 shadow-lg hover:shadow-sky-500/10 hover:border-sky-500/30"
          aria-label="뒤로"
        >
          ← 뒤로
        </button>
      )}
      <div className="flex-grow flex flex-col items-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-wider uppercase transform -skew-x-12 text-[#00A3FF]">
          {brand} <span className="text-white">{title}</span>
        </h1>
        {subtitle && (
          <p className="text-slate-300 mt-2 text-xs sm:text-sm lg:text-base font-medium tracking-tight animate-fade-in">
            {subtitle}
          </p>
        )}
        <p className="text-slate-500 mt-1 text-xs tracking-[0.3em] font-light opacity-80">By JCT</p>
      </div>
      {onLockClick && (
        <div className="absolute right-0 top-0">
          <button
            type="button"
            onClick={onLockClick}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700/90 hover:bg-slate-600 border border-slate-600 text-white font-semibold text-sm transition-colors shrink-0"
            aria-label="화면 잠금"
          >
            🔒 잠금
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
```

#### ConfirmationModal
```tsx
import React, { useEffect } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  children?: React.ReactNode;
  isConfirmDisabled?: boolean;
  isCancelDisabled?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen, onClose, onConfirm, title, message, confirmText = '확인',
  children, isConfirmDisabled, isCancelDisabled,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-slate-900 rounded-lg shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto text-white border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-[#00A3FF] mb-4">{title}</h2>
        <p className="text-slate-300">{message}</p>
        {children}
        <div className="flex justify-end items-center gap-4 mt-6">
          <button
            onClick={onClose}
            disabled={isCancelDisabled}
            className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-6 rounded-lg transition duration-200 disabled:bg-slate-700 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg transition duration-200 disabled:bg-slate-700 disabled:cursor-not-allowed"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
```

#### Toast
```tsx
import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose(), 2500);
    return () => clearTimeout(t);
  }, [message, onClose]);

  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  return (
    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 text-white py-2 px-6 rounded-lg shadow-lg animate-fade-in z-[9999] ${bgColor}`}>
      {message}
    </div>
  );
};

export default Toast;
```

#### MenuCard (홈 카테고리용)
```tsx
import React, { ReactNode } from 'react';

const MenuCard: React.FC<{
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon, title, description, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="group relative flex flex-col h-full text-left p-4 sm:p-6 bg-slate-800/30 backdrop-blur-lg border border-slate-700/50 rounded-2xl transition-all duration-300 hover:border-sky-500/80 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed overflow-hidden min-h-[120px] sm:min-h-[140px]"
  >
    <div className="absolute inset-0 bg-sky-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="relative">
      <div className="mb-3 sm:mb-4 text-sky-400">{icon}</div>
      <h3 className="text-base sm:text-lg font-bold text-slate-100">{title}</h3>
      <p className="mt-1 text-xs sm:text-sm text-slate-400">{description}</p>
    </div>
  </button>
);

export default MenuCard;
```

---

## B. 인증 패턴 (J-IVE LockScreen에서 추출 → 3역할로 확장)

### B1. 원본 J-IVE 패턴 요약
1. PIN 입력 → 역할 문자열을 `sessionStorage`에 저장 (`unlockedMode`)
2. `ProtectedRoute`는 **리다이렉트하지 않고**, 미인증이면 제자리 `LockScreen` 오버레이
3. 역할별로 허용 경로 접두사를 검사
4. 잠금 해제 시 `setVersion`으로 리렌더만 트리거

**원본 LockScreen 핵심 로직 (참고):**
```tsx
export const UNLOCKED_MODE_KEY = 'unlockedMode';

// PIN → mode
if (trimmed === '0819') mode = 'master';
else if (trimmed === '0000') mode = 'class';
else if (trimmed === '9999') mode = 'club';

sessionStorage.setItem(UNLOCKED_MODE_KEY, mode);
onUnlock();
```

**원본 ProtectedRoute 핵심:**
```tsx
const unlockedMode = sessionStorage.getItem(UNLOCKED_MODE_KEY);
if (!unlockedMode) return <LockScreen onUnlock={handleUnlock} />;
if (unlockedMode === 'master') return <>{children}</>;
if (unlockedMode === 'class' && path.startsWith('/class')) return <>{children}</>;
if (unlockedMode === 'club' && path.startsWith('/club')) return <>{children}</>;
return <LockScreen onUnlock={handleUnlock} />;
```

**원본 AdminLockScreen:** 모드 토글(CLASS/CLUB) + PIN을 **함께** 검증한 뒤 `onUnlock(appMode)`로 라우팅. UI는 `bg-gradient-to-b from-slate-900 to-slate-800`, 카드 `bg-slate-800/80 rounded-2xl border border-slate-600`, PIN `tracking-[0.4em]`, CTA `bg-[#00A3FF] hover:bg-[#0090e0]`.

### B2. 새 앱에서 확장할 3역할 인증 (필수 구현)

`sessionStorage` 키 예:
- `authRole`: `'admin' | 'school' | 'scorer'`
- `authSchoolId`: 학교 코드일 때만 학교 id (예: `'school_a'`)
- (선택) `authTournamentId`: 선택한 대회 id

**하드코딩 코드 예시 (시연용 — UI에 힌트로 작게 표시해도 됨):**
| 역할 | 코드 | 효과 |
|------|------|------|
| 관리자 (공유 1개) | `ADMIN` 또는 `0819` | 전체 학교·전체 학생·종합/부문 랭킹 열람 + 경기 기록 수정/삭제 |
| 학교(교사) | 학교별: `NBU01`, `NBU02`, … | 전체 **학교** 순위표는 보임. **자기 학교 학생**만 이름/순위 확인. 타교 학생은 마스킹. **조회만** |
| 기록관 | 경기/코트별: `SCR1`, `SCR2` | 배정된 경기의 점수·기록 **입력만**. 순위/랭킹/타 데이터 **조회 불가** |

로그인 화면 UX (AdminLockScreen 스타일 복제):
1. (선택) 역할 탭 또는 자동 판별: 코드만 입력하면 lookup 테이블로 역할 결정
2. PIN/코드 인풋 + `role="alert"` 에러
3. 성공 시 sessionStorage 기록 → `/tournaments/:id/dashboard` 또는 기록관은 `/tournaments/:id/score-entry`

권한 가드:
```tsx
type Role = 'admin' | 'school' | 'scorer';

function canViewFullPlayerNames(role: Role) { return role === 'admin'; }
function canViewOwnSchoolPlayers(role: Role) { return role === 'admin' || role === 'school'; }
function canEditMatches(role: Role) { return role === 'admin'; }
function canEnterScores(role: Role) { return role === 'admin' || role === 'scorer'; }
function canViewStandings(role: Role) { return role === 'admin' || role === 'school'; }
function canViewRankings(role: Role) { return role === 'admin' || role === 'school'; }
```

학교 역할에서 타교 선수 표시: `홍*동`, `선수 #12`, 또는 `타교 선수` — **절대 실명 전체 노출 금지**.

기록관은 대시보드/순위/랭킹 라우트 접근 시 Lock 또는 “권한 없음” 화면으로 차단하고 score-entry만 허용.

---

## C. 기능 요구사항 (구현 범위)

### C1. 홈 — 카테고리 선택
버튼/카드 3개 (라우트·코드 모두 존재):
1. `북부교육지원청 배구대회` → id: `northern-edu`
2. `학교스포츠클럽대회` → id: `school-sports-club`
3. `대한배구협회 유소년배구` → id: `kova-youth`

**노출 제어:** 설정 객체 하나 (예 `src/config/tournaments.ts`):
```ts
export const TOURNAMENT_VISIBILITY = {
  'northern-edu': true,       // 지금 이것만 true
  'school-sports-club': false,
  'kova-youth': false,
} as const;
```
홈에서는 `true`인 것만 카드로 보여 주고, 라우트(`/t/school-sports-club/...`)는 만들어 두되 숨긴 대회는 “준비 중” 또는 비노출.

### C2. 로그인 — 위 B2 3종류 코드

### C3. 대회 대시보드 (admin / school만)
- 대회 일정/대진표: 어느 학교가 언제 누구와
- 학교별 승/패, 승점, 종합 순위 테이블
- 학교 클릭 → 그 학교 **상위 N명**(예: 5명) 선수 랭커 모달/패널
  - admin: 실명+스탯
  - school: 자기 학교면 실명, 타교면 마스킹 또는 순위만
- 부문별 랭킹 하이라이트 카드 (서브 성공률, MVP 최다 등)
  - admin: 전체
  - school: **자기 학교 학생이 포함된 카드/행만** (또는 전체 카드에서 타교 이름 마스킹 — 둘 중 하나를 일관되게)

### C4. 관리자 전용 데이터 수정
- `/t/:id/admin/matches` : 경기 선택 → 세트 스코어·상태 수정 / 삭제 (`ConfirmationModal` 사용)
- school/scorer는 이 라우트 접근 불가

### C5. 기록관 전용 입력
- 배정된 1~2경기만 리스트
- 점수 입력 폼 (간단: 팀A/B 세트 스코어, 상태 completed)
- 저장은 **React state** (또는 memory store)만 — 새로고침 시 샘플로 리셋되어도 됨
- 순위 화면으로 가는 UI 없음

### C6. 샘플 데이터 (하드코딩)
- 가상 학교 4~6개 (예: 한빛중, 도담중, 하늘중, 별무리중, 푸른중, 솔빛중)
- 학교당 선수 6~10명 가상 이름
- 경기 8~12경기 (일부 완료, 일부 예정)
- 승점 규칙 표시: 승 3 / 패 0 (또는 세트승패 반영 단순 버전 — 주석으로 명시)
- `src/data/sampleNorthernEdu.ts` 한 파일에 몰아도 됨

---

## D. 권장 정보 구조 / 라우트

```
/                          → Home (카테고리, visibility 필터)
/t/:tournamentId/login     → 코드 로그인
/t/:tournamentId/dashboard → 일정·순위·하이라이트 (admin, school)
/t/:tournamentId/school/:schoolId → 학교 상세 상위 랭커
/t/:tournamentId/score-entry → 기록관 입력
/t/:tournamentId/admin/matches → 관리자 수정/삭제
```

상태: `AuthContext` + `TournamentDataContext`(샘플 복사본을 state로 들고 admin/scorer가 mutate)

---

## E. 구현 순서
1. Vite React-TS 스캐폴드 + Tailwind + Router + 글로벌 스타일
2. Header / MenuCard / ConfirmationModal / Toast / Lock 오버레이
3. config visibility + sample data
4. Auth (3역할 sessionStorage) + ProtectedRoute by role
5. Home → Login → Dashboard
6. School detail + ranking cards (마스킹)
7. Scorer entry + Admin match edit
8. README에 시연용 코드 표 작성

---

## F. 명시적 비범위
- 실제 DB, Firebase, 로그인 서버, PeerJS, QR, YouTube, i18n
- J-IVE 전광판/팀빌더/방송 기능 이식
- 픽셀 퍼펙트·접근성 완전 준수보다 **권한 데모가 명확한지**

---

## G. 완료 기준 (데모 체크리스트)
- [ ] 홈에 **북부교육지원청 배구대회**만 보임 (나머지 2개는 config로 숨김, 라우트는 존재)
- [ ] 관리자 코드 → 전체 이름·수정 화면 진입 가능
- [ ] 학교 코드 → 종합 순위 보임 + 타교 선수 이름 마스킹 + 수정 불가
- [ ] 기록관 코드 → 입력 화면만, 순위 못 봄
- [ ] 디자인: `#1A1A2E` 배경, `#00A3FF` 액센트, 카드/모달/헤더 패턴 준수
- [ ] README에 시연 코드·역할별 경로 표

**다시 강조: 제안·시연용 프로토타입이다. 완성도보다 구조(역할·마스킹·화면 분기)를 명확히 보여주는 데 집중하라. 바로 구현을 시작하라.**
