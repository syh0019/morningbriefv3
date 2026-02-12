# 🌅 Morning Briefing v3

매일 아침 07:00 KST에 자동으로 생성되는 개인 맞춤형 모닝 브리핑 시스템

## 📋 주요 기능

- ☀️ **일일 브리핑 자동 생성**
  - Google Calendar 일정 (오늘 + 내일)
  - 날씨 정보
  - Google News RSS 뉴스 요약 (투자/거시 중심)
  - Gmail 미읽음 메일 요약 (5줄 요약 / 상세 요약 선택 가능)

- 📧 **3가지 출력 형식**
  - 이메일 (HTML)
  - 웹 페이지 (today.html)
  - 오디오 파일 (today.mp3, 3~5분 분량)

- 🚀 **자동 배포**
  - GitHub Actions로 매일 자동 실행
  - GitHub Pages로 정적 호스팅
  - 고정 URL로 접근 가능

- 📱 **모바일 최적화**
  - iPhone 단축어 자동 재생 지원
  - 모바일 Safari 완벽 호환

---

## 🏗️ 시스템 구조

```
┌─────────────────────────────────────────────────┐
│         GitHub Actions (Cron Trigger)           │
│          매일 07:00 KST (22:00 UTC)              │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│            데이터 수집 (병렬)                    │
├─────────────────────────────────────────────────┤
│  • Google Calendar API                          │
│  • OpenWeatherMap API                           │
│  • Google News RSS                              │
│  • Gmail API                                    │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│           OpenAI 요약 생성                       │
├─────────────────────────────────────────────────┤
│  • GPT-4o-mini (뉴스 요약)                      │
│  • 투자/거시 시황 중심 포맷                      │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│           3가지 출력 생성                        │
├─────────────────────────────────────────────────┤
│  1. 이메일 HTML (Gmail API 발송)                │
│  2. 웹 페이지 (docs/today.html)                 │
│  3. 오디오 (docs/today.mp3, OpenAI TTS)         │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│         GitHub Pages 자동 배포                   │
├─────────────────────────────────────────────────┤
│  • https://[username].github.io/morningbriefv3/ │
│  • /today.html (웹 페이지)                      │
│  • /today.mp3 (오디오 파일)                     │
│  • /archive/ (날짜별 아카이브)                  │
└─────────────────────────────────────────────────┘
```

---

## 🚀 빠른 시작

### 1. 저장소 클론 및 설치

```bash
git clone https://github.com/your-username/morningbriefv3.git
cd morningbriefv3
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 아래 내용을 추가하세요:

```env
# Google OAuth2
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token

# OpenAI API
OPENAI_API_KEY=sk-your-api-key

# Weather API (OpenWeatherMap)
WEATHER_API_KEY=your_weather_api_key

# Email
EMAIL_FROM=your-email@gmail.com
TO_EMAILS=recipient@example.com

# GitHub Pages URL
PAGES_URL=https://your-username.github.io/morningbriefv3
```

### 3. Google OAuth2 토큰 발급

```bash
npm run get-token
```

브라우저가 열리면 Google 계정으로 로그인하고 권한을 승인합니다.
생성된 `GOOGLE_REFRESH_TOKEN`을 `.env` 파일에 추가하세요.

### 4. 로컬 테스트

```bash
# 전체 브리핑 실행
npm start

# Gmail 요약 기능만 테스트
npm run test:email
```

### 5. GitHub Secrets 설정

GitHub 저장소 → Settings → Secrets and variables → Actions에서 다음 Secret들을 추가:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `OPENAI_API_KEY`
- `WEATHER_API_KEY`
- `EMAIL_FROM`
- `TO_EMAILS`
- `PAGES_URL`

### 6. GitHub Pages 활성화

GitHub 저장소 → Settings → Pages:
- **Source**: Deploy from a branch
- **Branch**: main / docs
- **Save** 클릭

---

## ⏰ GitHub Actions 스케줄

### Cron 표현식

```yaml
schedule:
  - cron: '0 22 * * *'  # UTC 22:00 = KST 07:00 (다음날)
```

### 시간대 변환

| 지역 | 시간 | UTC |
|------|------|-----|
| 한국 (KST) | 07:00 | 22:00 (전날) |
| 일본 (JST) | 07:00 | 22:00 (전날) |
| 미국 동부 (EST) | 07:00 | 12:00 |
| 미국 서부 (PST) | 07:00 | 15:00 |

### 수동 실행

GitHub Actions 탭에서 `workflow_dispatch`를 통해 수동으로 실행할 수 있습니다.

---

## 🎧 OpenAI TTS 오디오 생성

### TTS 모델

- **모델**: `tts-1` (빠른 생성) 또는 `tts-1-hd` (고품질)
- **음성**: `alloy` (중성적, 뉴스 앵커 톤)
- **속도**: 1.0x (기본)
- **언어**: 한국어 자동 인식

### 오디오 스크립트 구성

오디오는 3~5분 분량으로 제한되며, 다음 내용을 포함합니다:

1. **날짜 및 인사**
2. **날씨** (간략히)
3. **일정** (제목만, 상세 메모 제외 - 보안)
4. **뉴스 브리핑**
   - Macro Dashboard
   - Top Drivers (상위 3개)
   - 카테고리별 한 줄 요약
5. **마무리 인사**

### 파일 크기 및 길이

- 평균 파일 크기: 3~5 MB
- 예상 재생 시간: 3~5분
- 비트레이트: 64 kbps (모바일 최적화)

---

## 📱 iPhone 단축어 설정 가이드

### 1. 단축어 앱 실행

iPhone에서 **단축어(Shortcuts)** 앱을 실행합니다.

### 2. 자동화 생성

1. 하단의 **자동화** 탭 선택
2. 오른쪽 상단의 **+** 버튼 클릭
3. **개인용 자동화 생성** 선택

### 3. 시간 트리거 설정

1. **특정 시간** 선택
2. 시간 설정: **07:02**
3. 반복: **매일**
4. **다음** 클릭

### 4. 액션 추가

#### 액션 1: URL 열기
1. **작업 추가** 버튼 클릭
2. 검색창에 **"URL"** 입력
3. **URL 열기** 선택
4. URL 입력: `https://your-username.github.io/morningbriefv3/today.mp3`

#### 액션 2: 오디오 재생 (선택)
1. **작업 추가** 버튼 클릭
2. 검색창에 **"재생"** 입력
3. **재생/일시정지** 선택

### 5. 실행 전에 묻기 비활성화

1. **다음** 클릭
2. **실행 전에 묻기** 토글을 **OFF**로 설정
3. **완료** 클릭

### 6. 테스트

1. 생성된 자동화를 선택
2. **테스트** 버튼 클릭
3. 오디오가 정상적으로 재생되는지 확인

### 7. 문제 해결

**오디오가 재생되지 않는 경우:**
- Safari에서 직접 URL 접속하여 오디오가 정상적으로 재생되는지 확인
- iPhone 설정 → 단축어 → 개인용 자동화 실행 허용 확인
- Do Not Disturb 모드가 꺼져있는지 확인

**자동 실행이 안 되는 경우:**
- iPhone 설정 → 단축어 → 고급 → "자동화 실행 허용" 활성화
- iPhone이 잠금 상태에서도 실행되도록 설정

---

## 📊 출력 파일 구조

```
docs/
├── index.html          # 랜딩 페이지
├── today.html          # 오늘의 브리핑 (고정 파일)
├── today.mp3           # 오늘의 오디오 (고정 파일)
├── .nojekyll          # Jekyll 비활성화
├── CNAME              # 커스텀 도메인 (선택)
└── archive/           # 날짜별 아카이브
    └── 2026/
        └── 02/
            ├── 2026-02-12.html
            └── 2026-02-12.mp3
```

### 고정 URL

- 웹 페이지: `https://[username].github.io/morningbriefv3/today.html`
- 오디오: `https://[username].github.io/morningbriefv3/today.mp3`
- 인덱스: `https://[username].github.io/morningbriefv3/`

매일 새로운 브리핑이 생성되면 기존 파일을 덮어씁니다.
날짜별 아카이브는 `/archive/YYYY/MM/YYYY-MM-DD.html` 형식으로 저장됩니다.

---

## 🔐 보안 및 프라이버시

### 민감 정보 보호

1. **일정 정보**: 오디오에는 일정 제목만 포함, 상세 메모 제외
2. **이메일 내용**: 요약본만 포함, 전체 내용 제외
3. **API 키**: GitHub Secrets로 관리, 로그에 노출 금지
4. **로그 출력**: 텍스트 전문 출력 금지, 길이만 표시

### CORS 설정

GitHub Pages는 기본적으로 CORS를 허용하므로, 모바일 Safari에서도 문제없이 오디오 재생이 가능합니다.

---

## 🛠️ 개발 가이드

### 프로젝트 구조

```
morningbriefv3/
├── src/
│   ├── auth/                 # Google OAuth2 인증
│   │   ├── googleOAuth.js
│   │   └── getRefreshToken.js
│   ├── services/             # 외부 서비스 연동
│   │   ├── calendar.js       # Google Calendar
│   │   ├── gmail.js          # Gmail
│   │   ├── news.js           # Google News RSS
│   │   ├── openai.js         # OpenAI (요약)
│   │   ├── tts.js            # OpenAI TTS (오디오)
│   │   └── weather.js        # 날씨
│   ├── email/                # 이메일 관련
│   │   ├── template.js       # HTML 템플릿
│   │   └── sender.js         # Gmail 발송
│   ├── output/               # 출력 파일 생성
│   │   ├── webTemplate.js    # 웹 HTML
│   │   └── generator.js      # 통합 생성기
│   ├── utils/                # 유틸리티
│   │   ├── dateUtils.js      # 날짜/시간
│   │   └── logger.js         # 로깅
│   └── index.js              # 메인 실행
├── .github/
│   └── workflows/
│       └── morning-briefing.yml  # GitHub Actions
├── docs/                     # GitHub Pages 배포
├── package.json
└── README.md
```

### 커스터마이징

#### 1. 뉴스 카테고리 변경

`src/services/news.js`에서 RSS 피드 URL을 수정:

```javascript
const RSS_FEEDS = {
  'KR 정책': 'https://news.google.com/rss/search?q=...',
  'Tech': 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtdG...',
  // 추가 카테고리...
};
```

#### 2. 오디오 음성 변경

`src/services/tts.js`에서 voice 파라미터 수정:

```javascript
const mp3Response = await client.audio.speech.create({
  model: 'tts-1',
  voice: 'nova',  // alloy, echo, fable, onyx, nova, shimmer
  input: script,
});
```

#### 3. 이메일 스타일 수정

`src/email/template.js`의 CSS를 직접 수정하여 디자인 변경 가능.

#### 4. 스케줄 변경

`.github/workflows/morning-briefing.yml`의 cron 표현식 수정:

```yaml
schedule:
  - cron: '30 21 * * *'  # UTC 21:30 = KST 06:30
```

#### 5. Gmail 요약 방식 변경

`.env` 파일에 다음 환경변수를 추가:

```env
# Gmail 요약 방식 선택
GMAIL_BRIEF_SUMMARY=true   # 5줄 간결 요약 (기본값)
GMAIL_BRIEF_SUMMARY=false  # 상세 요약 (액션 아이템 포함)
```

**5줄 요약 (기본값):**
- 가장 중요한 메일 5개를 한 줄씩 요약
- 빠르게 훑어보기 좋음
- 토큰 사용량 적음 (~500 tokens)

**상세 요약:**
- 각 메일의 액션 아이템 포함 (Reply/Review/Track/Ignore)
- 긴급/중요 메일 Top 3 강조
- 더 자세한 정보 제공 (~2,000 tokens)

**테스트:**

```bash
# 두 가지 요약 방식을 모두 볼 수 있음
npm run test:email
```

---

## ⚠️ 에러 처리

### 오디오 생성 실패

오디오 생성이 실패해도 이메일은 정상 발송됩니다.
이메일에는 "오디오로 듣기" 버튼이 표시되지 않습니다.

### 데이터 수집 실패

일부 데이터 수집(날씨, 일정 등)이 실패해도 나머지 데이터로 브리핑을 생성합니다.

### 배포 실패

배포가 실패하면 GitHub Actions 워크플로우가 실패 상태로 표시되며,
`notify-failure` 작업이 실행됩니다.

---

## 📝 API 사용량 및 비용

### OpenAI API

- **GPT-4o-mini**: 뉴스 요약 + 이메일 요약
  - 예상 토큰: 5,000~10,000 tokens/day
  - 비용: ~$0.01/day

- **TTS-1**: 오디오 생성
  - 예상 길이: 2,000~3,000 characters
  - 비용: ~$0.03/day

**월 예상 비용**: ~$1.20

### Google Calendar/Gmail API

- 무료 (개인 사용)

### OpenWeatherMap API

- 무료 플랜: 1,000 calls/day (충분)

---

## 🤝 기여 방법

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 라이선스

MIT License

---

## 🙏 감사의 말

- [OpenAI](https://openai.com/) - GPT-4 & TTS
- [Google APIs](https://developers.google.com/) - Calendar, Gmail, News
- [OpenWeatherMap](https://openweathermap.org/) - Weather API
- [GitHub Actions](https://github.com/features/actions) - 자동화
- [GitHub Pages](https://pages.github.com/) - 호스팅

---

## 📞 문의

문제가 발생하거나 개선 제안이 있으시면 [Issues](https://github.com/your-username/morningbriefv3/issues)를 생성해주세요.

---

**Made with ❤️ by AI & Human**
