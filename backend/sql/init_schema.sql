CREATE DATABASE IF NOT EXISTS lawcounsel_db
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE lawcounsel_db;

ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'principalC';
FLUSH PRIVILEGES;
SET FOREIGN_KEY_CHECKS=0;


-- 사용자 정보 테이블
CREATE TABLE users (
    user_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(100) NOT NULL UNIQUE,				-- 아이디
    display_name VARCHAR(50) NOT NULL,					-- 별칭
    password VARCHAR(255) NOT NULL,						-- 비밀번호
    user_role ENUM('USER', 'ADMIN') DEFAULT 'USER',
    
    social_provider VARCHAR(50) DEFAULT NULL,			-- 로컬/소셜 
    social_id VARCHAR(255) DEFAULT NULL UNIQUE,
    profile_image_url VARCHAR(255) DEFAULT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- 상담 세션 테이블
CREATE TABLE counselling_session (
    session_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT DEFAULT NULL,
    
    start_time  DATETIME NOT NULL,						-- 상담 시작 시간
    end_time DATETIME DEFAULT NULL,						-- 상담 종료 시간
    last_message_time DATETIME DEFAULT NULL,  			-- 마지막 메세지 시간
    

    -- 세션 길이 (챗봇 메시지 시각 → 타임아웃 판단 가능)
    duration_sec INT GENERATED ALWAYS AS (
        CASE
            WHEN end_time IS NOT NULL   
                THEN TIMESTAMPDIFF(SECOND, start_time, end_time)
            ELSE NULL
        END
    ) STORED


    completion_status ENUM('ONGOING', 'COMPLETED', 'TIMEOUT') DEFAULT 'ONGOING' NOT NULL, 		-- 상담 진행 상태 (시작, 종료, 타임아웃)

    summary_title TEXT DEFAULT NULL,					-- 상담 제목 (첫발화로 ai가 상담 제목 작성)
    summary TEXT DEFAULT NULL,							-- 상담 내용 요약 (타임아웃 상태의 상담들 ai가 상담 요약)
	-- context_snapshot JSON DEFAULT NULL,                 -- 상담 대화 맥락 (레디스 저장) 

    resume_token VARCHAR(100) DEFAULT NULL,             -- 재개용 토큰 (사용자가 이어서 대화할 때)

--    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL                           
);


-- 상담 콘텐츠
CREATE TABLE counselling_content (
    content_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT DEFAULT NULL,
    
    sender ENUM('PERSON', 'CHATBOT') NOT NULL,			-- 보낸이
    content TEXT NOT NULL,								-- 텍스트

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES counselling_session(session_id) ON DELETE CASCADE
);


-- 키워드 분석 결과
CREATE TABLE keyword_analysis (
    analysis_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT DEFAULT NULL,
    content_id BIGINT DEFAULT NULL UNIQUE,
    
    -- [분류 모델 결과]
    is_divorce BOOLEAN DEFAULT NULL,					-- 문맥 키워드
    emotion_label VARCHAR(50) DEFAULT NULL,				-- 감정 키워드 (다중)
	topic VARCHAR(50) DEFAULT NULL,						-- 주제 키워드
	intent VARCHAR(50) DEFAULT NULL,					-- 의도 키워드
	situation VARCHAR(50) DEFAULT NULL,					-- 상황 키워드
	
	-- [검색 모델 결과]
    retrieved_data JSON DEFAULT NULL,					-- 질의응답, 판례/법률 결과
    
    analysis_time DATETIME DEFAULT CURRENT_TIMESTAMP,	-- 분석 시간
    alert_triggered BOOLEAN DEFAULT FALSE,  			-- 위기 감정 발생 여부             
    
--    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES counselling_session(session_id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES counselling_content(content_id) ON DELETE CASCADE   
);


-- 위기 알림 테이블
CREATE TABLE crisis_alert (
    alert_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT DEFAULT NULL, 
    session_id BIGINT DEFAULT NULL,                         
    analysis_id BIGINT DEFAULT NULL,   
    
    alert_severity ENUM('LOW', 'MEDIUM', 'HIGH', 'DANGER') DEFAULT 'LOW', 	-- 감정 심각도 (낮음, 중간, 높음, 위험)
    alert_status ENUM('PENDING', 'RESOLVED') DEFAULT 'PENDING' NOT NULL,   -- 위기 대응 상태 (감지, 완료)

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (session_id) REFERENCES counselling_session(session_id) ON DELETE CASCADE,
    FOREIGN KEY (analysis_id) REFERENCES keyword_analysis(analysis_id) ON DELETE CASCADE
);


-- 변호사 정보 테이블
CREATE TABLE lawyers(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(50) NOT NULL,                          -- 변호사 이름
    gender VARCHAR(10) DEFAULT NULL,                    -- 성별 (M/F/기타 문자열)

    detailSpecialty VARCHAR(200) DEFAULT NULL,          -- 세부 전문 분야
    description VARCHAR(1000) DEFAULT NULL,             -- 소개/설명

    contact VARCHAR(50) DEFAULT NULL,                   -- 연락처
    office VARCHAR(100) DEFAULT NULL,                   -- 소속 로펌/사무실명
    officeLocation VARCHAR(100) DEFAULT NULL,           -- 사무실 위치

    imageUrl VARCHAR(255) DEFAULT NULL,                 -- 프로필 이미지 URL
)


- 시스템 설정 테이블 (SystemSetting 엔티티)
CREATE TABLE system_settings(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    keyName VARCHAR(100) NOT NULL UNIQUE,               -- 설정 키 (예: THEME, AUTO_BACKUP 등)
    value TEXT DEFAULT NULL                             -- 설정 값 (JSON/String 등 자유롭게)
)


- 시스템 통계 테이블(SystemStat 엔티티)
CREATE TABLE system_status(
    -- @Id만 있고 @GeneratedValue 없음 → 애플리케이션에서 id 직접 관리 (보통 1 고정)
    id BIGINT NOT NULL PRIMARY KEY,
    total_counsel_count BIGINT DEFAULT 0                -- 전체 상담 건수
)


-- 인덱스 구성 
-- user_id + start time DESC -> 사용자 상담 이력 보기 복합 인덱스로 잡아서 정렬 비용 커버 
CREATE INDEX idx_session_user_start 
    ON counselling_session (user_id, start_time DESC);

-- 관리자 대시보드에서, 타임아웃/진행중/완료 필터링하면서 시간 순 정렬 -> 복합 인덱스 최적화 필요 
CREATE INDEX idx_session_status_start 
    ON counselling_session (completion_status, start_time DESC);

-- 상담 메시지, 즉 상담 콘텐츠 테이블은 개수가 제일 빨리 쌓이니까 
CREATE INDEX idx_content_session_created
    ON counselling_content (session_id, created_at);

-- 키워드 분석 테이블 > 세션별 분석 조회, 메시지별 분석 조회, 위기 탐지
-- 메시지 -> 분석 1:1 조회에서 절대적으로 사용 
CREATE INDEX idx_analysis_content
    ON keyword_analysis (content_id);

-- 세션 전체 분석 조회할 때 사용됨
CREATE INDEX idx_analysis_session 
    ON keyword_analysis (session_id);

-- 관리자 페이지에서 키워드 분석 테이블에서의 alert_triggered = TRUE 일때, 확인 할 수도 있음
CREATE INDEX idx_analysis_alert 
    ON keyword_analysis (alert_triggered, analysis_time);

-- 위기 알림

CREATE INDEX idx_alert_user_created 
    ON crisis_alert (user_id, created_at DESC);

CREATE INDEX idx_alert_status_created 
    ON crisis_alert (alert_status, created_at DESC);

CREATE INDEX idx_alert_severity_created 
    ON crisis_alert (alert_severity, created_at DESC);

CREATE INDEX idx_alert_session 
    ON crisis_alert (session_id);



SET FOREIGN_KEY_CHECKS=1;

-- 1번 테스트 사용자 추가
INSERT INTO users (user_id, nickname, display_name, password, user_role, social_provider) 
VALUES (1, 'testuser', 'testuser', '$2a$10$kEAO1hxQk3gPtXKBN6nsIOBKJC3aJGYAfZT4t5OcRlH1vtO0zgHLC', 'USER', 'local');

