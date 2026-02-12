# 🚀 초기 설정 가이드

이 문서는 Morning Briefing v3를 처음 설정하는 방법을 단계별로 안내합니다.

## 📋 사전 준비사항

- Node.js 20 이상
- Google 계정
- OpenAI API 키
- GitHub 계정
- (선택) OpenWeatherMap API 키

---

## 1️⃣ Google Cloud Console 설정

### 1.1 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 (예: "Morning Briefing")

### 1.2 API 활성화

다음 API들을 활성화하세요:

1. **Google Calendar API**
   - https://console.cloud.google.com/apis/library/calendar-json.googleapis.com

2. **Gmail API**
   - https://console.cloud.google.com/apis/library/gmail.googleapis.com

### 1.3 OAuth2 인증 정보 생성

1. [API 및 서비스 > 사용자 인증 정보](https://console.cloud.google.com/apis/credentials) 이동
2. **사용자 인증 정보 만들기** → **OAuth 클라이언트 ID** 선택
3. 애플리케이션 유형: **데스크톱 앱**
4. 이름: "Morning Briefing OAuth"
5. **만들기** 클릭
6. **클라이언트 ID**와 **클라이언트 보안 비밀번호** 복사

### 1.4 OAuth 동의 화면 설정

1. [OAuth 동의 화면](https://console.cloud.google.com/apis/credentials/consent) 이동
2. 사용자 유형: **외부** 선택 (개인 사용)
3. 앱 이름: "Morning Briefing"
4. 지원 이메일: 본인 이메일
5. **범위 추가 또는 삭제**:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
6. 테스트 사용자에 본인 이메일 추가
7. **저장 후 계속**

---

## 2️⃣ OpenAI API 키 발급

1. [OpenAI Platform](https://platform.openai.com/api-keys) 접속
2. **Create new secret key** 클릭
3. 이름: "Morning Briefing"
4. 생성된 API 키 복사 (한 번만 표시됨!)

---

## 3️⃣ OpenWeatherMap API 키 발급 (선택)

1. [OpenWeatherMap](https://openweathermap.org/api) 접속
2. 무료 플랜 가입
3. API Keys 메뉴에서 키 복사

---

## 4️⃣ 로컬 환경 설정

### 4.1 저장소 클론 및 설치

```bash
git clone https://github.com/your-username/morningbriefv3.git
cd morningbriefv3
npm install
```

### 4.2 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 입력:

```env
# Google OAuth2
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REFRESH_TOKEN=  # 다음 단계에서 발급

# OpenAI
OPENAI_API_KEY=sk-your-api-key-here

# Weather (선택)
WEATHER_API_KEY=your_weather_api_key_here

# Email
EMAIL_FROM=your-email@gmail.com
EMAIL_TO=your-email@gmail.com

# GitHub Pages (나중에 설정)
PAGES_URL=https://your-username.github.io/morningbriefv3
```

### 4.3 Google Refresh Token 발급

```bash
npm run get-token
```

1. 브라우저가 자동으로 열립니다
2. Google 계정으로 로그인
3. 권한 요청 승인
4. 터미널에 표시되는 `REFRESH_TOKEN` 복사
5. `.env` 파일의 `GOOGLE_REFRESH_TOKEN`에 붙여넣기

### 4.4 로컬 테스트

```bash
npm start
```

정상 실행되면:
- 이메일 수신 확인
- `docs/today.html` 파일 생성 확인
- `docs/today.mp3` 파일 생성 확인

---

## 5️⃣ GitHub 저장소 설정

### 5.1 저장소 생성

1. GitHub에서 새 저장소 생성
2. 이름: `morningbriefv3` (또는 원하는 이름)
3. Public 또는 Private 선택
4. 로컬 저장소와 연결:

```bash
git remote add origin https://github.com/your-username/morningbriefv3.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 5.2 GitHub Secrets 설정

1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** 클릭하여 다음 Secret들 추가:

| Secret 이름 | 값 |
|-------------|-----|
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 보안 비밀번호 |
| `GOOGLE_REFRESH_TOKEN` | 발급받은 Refresh Token |
| `OPENAI_API_KEY` | OpenAI API 키 |
| `WEATHER_API_KEY` | OpenWeatherMap API 키 |
| `EMAIL_FROM` | 발신 이메일 |
| `EMAIL_TO` | 수신 이메일 |
| `PAGES_URL` | `https://[username].github.io/morningbriefv3` |

### 5.3 GitHub Pages 활성화

1. GitHub 저장소 → **Settings** → **Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `main` / `docs`
4. **Save** 클릭
5. 5~10분 후 `https://[username].github.io/morningbriefv3/` 접속 확인

### 5.4 Actions 권한 설정

1. GitHub 저장소 → **Settings** → **Actions** → **General**
2. **Workflow permissions**:
   - **Read and write permissions** 선택
   - **Allow GitHub Actions to create and approve pull requests** 체크
3. **Save** 클릭

---

## 6️⃣ GitHub Actions 테스트

### 수동 실행

1. GitHub 저장소 → **Actions** 탭
2. **Morning Briefing** 워크플로우 선택
3. **Run workflow** 클릭
4. 실행 결과 확인

### 자동 실행 확인

다음 날 07:00 KST에 자동으로 실행됩니다.

---

## 7️⃣ iPhone 단축어 설정

### 7.1 단축어 생성

1. iPhone **단축어** 앱 실행
2. **자동화** 탭 → **+** 버튼
3. **개인용 자동화 생성**
4. **특정 시간** 선택
5. 시간: **07:02**, 반복: **매일**

### 7.2 액션 추가

1. **작업 추가**
2. **URL 열기** 선택
3. URL: `https://[username].github.io/morningbriefv3/today.mp3`
4. (선택) **재생/일시정지** 액션 추가

### 7.3 자동 실행 설정

1. **실행 전에 묻기** 토글 **OFF**
2. **완료** 클릭

### 7.4 테스트

1. 생성된 자동화 선택
2. **테스트** 버튼 클릭
3. 오디오가 자동 재생되는지 확인

---

## 8️⃣ 최종 확인 체크리스트

- [ ] Google Calendar API 활성화
- [ ] Gmail API 활성화
- [ ] OAuth2 인증 정보 생성
- [ ] OpenAI API 키 발급
- [ ] 로컬 테스트 성공
- [ ] GitHub Secrets 설정 완료
- [ ] GitHub Pages 배포 확인
- [ ] GitHub Actions 수동 실행 성공
- [ ] iPhone 단축어 설정 완료
- [ ] 자동 실행 테스트 완료

---

## ⚠️ 문제 해결

### Google OAuth2 에러

**에러**: `invalid_grant` 또는 `Token has been expired or revoked`

**해결**:
1. `npm run get-token` 다시 실행
2. 새 Refresh Token을 `.env` 및 GitHub Secrets에 업데이트

### OpenAI API 에러

**에러**: `You exceeded your current quota`

**해결**:
1. [OpenAI Billing](https://platform.openai.com/account/billing) 에서 크레딧 충전
2. 또는 API 키를 재발급하여 무료 크레딧 사용

### GitHub Actions 실패

**에러**: `Permission denied`

**해결**:
1. Settings → Actions → General → Workflow permissions
2. "Read and write permissions" 선택

### 오디오가 재생되지 않음

**해결**:
1. Safari에서 직접 URL 접속하여 테스트
2. iPhone 설정 → 단축어 → "자동화 실행 허용" 활성화
3. Do Not Disturb 모드 해제

---

## 📞 도움이 필요하신가요?

- [GitHub Issues](https://github.com/your-username/morningbriefv3/issues)
- [README.md](./README.md) 참고

---

**설정이 완료되었습니다! 🎉**

이제 매일 아침 07:00에 자동으로 브리핑을 받으실 수 있습니다.
