# PowerShell Vercel 배포 스크립트
Write-Host "🚀 코라이브톡 Vercel 배포 시작!" -ForegroundColor Green
Write-Host ""

# 현재 위치 확인
Write-Host "📁 현재 경로: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# 1단계: Vercel CLI 설치
Write-Host "1️⃣ Vercel CLI 설치 중..." -ForegroundColor Cyan
try {
    npm install -g vercel
    Write-Host "✅ Vercel CLI 설치 완료!" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI 설치 실패: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2단계: 의존성 설치
Write-Host "2️⃣ 의존성 설치 확인..." -ForegroundColor Cyan
if (!(Test-Path "node_modules")) {
    Write-Host "📦 의존성 설치 중..."
    try {
        npm install
        Write-Host "✅ 의존성 설치 완료!" -ForegroundColor Green
    } catch {
        Write-Host "❌ 의존성 설치 실패: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ 의존성이 이미 설치되어 있습니다." -ForegroundColor Green
}

Write-Host ""

# 3단계: 빌드 테스트
Write-Host "3️⃣ 빌드 테스트 중..." -ForegroundColor Cyan
try {
    npm run build
    Write-Host "✅ 빌드 성공!" -ForegroundColor Green
} catch {
    Write-Host "❌ 빌드 실패: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "빌드 오류를 수정한 후 다시 시도해주세요." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 4단계: Vercel 배포
Write-Host "4️⃣ Vercel 배포 시작..." -ForegroundColor Cyan
Write-Host "⚠️  처음 실행 시 브라우저에서 Vercel 로그인이 필요합니다." -ForegroundColor Yellow
Write-Host ""

try {
    vercel --prod
    Write-Host ""
    Write-Host "🎉 배포 완료!" -ForegroundColor Green
    Write-Host "📱 브라우저에서 제공된 URL로 접속하여 테스트해주세요." -ForegroundColor Cyan
} catch {
    Write-Host "❌ 배포 실패: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "다음 명령어로 수동 배포를 시도해보세요:" -ForegroundColor Yellow
    Write-Host "vercel --prod" -ForegroundColor White
}

Write-Host ""
Write-Host "✨ 배포 스크립트 완료!" -ForegroundColor Green
Write-Host "문제가 있으면 수동으로 'vercel --prod' 명령어를 실행해주세요." -ForegroundColor Yellow