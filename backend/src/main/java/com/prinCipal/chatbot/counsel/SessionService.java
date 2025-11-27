package com.prinCipal.chatbot.counsel;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prinCipal.chatbot.ChatService;
import com.prinCipal.chatbot.alert.AlertSeverity;
import com.prinCipal.chatbot.alert.AlertStatus;
import com.prinCipal.chatbot.alert.CrisisAlert;
import com.prinCipal.chatbot.alert.CrisisAlertRepository;
import com.prinCipal.chatbot.content.*;
import com.prinCipal.chatbot.dto.*;
import com.prinCipal.chatbot.member.Member;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SessionService {

	private final SessionRepository sessionRepository;
	private final ContentRepository contentRepository;
	private final KeywordRepository keywordAnalysisRepository;
	private final ChatService chatService;
	private final ObjectMapper objectMapper;
	private final CrisisAlertRepository crisisAlertRepository;

	// [핵심] 비동기 처리를 위한 자기 자신 주입 (순환 참조 방지 @Lazy)
	@Lazy
	@Autowired
	private SessionService self;

	private static final Logger logger = LoggerFactory.getLogger(SessionService.class);

	// Redis 캐시 유지 시간 (예: 24시간)
	private static final Duration CACHE_TTL = Duration.ofHours(24);

	// 새 상담 세션 생성 
	@Transactional // 새 세션 생성은 하나의 트랜잭션으로 관리
	public CounsellingSession createSession(Member member) {
		CounsellingSession session = CounsellingSession.builder().member(member)
				.completionStatus(CompletionStatus.ONGOING).build();

		// 초기 제목 및 시간 설정 (DB 기본값 대신)
		session.updateSummaryTitle("새 대화");
		session.updateLastMessageTime(LocalDateTime.now());

		return sessionRepository.save(session);
	}

	// 세션 삭제 (소유권 확인) 
	@Transactional // 삭제도 트랜잭션으로 관리
	public void deleteSession(Long sessionId, Member member) {
		CounsellingSession session = sessionRepository.findBySessionIdAndMember(sessionId, member)
				.orElseThrow(() -> new RuntimeException("세션을 찾을 수 없거나 권한이 없습니다."));

		sessionRepository.delete(session);
	}

	// 사용자 전체 세션 삭제
	@Transactional
	public void deleteAllSessions(Member member) {
		// 이 사용자의 모든 세션을 찾음
		List<CounsellingSession> allSessions = sessionRepository.findByMemberOrderByLastMessageTimeDesc(member);

		if (!allSessions.isEmpty()) {
			sessionRepository.deleteAll(allSessions);
		}

	}

	// 사용자의 전체 채팅방/최근 목록 조회 
	@Transactional(readOnly = true)
	public Map<String, Object> getInitialDataForUser(Member member) {
		Map<String, Object> initialData = new HashMap<>();

		// (findByMemberOrderByLastMessageTimeDesc가 fetch join을 사용한다고 가정)
		List<CounsellingSession> recentSessions = sessionRepository.findByMemberOrderByLastMessageTimeDesc(member);

		List<Map<String, Object>> recentsList = recentSessions.stream().map(session -> {
			Map<String, Object> recent = new HashMap<>();
			recent.put("id", session.getSessionId());

			String title = session.getSummaryTitle();
			// 제목이 null이거나 비어있으면 "제목 없음"으로 대체
			// 클라이언트에서 "새 대화"는 로딩으로 처리할 수 있도록 유지하거나,
			// "새 대화"인 경우 클라이언트가 로딩을 표시하도록 협의
			if (title == null || title.isEmpty() || title.equals("새 대화")) {
				title = "제목 생성 중...";
			}
			recent.put("title", title); // 수정된 title 사용

			// LocalDateTime 객체를 JS가 인식하는 long 타임스탬프(밀리초)로 변환
			long updatedAtMillis = session.getLastMessageTime().atZone(java.time.ZoneId.systemDefault()) // 서버의 기본 시간대로
																											// ZoneId 설정
					.toInstant() // Instant로 변환
					.toEpochMilli(); // 밀리초(long)로 변환

			recent.put("updatedAt", updatedAtMillis);

			return recent;
		}).collect(Collectors.toList());

		initialData.put("recents", recentsList);

		Map<Long, Object> sessionsMap = recentSessions.stream()
				.collect(Collectors.toMap(CounsellingSession::getSessionId, session -> {
					Map<String, Object> sessionDetail = new HashMap<>();
					sessionDetail.put("id", session.getSessionId());
					sessionDetail.put("title", session.getSummaryTitle());
					sessionDetail.put("summary", session.getSummary());

					List<Map<String, Object>> messages = session.getContents().stream()
							// [수정 전] 시간만 보고 정렬 (시간 같으면 순서 엉망됨)
	                        // .sorted(Comparator.comparing(CounsellingContent::getCreatedAt))
	                        
	                        // [수정 후] 1순위: 시간, 2순위: ID (번호)
	                        // 시간이 같더라도 ID가 69인(사용자) 것이 70인(봇) 것보다 먼저 나옴
	                        .sorted(Comparator.comparing(CounsellingContent::getCreatedAt)
	                                .thenComparing(CounsellingContent::getContentId))
							
							.map(content -> {
								Map<String, Object> msg = new HashMap<>();
								msg.put("role", content.getSender() == Sender.PERSON ? "user" : "bot");
								msg.put("text", content.getContent());
								msg.put("at", content.getCreatedAt());
								return msg;
							}).collect(Collectors.toList());

					sessionDetail.put("messages", messages);
					return sessionDetail;
				}, (existing, replacement) -> existing));

		initialData.put("sessions", sessionsMap);

		Long currentId = recentsList.isEmpty() ? null : (Long) recentsList.get(0).get("id");
		initialData.put("currentId", currentId);

		initialData.put("userId", member.getUserId());

		logger.info("📦 DB에서 생성된 초기 데이터 (사용자: {}): recents 개수 = {}, sessions 개수 = {}", member.getNickname(),
				recentsList.size(), sessionsMap.size(), member.getUserId());
		return initialData;
	}
	
	// 1. 일반 채팅 처리 (processChat)
    public ChatResponseDto processChat(ChatRequestDto requestDto, Member member) {
        
        // [STEP 0] DB에서 세션 정보를 먼저 조회 (요약본 가져오기 위해)
        // 기존에는 비동기 저장할 때만 조회했지만, 이제는 요청 보낼 때 필요하므로 여기서 조회
        CounsellingSession session = sessionRepository.findBySessionIdAndMember(requestDto.getSessionId(), member)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));

        // =================================================================================
        // [✅ STEP 0.5 - 추가] 변호사 추천 카드 데이터라면? -> AI 호출 없이 저장만 하고 끝낸다!
        // =================================================================================
        if (requestDto.getUserMessage() != null && requestDto.getUserMessage().trim().startsWith(":::LAWYER_RECOMMENDATION:::")) {
            
            // 1. DB에 '봇(CHATBOT)'이 말한 것으로 저장
            // (경고 메시지 저장하는 방식과 동일합니다)
            CounsellingContent lawyerCardMsg = CounsellingContent.builder()
                    .session(session)
                    .sender(Sender.CHATBOT) // 👈 중요: 봇이 말한 것으로 저장
                    .content(requestDto.getUserMessage())
                    .build();
            contentRepository.save(lawyerCardMsg);

            // 2. 세션의 마지막 대화 시간 업데이트 (채팅방 정렬 순서 유지용)
            session.updateLastMessageTime(LocalDateTime.now());
            sessionRepository.save(session);

            // 3. 여기서 함수 강제 종료! (아래의 AI 호출 코드가 실행되지 않음)
            // 프론트엔드는 이미 카드를 그렸으므로, 리턴값은 크게 중요하지 않음
            return new ChatResponseDto(
                    "LAWYER_CARD_SAVED", 
                    requestDto.getSessionId().toString(), 
                    session.getSummaryTitle()
            );
        }
        // =================================================================================
        
        // [STEP 1] 이전 요약본(prevSummary) 추출
        String prevSummary = session.getSummary(); // DB에 저장된 요약본

        // [STEP 2] FastAPI 호출 (요약본을 같이 넘김)
        FastApiResponseDto responseData = chatService.getFastApiResponse(requestDto, prevSummary); // 👈 전달

        // [STEP 3] 비동기 저장 호출
        // (주의: 이미 위에서 session을 조회했으므로, saveChatHistoryAsync를 조금 수정해서 session 객체를 넘기거나
        //  그대로 둬서 다시 조회하게 해도 됩니다. 성능상 큰 차이는 없으니 기존 유지도 무방)
        self.saveChatHistoryAsync(requestDto, responseData, member);

        // [STEP 4] 응답 반환
        String newTitle = null;
        if (responseData.getSessionUpdates() != null) {
            newTitle = responseData.getSessionUpdates().getSummaryTitle();
        }

        return new ChatResponseDto(
                responseData.getChatbotResponse().getContent(),
                requestDto.getSessionId().toString(),
                newTitle
        );
    }

    // 2. 상담 종료 처리 (endSessionManually) -> 여기서 endTime 처리!
    @Transactional
    public void endSessionManually(Long sessionId, Member member) {
        CounsellingSession session = sessionRepository.findBySessionIdAndMember(sessionId, member)
                .orElseThrow(() -> new RuntimeException("세션이 없거나 권한이 없습니다."));

        if (session.getCompletionStatus() != CompletionStatus.ONGOING) {
            return;
        }

        // [핵심] 종료 시점에 FastAPI에게 "최종 리포트" 요청
        String finalReport = chatService.getFinalReport(
            sessionId.toString(), 
            session.getSummary() // 현재까지의 요약본 전달
        );
        
        // 받아온 최종 리포트로 DB 업데이트
        if (finalReport != null && !finalReport.isEmpty()) {
            session.updateSummary(finalReport);
        }

        // 상태 변경 및 endTime 기록
        session.updateStatus(CompletionStatus.COMPLETED);
        session.updateendTime(LocalDateTime.now()); // 👈 endTime은 여기서!
        
        saveSystemMessage(session, "상담이 종료되었습니다. ※이어서 상담을 원하시면 “상담 재시작”을 눌러주세요.");
    }

    /**
     * 2. 비동기 DB 저장 메서드 (@Async)
     * 사용자가 응답을 받은 뒤 백그라운드에서 실행됨
     */
    @Async // 별도 스레드에서 실행됨
    @Transactional
    @CacheEvict(value = "initialData", key = "#member.userId") 
    public void saveChatHistoryAsync(ChatRequestDto requestDto, FastApiResponseDto fastApiResponse, Member member) {
        try {
            Long sessionId = requestDto.getSessionId();
            
            // 1. 세션 조회
            CounsellingSession session = sessionRepository.findBySessionIdAndMember(sessionId, member)
                    .orElseThrow(() -> new RuntimeException("세션 없음"));

            // 2. 사용자 메시지 저장
            CounsellingContent userMessage = CounsellingContent.builder()
                    .session(session)
                    .sender(Sender.PERSON)
                    .content(requestDto.getUserMessage())
                    .build();
            contentRepository.save(userMessage);

            // 3. 봇 메시지 저장
            CounsellingContent botMessage = CounsellingContent.builder()
                    .session(session)
                    .sender(Sender.CHATBOT)
                    .content(fastApiResponse.getChatbotResponse().getContent())
                    .build();
            contentRepository.save(botMessage);

            // 4. 분석 데이터 저장
            KeywordAnalysisDto analysisDto = fastApiResponse.getKeywordAnalysis();
            
            if (analysisDto != null) {
            	
            	// 1. Python에서 보낸 등급 문자열 가져오기 ("DANGER", "HIGH", "MEDIUM" or null)
                String severityStr = analysisDto.getAlertSeverity();
                boolean isDanger = (severityStr != null && !severityStr.isEmpty());
            	
                KeywordAnalysis analysis = KeywordAnalysis.builder()
                        .session(session)
                        .content(userMessage)
                        .isDivorce(analysisDto.getIsDivorce())
                        .emotionLabel(analysisDto.getEmotionLabel())
                        .topic(analysisDto.getTopic())
                        .intent(analysisDto.getIntent())
                        .situation(analysisDto.getSituation())
                        .retrievedData(convertMapToJsonString(analysisDto.getRetrievedData()))
                        .alertTriggered(isDanger)
                        .build();
                keywordAnalysisRepository.save(analysis);
                
                // [4-2] 위기 상황(isDanger)이라면 CrisisAlert 테이블에도 저장
                if (isDanger) {
                    
                    // 문자열(String) -> 이넘(Enum) 변환
                    AlertSeverity severityEnum = AlertSeverity.LOW; // 기본값
                    try {
                        // "DANGER" -> AlertSeverity.DANGER 변환
                        severityEnum = AlertSeverity.valueOf(severityStr);
                    } catch (Exception e) {
                        // 혹시 오타가 났거나 매칭 안 되면 기본값 HIGH로 설정
                        severityEnum = AlertSeverity.HIGH;
                    }

                    CrisisAlert alert = CrisisAlert.builder()
                            .member(member)
                            .session(session)
                            .analysis(analysis)
                            .alertSeverity(severityEnum) 
                            .alertStatus(AlertStatus.RESOLVED) 
                            .build();
                    
                    crisisAlertRepository.save(alert);
                    
                    logger.warn("🚨 위기 상황 감지됨! User: {}, Session: {}", member.getNickname(), sessionId);
                }
            }

            // 5. 세션 업데이트 (시간, 제목)
            session.updateLastMessageTime(LocalDateTime.now());
            
            // 안전장치: 메시지가 저장된다면, 세션 상태는 무조건 '진행 중'이어야 함
            if (session.getCompletionStatus() != CompletionStatus.ONGOING) {
                session.updateStatus(CompletionStatus.ONGOING);
                session.updateendTime(null);      // 종료 시간 삭제
                session.updateWarningSent(false); // 경고 초기화
                logger.info("⚠️ 종료된 세션에 메시지가 감지되어 상태를 ONGOING으로 자동 복구했습니다. (Session ID: {})", sessionId);
            }
            
            String newTitle = fastApiResponse.getSessionUpdates().getSummaryTitle();
            
            // 제목이 없거나 '새 대화'일 때만 업데이트
            if (newTitle != null && !newTitle.isEmpty() && 
               (session.getSummaryTitle() == null || "새 대화".equals(session.getSummaryTitle()))) {
                session.updateSummaryTitle(newTitle);
            }
            sessionRepository.save(session);

            logger.info("✅ Async DB Save Completed (Session: {})", sessionId);

        } catch (Exception e) {
            logger.error("❌ Async DB Save Failed: {}", e.getMessage(), e);
            // 실무 팁: 여기서 에러나면 사용자에게 티가 안 나므로, 운영자가 알 수 있게 로그를 잘 남겨야 합니다.
        }
    }

     // [수동] 상담 재시작
    @Transactional
    public void restartSessionManually(Long sessionId, Member member) {
        CounsellingSession session = sessionRepository.findBySessionIdAndMember(sessionId, member)
                .orElseThrow(() -> new RuntimeException("세션이 없거나 권한이 없습니다."));

        // Entity에 추가한 메서드 호출 (상태 ONGOING, 시간 갱신, 경고 초기화)
        session.restartSession(); 
        
        // 재개 메시지 남기기
        saveSystemMessage(session, "상담이 재개되었습니다. 말씀해 주세요.");
    }

    // 서비스 내부에서도 쓰기 위해 private 메서드로 추출 추천
    private void saveSystemMessage(CounsellingSession session, String text) {
        CounsellingContent systemMsg = CounsellingContent.builder()
                .session(session)
                .sender(Sender.CHATBOT)
                .content(text)
                .build();
        contentRepository.save(systemMsg);
    }
	
	// Map을 JSON 문자열로 변환 
	private String convertMapToJsonString(Map<String, Object> data) {
		try {
			if (data == null) {
				return null;
			}
			return objectMapper.writeValueAsString(data);
		} catch (Exception e) {
			logger.error("JSON 변환 실패", e);
			return "{\"error\":\"JSON 변환 실패\"}";
		}
	}

}