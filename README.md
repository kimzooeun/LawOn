# ⚖️ LawOn
### AI 기반 이혼 상담 챗봇 서비스

> 이혼 관련 고민을 **익명으로 상담**하고  
> AI가 상황에 맞는 **법률 정보와 상담 방향**을 제시하는 서비스

---

## 📌 About Project

이혼 상담은 개인적인 문제로 인해 **심리적 진입 장벽이 높은 분야**입니다.  

LawOn은 사용자가 부담 없이 고민을 이야기할 수 있도록  
**AI 챗봇을 활용한 익명 상담 환경**을 제공합니다.

AI는 사용자의 상황을 분석하여

- 관련 **법률 정보 제공**
- **상담 방향 제시**
- 상황에 따른 **추가 질문 유도**

등을 수행합니다.

---

## 🛠 Tech Stack

### Backend
- Java
- Spring Boot
- Spring Security
- JPA / Hibernate

### AI Server
- Python
- FastAPI
- OpenAI API

### Database / Cache
- MySQL
- Redis

### DevOps
- Docker
- Docker Compose

### Collaboration
- GitHub
- Notion
- Figma

---

## 🧩 Key Features

### 🤖 AI 법률 상담 챗봇
- OpenAI API 기반 대화형 상담 기능
- 사용자 상황을 분석하여 법률 정보 제공

### 🧠 Prompt Engineering
- 상담 흐름을 제어하기 위한 Prompt Template 설계
- 상황 기반 응답 구조 설계

```
사용자 상황 분석
→ 관련 법률 정보 제공
→ 상담 방향 제시
→ 추가 질문 유도
```

### ⚡ Redis 기반 대화 상태 관리
- 상담 진행 중 대화 맥락 유지
- 사용자별 상담 세션 관리

### 🔐 인증 및 사용자 관리
- Spring Security 기반 로그인 및 인증
- 사용자 상담 기록 관리

---

## 🏗 System Architecture

```
Client (Frontend)
      │
      ▼
Spring Boot API
      │
      ├── MySQL (회원 / 상담 기록)
      │
      ├── Redis (대화 상태 관리)
      │
      ▼
FastAPI Server
      │
      ▼
OpenAI API
```

---

## 📂 Project Structure

```
LAWON
│
├── backend                # Spring Boot API 서버
│   ├── src/main/java/com/principal/chatbot
│   │   ├── admin
│   │   ├── alert
│   │   ├── config
│   │   ├── content
│   │   ├── counsel
│   │   ├── dto
│   │   ├── exception
│   │   ├── member
│   │   ├── oauth2
│   │   └── security
│   │
│   └── resources
│
├── frontend/front         # 사용자 웹 서비스
│
├── fastapi                # AI 챗봇 서버
│
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

---

## 🎯 What I Learned

이 프로젝트를 통해

- AI API 기반 **서비스 설계 경험**
- Prompt Engineering을 통한 **응답 품질 개선**
- Redis 기반 **대화 상태 관리**
- Spring Boot 기반 **REST API 설계 및 구현**

을 경험할 수 있었습니다.

---

## 🚀 Future Improvements

- 법률 데이터 기반 **RAG 검색 시스템 도입**
- 상담 유형 자동 분류 모델
- 실제 법률 상담 연결 기능
- 상담 데이터 분석 기능

---

## 👩‍💻 Developer

**김주은**

Backend Developer

Email  
asdo6863@naver.com
