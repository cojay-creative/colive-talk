# ⚡ 5분 만에 Vercel 배포

## 🚀 **가장 빠른 방법**

### **Windows 사용자:**
```batch
# 명령 프롬프트(cmd)에서 실행
cd "L:\code\코라이브 톡"
npm install -g vercel
vercel --prod
```

### **PowerShell 사용자:**
```powershell
# PowerShell에서 실행
cd "L:\code\코라이브 톡"
npm install -g vercel
vercel --prod
```

### **VS Code 터미널에서:**
```bash
# VS Code 터미널에서 실행
npm install -g vercel
vercel --prod
```

## 📋 **단계별 안내**

### **1단계: 터미널 열기**
- Windows: `Win + R` → `cmd` 입력
- VS Code: `Ctrl + ` (백틱)

### **2단계: 프로젝트 폴더로 이동**
```bash
cd "L:\code\코라이브 톡"
```

### **3단계: Vercel CLI 설치**
```bash
npm install -g vercel
```

### **4단계: 배포 실행**
```bash
vercel --prod
```

### **5단계: 로그인 (처음만)**
- 브라우저가 자동으로 열림
- GitHub/Google/이메일로 로그인
- 인증 완료 후 터미널로 돌아옴

### **6단계: 배포 설정**
```
? Set up and deploy "L:\code\코라이브 톡"? [Y/n] Y
? Which scope do you want to deploy to? [선택]
? Link to existing project? [N/y] n
? What's your project's name? colive-talk
? In which directory is your code located? ./
```

### **7단계: 완료! 🎉**
```
✅ Deployed to production
🔗 https://colive-talk-xxx.vercel.app
```

## 🔄 **다음 배포부터는 더 간단**

```bash
# 프로젝트 폴더에서
vercel --prod

# 또는
npm run deploy:vercel
```

## 🌐 **배포된 사이트 확인**

1. **제공된 URL 접속**
2. **마이크 권한 허용**
3. **음성 인식 테스트**
4. **번역 기능 확인**

## 🛠️ **문제 발생 시**

### **오류: "command not found: vercel"**
```bash
# Node.js 재설치 필요
# https://nodejs.org에서 최신 버전 다운로드
```

### **오류: "permission denied"**
```bash
# 관리자 권한으로 터미널 실행
# 또는 npx 사용
npx vercel --prod
```

### **빌드 오류**
```bash
# 로컬 빌드 테스트
npm run build

# 오류 확인 후 수정
```

## 🎯 **예상 시간**
- **최초 배포**: 5-10분
- **재배포**: 2-3분
- **GitHub 연동 후**: 30초 (자동)