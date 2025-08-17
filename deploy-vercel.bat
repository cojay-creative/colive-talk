@echo off
echo 🚀 Vercel 배포 시작...

echo.
echo 1️⃣ Vercel CLI 설치 중...
npm install -g vercel

echo.
echo 2️⃣ 프로젝트 빌드 테스트...
npm run build

if %ERRORLEVEL% neq 0 (
    echo ❌ 빌드 실패! 오류를 확인하세요.
    pause
    exit /b 1
)

echo.
echo ✅ 빌드 성공!

echo.
echo 3️⃣ Vercel 배포 실행...
echo 처음 실행시 Vercel 로그인이 필요합니다.
vercel --prod

echo.
echo 🎉 배포 완료!
echo 배포된 URL을 확인하세요.
pause