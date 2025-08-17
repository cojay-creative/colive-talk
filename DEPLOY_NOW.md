# 🚀 지금 바로 배포하기!

## ⚡ **가장 빠른 방법 (3분 완료)**

### **Windows 명령 프롬프트 방법:**

1. **Win + R** 누르고 `cmd` 입력해서 명령 프롬프트 열기

2. **프로젝트 폴더로 이동:**
```cmd
cd "L:\code\코라이브 톡"
```

3. **Vercel CLI 설치:**
```cmd
npm install -g vercel
```

4. **바로 배포:**
```cmd
vercel --prod
```

### **PowerShell 방법:**

1. **Win + X** 누르고 **PowerShell** 선택

2. **스크립트 실행:**
```powershell
cd "L:\code\코라이브 톡"
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\deploy-vercel.ps1
```

### **VS Code 터미널 방법:**

1. **VS Code에서 프로젝트 열기**

2. **터미널 열기:** `Ctrl + ` (백틱)

3. **배포 명령어:**
```bash
npm install -g vercel
vercel --prod
```

---

## 📋 **배포 과정에서 나오는 질문들**

```
? Set up and deploy "L:\code\코라이브 톡"? 
→ Y (엔터)

? Which scope do you want to deploy to? 
→ 본인 계정 선택 (화살표키로 선택 후 엔터)

? Link to existing project? 
→ N (새 프로젝트)

? What's your project's name? 
→ colive-talk (원하는 이름 입력)

? In which directory is your code located? 
→ ./ (현재 폴더, 그냥 엔터)
```

---

## ✅ **배포 성공 시 나타나는 화면**

```
✅ Production: https://colive-talk-abc123.vercel.app [2s]
📝 Deployed to production. Run `vercel --prod` to overwrite later.
💡 To change the domain or build command, go to https://vercel.com/your-username/colive-talk/settings
```

---

## 🎯 **배포 완료 후 할 일**

### **1. URL 접속 테스트**
- 제공된 URL 클릭 또는 복사해서 브라우저에서 열기
- 예: `https://colive-talk-abc123.vercel.app`

### **2. 기능 테스트**
1. **마이크 권한 허용** 클릭
2. **🎤 음성 인식 시작** 버튼 클릭  
3. **말하기** → 실시간 번역 확인
4. **📺 자막 오버레이** 열기 → 위치/색상 조정

### **3. 모바일 테스트**
- 스마트폰에서도 동일한 URL 접속
- 모든 기능이 정상 작동하는지 확인

---

## 🔧 **문제 해결**

### **"vercel command not found" 오류**
```cmd
# Node.js 재설치
# https://nodejs.org에서 LTS 버전 다운로드
npm install -g vercel
```

### **권한 오류 (PowerShell)**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### **빌드 오류**
```cmd
# 로컬에서 먼저 테스트
npm install
npm run build
```

---

## 🎉 **지금 바로 시작하세요!**

**명령 프롬프트 열고 이 세 줄만 실행:**

```cmd
cd "L:\code\코라이브 톡"
npm install -g vercel
vercel --prod
```

**5분 후 전 세계에서 접속 가능한 실시간 번역 서비스 완성! 🌍**