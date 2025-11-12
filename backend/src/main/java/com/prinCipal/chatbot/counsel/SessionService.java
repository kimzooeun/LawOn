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
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class SessionService {

    private final SessionRepository sessionRepository;
    private final CounsellingContentRepository contentRepository;
    private final ChatService chatService; 
    private final MemberRepository memberRepository; 
    
    /**
     * 새 상담 세션 생성
     */
    public CounsellingSession createSession(Member member) {
        CounsellingSession session = CounsellingSession.builder()
                .member(member)
                .startTime(LocalDateTime.now()) // CounsellingSession 빌더 수정 필요
                .completionStatus(CompletionStatus.ONGOING)
                .summary(null)
                .resumeToken(null)
                .contextSnapshot(null)
                .build();
        
        return sessionRepository.save(session);
    }

    /**
     * 세션 삭제 (소유권 확인)
     */
    public void deleteSession(Long sessionId, Member member) {
        CounsellingSession session = sessionRepository.findBySessionIdAndMember(sessionId, member)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없거나 권한이 없습니다."));
        
        sessionRepository.delete(session);
    }

    /**
     * 메시지 저장 및 봇 응답 처리 (ChatRequestDto를 직접 사용)
     */
    public ChatResponseDto addMessage(ChatRequestDto requestDto) {
        
        // 1. DTO에서 ID 추출
        Long sessionId = requestDto.getSessionId().longValue();
        Long memberId = requestDto.getUserId().longValue();

        // 2. 세션 및 사용자 엔티티 조회 (소유권 확인)
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        CounsellingSession session = sessionRepository.findBySessionIdAndMember(sessionId, member)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없거나 권한이 없습니다."));

        // 3. 프론트에서 받은 사용자 메시지(PERSON) DB에 저장
        CounsellingContent userMessage = CounsellingContent.builder()
                .session(session)
                .sender(Sender.PERSON)
                .content(requestDto.getUserMessage())
                .build();
        contentRepository.save(userMessage);

        // 4. (중요) 기존 ChatService 호출
        ChatResponseDto botResponse = chatService.getFastApiResponse(requestDto); //
        String botReplyText = botResponse.getText();

        // 5. 봇 메시지(CHATBOT) DB에 저장
        CounsellingContent botMessage = CounsellingContent.builder()
                .session(session)
                .sender(Sender.CHATBOT)
                .content(botReplyText)
                .build();
        contentRepository.save(botMessage);

        // 최근 메시지 시간 업데이트 (DB 설계의 last_message_time)
        session.updateLastMessageTime(LocalDateTime.now());

        // (임시) 첫 대화인 경우, 사용자 메시지를 기반으로 제목 생성
        // (DB 설계에 따르면 LLM이 생성하지만, 우선 임시로 만듭니다)
        if (session.getSummaryTitle() == null || session.getSummaryTitle().isEmpty()) {
            String title = requestDto.getUserMessage().length() > 30
                    ? requestDto.getUserMessage().substring(0, 30) + "..."
                    : requestDto.getUserMessage();
            session.updateSummaryTitle(title);
        }
        
        // (향후) OpenAI 요약본이 준비되면 이 부분에서 업데이트
        // String contextSummary = ... (OpenAI 요약 결과) ...
        // session.updateContextSnapshot(contextSummary);

        // ★★★ (필수) 업데이트된 세션 정보를 DB에 최종 저장 ★★★
        sessionRepository.save(session);

        // 7. 프론트엔드로 봇 응답 반환
        return botResponse;
    }
    
}