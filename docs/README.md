# 📦 GitHub Pages 배포 디렉토리

이 디렉토리는 GitHub Pages에 배포될 정적 파일들을 포함합니다.

## 파일 구조

```
docs/
├── index.html          # 랜딩 페이지
├── today.html          # 오늘의 브리핑 (고정 파일)
├── today.mp3           # 오늘의 오디오 (고정 파일)
├── .nojekyll          # Jekyll 비활성화
└── archive/           # 날짜별 아카이브
    └── YYYY/
        └── MM/
            ├── YYYY-MM-DD.html
            └── YYYY-MM-DD.mp3
```

## 자동 생성

이 디렉토리의 파일들은 GitHub Actions에 의해 자동으로 생성됩니다.
- 실행 시간: 매일 07:00 KST
- 워크플로우: `.github/workflows/morning-briefing.yml`

## 접근 URL

- **랜딩 페이지**: `https://[username].github.io/morningbriefv3/`
- **오늘의 브리핑**: `https://[username].github.io/morningbriefv3/today.html`
- **오디오 파일**: `https://[username].github.io/morningbriefv3/today.mp3`

## 주의사항

- 이 디렉토리의 파일들을 수동으로 수정하지 마세요.
- GitHub Actions가 매일 자동으로 덮어씁니다.
- 아카이브 파일은 히스토리 보관용입니다.
