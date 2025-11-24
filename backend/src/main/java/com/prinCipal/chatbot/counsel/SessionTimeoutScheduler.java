package com.prinCipal.chatbot.counsel;

import com.prinCipal.chatbot.content.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet; // 추가
import java.util.List;
import java.util.Set;     // 추가

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
    
    // 실행 주기 : 1분마다
    @Scheduled(fixedRate = 60000)
    @Transactional // 전체 작업에 트랜잭션 유지 (데이터 정합성)
    public void checkSessionTimeouts() {
        LocalDateTime now = LocalDateTime.now();
        
        // [시간 설정 변경]
        // 1. 경고 기준: 마지막 대화로부터 5분 지남
        LocalDateTime warningTime = now.minusMinutes(5); 
        
        // 2. 종료 기준: 마지막 대화로부터 10분 지남
        LocalDateTime terminationTime = now.minusMinutes(10);

        // 이번 턴에 처리된 세션 ID 저장 (중복 처리 방지)
        Set<Long> processedSessionIds = new HashSet<>();

        // 1. [경고 단계]
        try {
            List<CounsellingSession> warningTargets = sessionRepository.findSessionsForWarning(
                    CompletionStatus.ONGOING, warningTime);
            
            for (CounsellingSession session : warningTargets) {
                try {
                    saveSystemMessage(session, "5분 뒤 상담이 자동으로 종료됩니다. 상담을 종료하시려면 “상담 종료”를 눌러주세요.");
                    
                    session.updateWarningSent(true);
                    sessionRepository.save(session);
                    
                    processedSessionIds.add(session.getSessionId());
                    logger.info("⚠️ 세션 ID {} : 1분 경과 경고 발송 완료", session.getSessionId());
                } catch (Exception e) {
                    logger.error("세션 ID {} 경고 처리 중 오류: {}", session.getSessionId(), e.getMessage());
                }
            }
        } catch (Exception e) {
            logger.error("경고 대상 조회 중 오류 발생", e);
        }

        // 2. [종료 단계]
        try {
            List<CounsellingSession> timeoutTargets = sessionRepository.findSessionsForTimeout(
                    CompletionStatus.ONGOING, terminationTime);

            for (CounsellingSession session : timeoutTargets) {
                try {
                    // 방금 경고를 보낸 세션이면 이번 턴 종료 패스
                    if (processedSessionIds.contains(session.getSessionId())) {
                        continue;
                    }

                    saveSystemMessage(session, "상담이 종료되었습니다. 이어서 상담을 원하시면 “상담 재시작”을 눌러주세요.");
                    
                    session.updateStatus(CompletionStatus.TIMEOUT);
                    session.updateendTime(now);
                    sessionRepository.save(session);
                    
                    logger.info("🛑 세션 ID {} : 3분 경과 타임아웃 자동 종료 완료", session.getSessionId());
                } catch (Exception e) {
                    logger.error("세션 ID {} 종료 처리 중 오류: {}", session.getSessionId(), e.getMessage());
                }
            }
        } catch (Exception e) {
            logger.error("종료 대상 조회 중 오류 발생", e);
        }
    }

    // 시스템 메시지 저장 헬퍼 메서드
    private void saveSystemMessage(CounsellingSession session, String text) {
        CounsellingContent systemMsg = CounsellingContent.builder()
                .session(session)
                .sender(Sender.CHATBOT)
                .content(text)
                .build();
        contentRepository.save(systemMsg);
    }

}
