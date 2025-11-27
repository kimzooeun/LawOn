package com.prinCipal.chatbot.counsel;

import com.prinCipal.chatbot.ChatService;
import com.prinCipal.chatbot.content.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate; // 👈 [1] 트랜잭션 템플릿 추가

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class SessionTimeoutScheduler {

    private final SessionRepository sessionRepository;
    private final ContentRepository contentRepository;
    private final ChatService chatService;
    private final TransactionTemplate transactionTemplate; // 👈 [2] 주입 (세밀한 트랜잭션 제어용)

    private static final Logger logger = LoggerFactory.getLogger(SessionTimeoutScheduler.class);

    // 1분마다 실행
    @Scheduled(fixedRate = 60000)
    // ❌ @Transactional 제거! (전체를 하나의 트랜잭션으로 묶으면 AI 응답 대기 중 DB가 잠김)
    public void checkSessionTimeouts() {
        LocalDateTime now = LocalDateTime.now();
        
        LocalDateTime warningTime = now.minusMinutes(5);
        LocalDateTime terminationTime = now.minusMinutes(10);

        Set<Long> processedSessionIds = new HashSet<>();

        // ==========================================
        // 1. [경고 단계] (5분 경과) - 가벼운 작업이므로 순차 처리도 무방하나 안전하게 트랜잭션 처리
        // ==========================================
        try {
            List<CounsellingSession> warningTargets = sessionRepository.findSessionsForWarning(
                    CompletionStatus.ONGOING, warningTime);
            
            for (CounsellingSession session : warningTargets) {
                // 개별 세션마다 짧게 트랜잭션을 엽니다.
                transactionTemplate.executeWithoutResult(status -> {
                    try {
                        saveSystemMessage(session, "5분 뒤 상담이 자동으로 종료됩니다. 상담을 계속 하시려면 메세지를 보내주시고 ※상담을 종료하시려면 “상담 종료”를 눌러주세요.");
                        
                        session.updateWarningSent(true);
                        sessionRepository.save(session);
                        
                        processedSessionIds.add(session.getSessionId());
                        logger.info("⚠️ 세션 ID {} : 5분 경과 경고 발송", session.getSessionId());
                    } catch (Exception e) {
                        logger.error("세션 ID {} 경고 처리 중 오류: {}", session.getSessionId(), e.getMessage());
                        status.setRollbackOnly(); // 에러 발생 시 롤백
                    }
                });
            }
        } catch (Exception e) {
            logger.error("경고 대상 조회 중 오류", e);
        }

        // ==========================================
        // 2. [종료 단계] (10분 경과) - 🚀 병렬 처리 & 트랜잭션 분리
        // ==========================================
        try {
            List<CounsellingSession> timeoutTargets = sessionRepository.findSessionsForTimeout(
                    CompletionStatus.ONGOING, terminationTime);

            // ⭐ [핵심 변경] parallelStream()을 사용하여 AI 요청을 병렬로 수행 (속도 획기적 개선)
            timeoutTargets.parallelStream().forEach(session -> {
                if (processedSessionIds.contains(session.getSessionId())) return;

                // [Step A] AI 리포트 생성 (시간이 오래 걸림 -> 트랜잭션 없이 수행)
                String finalReport = null;
                try {
                    finalReport = chatService.getFinalReport(
                            session.getSessionId().toString(),
                            session.getSummary()
                    );
                    logger.info("🤖 세션 ID {} : AI 리포트 생성 완료 (비동기 병렬 처리)", session.getSessionId());
                } catch (Exception e) {
                    logger.error("세션 ID {} 리포트 생성 실패 (계속 진행): {}", session.getSessionId(), e.getMessage());
                }

                String finalReportResult = finalReport; // 람다 내부 사용을 위해 final 변수 처리

                // [Step B] DB 업데이트 (빠름 -> 여기서만 트랜잭션 사용)
                transactionTemplate.executeWithoutResult(status -> {
                    try {
                        // 1. 리포트가 있으면 업데이트 (Entity가 detach 상태일 수 있으므로 다시 조회하거나 save로 병합)
                        // 여기서는 간단히 기존 객체 업데이트 후 save (JPA가 ID 기반으로 병합 시도)
                        if (finalReportResult != null && !finalReportResult.isEmpty()) {
                            session.updateSummary(finalReportResult);
                        }

                        // 2. 메시지 저장 및 상태 변경
                        saveSystemMessage(session, "상담이 종료되었습니다. 마이페이지에서 상담 요약을 확인하실 수 있습니다. ※이어서 상담을 원하시면 “상담 재시작”을 눌러주세요.");
                        
                        session.updateStatus(CompletionStatus.TIMEOUT);
                        session.updateendTime(LocalDateTime.now()); // 시간은 현재 시간으로
                        sessionRepository.save(session);

                        logger.info("🛑 세션 ID {} : 타임아웃 종료 DB 반영 완료", session.getSessionId());

                    } catch (Exception e) {
                        logger.error("세션 ID {} DB 저장 중 오류", session.getSessionId(), e);
                        status.setRollbackOnly();
                    }
                });
            });

        } catch (Exception e) {
            logger.error("종료 대상 조회 중 오류", e);
        }
    }

    private void saveSystemMessage(CounsellingSession session, String text) {
        CounsellingContent systemMsg = CounsellingContent.builder()
                .session(session)
                .sender(Sender.CHATBOT)
                .content(text)
                .build();
        contentRepository.save(systemMsg);
    }
}