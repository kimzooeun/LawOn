package com.prinCipal.chatbot.counsel;

import com.prinCipal.chatbot.content.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class SessionTimeoutScheduler {

    private final SessionRepository sessionRepository;
    private final ContentRepository contentRepository;
    
    private static final Logger logger = LoggerFactory.getLogger(SessionTimeoutScheduler.class);

    // 1분(60000ms)마다 실행
//    @Scheduled(fixedRate = 60000)
//    @Transactional
//    public void checkSessionTimeouts() {
//        LocalDateTime now = LocalDateTime.now();
//        LocalDateTime fiveMinutesAgo = now.minusMinutes(5);  // 5분 전
//        LocalDateTime tenMinutesAgo = now.minusMinutes(10); // 10분 전
//
//        // 1. [경고 단계] 5분 경과, 경고 미발송 세션 찾기
//        List<CounsellingSession> warningTargets = sessionRepository.findSessionsForWarning(fiveMinutesAgo);
//
//        for (CounsellingSession session : warningTargets) {
//            // 시스템 메시지 저장
//            saveSystemMessage(session, "5분 뒤 상담이 자동으로 종료됩니다. 상담을 종료하시려면 “상담 종료”를 눌러주세요.");
//            
//            // 경고 발송 체크 (DB 업데이트)
//            session.updateWarningSent(true);
//            logger.info("⚠️ 세션 ID {} : 5분 경고 발송", session.getSessionId());
//        }
//
//        // 2. [종료 단계] 10분 경과 세션 찾기
//        List<CounsellingSession> timeoutTargets = sessionRepository.findSessionsForTimeout(tenMinutesAgo);
//
//        for (CounsellingSession session : timeoutTargets) {
//            // 종료 메시지 저장
//            saveSystemMessage(session, "상담이 종료되었습니다. 이어서 상담을 원하시면 “상담 재시작”을 눌러주세요.");
//            
//            // 세션 상태 TIMEOUT으로 변경 및 종료시간 기록
//            session.updateStatus(CompletionStatus.TIMEOUT);
//            session.updateendTime(now);
//            logger.info("🛑 세션 ID {} : 타임아웃 자동 종료", session.getSessionId());
//        }
//    }
    
 // 👉 [수정] 5초마다 실행 (빠른 감지 위해)
    @Scheduled(fixedRate = 5000) 
    @Transactional
    public void checkSessionTimeouts() {
        LocalDateTime now = LocalDateTime.now();
        
        // 기존: 5분 전, 10분 전
        // LocalDateTime fiveMinutesAgo = now.minusMinutes(5);
        // LocalDateTime tenMinutesAgo = now.minusMinutes(10);

        // 👉 [수정] 테스트용: 10초 전(경고), 20초 전(종료)
        LocalDateTime warningTime = now.minusSeconds(10); 
        LocalDateTime terminationTime = now.minusSeconds(20); 

        // 1. [경고 단계] (변수명 변경 주의: fiveMinutesAgo -> warningTime)
        List<CounsellingSession> warningTargets = sessionRepository.findSessionsForWarning(warningTime);
        for (CounsellingSession session : warningTargets) {
          // 시스템 메시지 저장
          saveSystemMessage(session, "5분 뒤 상담이 자동으로 종료됩니다. 상담을 종료하시려면 “상담 종료”를 눌러주세요.");
          
          // 경고 발송 체크 (DB 업데이트)
          session.updateWarningSent(true);
          logger.info("⚠️ 세션 ID {} : 5분 경고 발송", session.getSessionId());
      }

        // 2. [종료 단계] (변수명 변경 주의: tenMinutesAgo -> terminationTime)
        List<CounsellingSession> timeoutTargets = sessionRepository.findSessionsForTimeout(terminationTime);
        for (CounsellingSession session : timeoutTargets) {
          // 종료 메시지 저장
          saveSystemMessage(session, "상담이 종료되었습니다. 이어서 상담을 원하시면 “상담 재시작”을 눌러주세요.");
          
          // 세션 상태 TIMEOUT으로 변경 및 종료시간 기록
          session.updateStatus(CompletionStatus.TIMEOUT);
          session.updateendTime(now);
          logger.info("🛑 세션 ID {} : 타임아웃 자동 종료", session.getSessionId());
        }
}

    // 시스템 메시지 저장 헬퍼 메서드
    private void saveSystemMessage(CounsellingSession session, String text) {
        CounsellingContent systemMsg = CounsellingContent.builder()
                .session(session)
                .sender(Sender.CHATBOT) // 챗봇이 말한 것으로 처리
                .content(text)
                .build();
        contentRepository.save(systemMsg);
    }
}
