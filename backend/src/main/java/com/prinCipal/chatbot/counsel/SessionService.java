package com.prinCipal.chatbot.counsel;

import com.prinCipal.chatbot.ChatService;
import com.prinCipal.chatbot.content.CounsellingContent;
import com.prinCipal.chatbot.content.CounsellingContentRepository;
import com.prinCipal.chatbot.content.Sender;
import com.prinCipal.chatbot.dto.ChatRequestDto;
import com.prinCipal.chatbot.dto.ChatResponseDto;
import com.prinCipal.chatbot.member.Member;
import com.prinCipal.chatbot.member.MemberRepository; 
import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // 👈 @Transactional 임포트 확인

import java.time.LocalDateTime;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@RequiredArgsConstructor
public class SessionService {

    private final SessionRepository sessionRepository;
    private final CounsellingContentRepository contentRepository;
    private final ChatService chatService; 
    private final MemberRepository memberRepository; 
    
    private static final Logger logger = LoggerFactory.getLogger(SessionService.class);
    
    /**
     * 새 상담 세션 생성
     */
    @Transactional // 👈 [수정] 새 세션 생성은 하나의 트랜잭션으로 관리
    public CounsellingSession createSession(Member member) {
        CounsellingSession session = CounsellingSession.builder()
                .member(member)
                .startTime(LocalDateTime.now()) 
                .completionStatus(CompletionStatus.ONGOING)
                .summary(null)
                .resumeToken(null)
                .contextSnapshot(null)
                .build();
        
        // 👈 [추가] 초기 제목 및 시간 설정 (DB 기본값 대신)
        session.updateSummaryTitle("새 대화");
        session.updateLastMessageTime(LocalDateTime.now());
        
        return sessionRepository.save(session);
    }

    /**
     * 세션 삭제 (소유권 확인)
     */
    @Transactional // 👈 [수정] 삭제도 트랜잭션으로 관리
    public void deleteSession(Long sessionId, Member member) {
        CounsellingSession session = sessionRepository.findBySessionIdAndMember(sessionId, member)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없거나 권한이 없습니다."));
        
        sessionRepository.delete(session);
    }

    /**
     * [추가] 사용자의 전체 채팅방/최근 목록 조회
     */
    @Transactional(readOnly = true) 
    public Map<String, Object> getInitialDataForUser(Member member) {
        Map<String, Object> initialData = new HashMap<>();

        // (findByMemberOrderByLastMessageTimeDesc가 fetch join을 사용한다고 가정)
        List<CounsellingSession> recentSessions = sessionRepository.findByMemberOrderByLastMessageTimeDesc(member);
        
        List<Map<String, Object>> recentsList = recentSessions.stream()
            .map(session -> {
                Map<String, Object> recent = new HashMap<>();
                recent.put("id", session.getSessionId()); 
                recent.put("title", session.getSummaryTitle()); 
                recent.put("updatedAt", session.getLastMessageTime()); 
                return recent;
            })
            .collect(Collectors.toList());
        
        initialData.put("recents", recentsList);

        Map<Long, Object> sessionsMap = recentSessions.stream()
            .collect(Collectors.toMap(
                CounsellingSession::getSessionId, 
                session -> {
                    Map<String, Object> sessionDetail = new HashMap<>();
                    sessionDetail.put("id", session.getSessionId());
                    sessionDetail.put("title", session.getSummaryTitle());
                    
                    List<Map<String, Object>> messages = session.getContents().stream() 
                        .map(content -> {
                            Map<String, Object> msg = new HashMap<>();
                            msg.put("role", content.getSender() == Sender.PERSON ? "user" : "bot");
                            msg.put("text", content.getContent());
                            msg.put("at", content.getCreatedAt()); 
                            return msg;
                        })
                        .collect(Collectors.toList());

                    sessionDetail.put("messages", messages);
                    return sessionDetail;
                },
                (existing, replacement) -> existing 
            ));

        initialData.put("sessions", sessionsMap);

        Long currentId = recentsList.isEmpty() ? null : (Long) recentsList.get(0).get("id");
        initialData.put("currentId", currentId);
        
        initialData.put("userId", member.getUserId());
        
        logger.info("📦 DB에서 생성된 초기 데이터 (사용자: {}): recents 개수 = {}, sessions 개수 = {}",
                member.getNickname(), 
                recentsList.size(),
                sessionsMap.size(),
        		member.getUserId());
        return initialData;
    }
    
    // -----------------------------------------------------------------
    // ▼▼▼▼▼▼▼▼▼▼▼ [수정된 핵심 로직] ▼▼▼▼▼▼▼▼▼▼▼
    // -----------------------------------------------------------------

    /**
     * [수정] 메시지 저장 및 봇 응답 처리 (트랜잭션 분리)
     * - 이 메서드 자체에는 @Transactional이 없습니다.
     */
    public ChatResponseDto addMessage(ChatRequestDto requestDto) {
        
        CounsellingSession session;
        Long sessionId;

        try {
            // 1. 사용자 메시지 저장 (트랜잭션 1)
            //    이 작업은 즉시 커밋됩니다.
            session = saveUserMessageAndUpdateSession(requestDto);
            sessionId = session.getSessionId();
        } catch (RuntimeException e) {
            // (예: 사용자를 못 찾음, 세션 권한 없음)
            logger.error("사용자 메시지 저장 실패 (DB 조회 오류): {}", e.getMessage());
            return new ChatResponseDto("메시지 전송에 실패했습니다. (세션 오류)", requestDto.getSessionId().toString());
        }

        ChatResponseDto botResponse;
        
        try {
            // 2. (중요) 외부 API 호출
            //    이 호출은 DB 트랜잭션 *밖에서* 수행됩니다.
            botResponse = chatService.getFastApiResponse(requestDto); 
            
            // 3. 봇 메시지 저장 (트랜잭션 2)
            //    이 작업은 즉시 커밋됩니다.
            saveBotMessage(session, botResponse.getText());

            // 4. 프론트엔드로 봇 응답 반환
            return botResponse;

        } catch (Exception e) {
            // 5. (중요) API 호출 실패 시
            logger.error("FastAPI 챗봇 응답 실패 (세션 ID: {}): {}", sessionId, e.getMessage());
            
            // 사용자 메시지는 이미 1번에서 커밋되었으므로 안전합니다.
            // 프론트엔드에는 에러 응답을 보냅니다.
            return new ChatResponseDto("죄송합니다. 봇 응답에 실패했습니다.", sessionId.toString()); 
        }
    }

    /**
     * [헬퍼 1] 사용자 메시지 저장 및 세션 1차 업데이트
     * (이 메서드만 별도의 트랜잭션으로 실행됩니다)
     */
    @Transactional
    public CounsellingSession saveUserMessageAndUpdateSession(ChatRequestDto requestDto) {
        Long sessionId = requestDto.getSessionId().longValue();
        Long memberId = requestDto.getUserId().longValue();

        // 1. 세션 및 사용자 엔티티 조회 (소유권 확인)
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        CounsellingSession session = sessionRepository.findBySessionIdAndMember(sessionId, member)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없거나 권한이 없습니다."));

        // 2. 사용자 메시지(PERSON) DB에 저장
        CounsellingContent userMessage = CounsellingContent.builder()
                .session(session)
                .sender(Sender.PERSON)
                .content(requestDto.getUserMessage())
                .build();
        contentRepository.save(userMessage);
        
        // 3. 세션 1차 업데이트 (봇 응답 전)
        session.updateLastMessageTime(LocalDateTime.now());
        if (session.getSummaryTitle() == null || session.getSummaryTitle().isEmpty() || session.getSummaryTitle().equals("새 대화")) {
            String title = requestDto.getUserMessage().length() > 30
                    ? requestDto.getUserMessage().substring(0, 30) + "..."
                    : requestDto.getUserMessage();
            session.updateSummaryTitle(title);
        }
        
        // 4. (필수) 세션 변경 사항을 즉시 DB에 반영 (커밋)
        return sessionRepository.save(session);
    }
    
    /**
     * [헬퍼 2] 봇 메시지 저장 및 세션 2차 업데이트
     * (이 메서드도 별도의 트랜잭션으로 실행됩니다)
     */
    @Transactional
    public void saveBotMessage(CounsellingSession session, String botReplyText) {
        // 1. 봇 메시지(CHATBOT) DB에 저장
        CounsellingContent botMessage = CounsellingContent.builder()
                .session(session)
                .sender(Sender.CHATBOT)
                .content(botReplyText)
                .build();
        contentRepository.save(botMessage);

        // 2. 최근 메시지 시간 갱신
        session.updateLastMessageTime(LocalDateTime.now());
        
        // 3. (필수) 세션 변경 사항을 즉시 DB에 반영 (커밋)
        sessionRepository.save(session);
    }
}