package com.prinCipal.chatbot.counsel;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prinCipal.chatbot.ChatService;
import com.prinCipal.chatbot.content.*;
import com.prinCipal.chatbot.dto.*;
import com.prinCipal.chatbot.member.Member;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.redis.core.StringRedisTemplate; // 변경됨
import org.springframework.data.redis.core.ValueOperations;
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

	// [변경] RedisConfig에 등록된 빈 이름과 타입 매칭
	private final StringRedisTemplate stringRedisTemplate;

	// [핵심] 비동기 처리를 위한 자기 자신 주입 (순환 참조 방지 @Lazy)
	@Lazy
	@Autowired
	private SessionService self;

	private static final Logger logger = LoggerFactory.getLogger(SessionService.class);

	// Redis 캐시 유지 시간 (예: 24시간)
	private static final Duration CACHE_TTL = Duration.ofHours(24);

	/**
	 * 새 상담 세션 생성
	 */
	@Transactional // 👈 [수정] 새 세션 생성은 하나의 트랜잭션으로 관리
	public CounsellingSession createSession(Member member) {
		CounsellingSession session = CounsellingSession.builder().member(member)
				.completionStatus(CompletionStatus.ONGOING).resumeToken(null).build();

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

	// 사용자 전체 세션 삭제
	@Transactional
	public void deleteAllSessions(Member member) {
		// 이 사용자의 모든 세션을 찾음
		List<CounsellingSession> allSessions = sessionRepository.findByMemberOrderByLastMessageTimeDesc(member);

		if (!allSessions.isEmpty()) {
			sessionRepository.deleteAll(allSessions);
		}

	}

	/**
	 * [추가] 사용자의 전체 채팅방/최근 목록 조회
	 */
	@Transactional(readOnly = true)
	public Map<String, Object> getInitialDataForUser(Member member) {
		Map<String, Object> initialData = new HashMap<>();

		// (findByMemberOrderByLastMessageTimeDesc가 fetch join을 사용한다고 가정)
		List<CounsellingSession> recentSessions = sessionRepository.findByMemberOrderByLastMessageTimeDesc(member);

		List<Map<String, Object>> recentsList = recentSessions.stream().map(session -> {
			Map<String, Object> recent = new HashMap<>();
			recent.put("id", session.getSessionId());

			String title = session.getSummaryTitle();
			// ⭐ 수정: 제목이 null이거나 비어있으면 "제목 없음"으로 대체
			// 클라이언트에서 "새 대화"는 로딩으로 처리할 수 있도록 유지하거나,
			// "새 대화"인 경우 클라이언트가 로딩을 표시하도록 협의합니다.
			if (title == null || title.isEmpty() || title.equals("새 대화")) {
				title = "제목 생성 중...";
			}
			recent.put("title", title); // 수정된 title 사용

			// ⭐ 핵심 수정: LocalDateTime 객체를 JS가 인식하는 long 타임스탬프(밀리초)로 변환
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
	
	/**
     * 1. 채팅 처리 메인 로직
     * 흐름: Redis 조회 -> (없으면 AI 호출) -> 비동기 저장 실행 -> 사용자에게 즉시 응답
     */
    public ChatResponseDto processChat(ChatRequestDto requestDto, Member member) {
        String userQuery = requestDto.getUserMessage();
        
        // 세션별로 대화 문맥이 다를 수 있으므로 sessionId를 키에 포함 권장
        String redisKey = "chat:" + requestDto.getSessionId() + ":" + userQuery.trim();

        FastApiResponseDto responseData = null;

        // [STEP 1] Redis 캐시 조회
        try {
            ValueOperations<String, String> ops = stringRedisTemplate.opsForValue();
            String cachedJson = ops.get(redisKey);

            if (cachedJson != null) {
                // 캐시 히트! (AI 서버 호출 없이 바로 응답)
                responseData = objectMapper.readValue(cachedJson, FastApiResponseDto.class);
                logger.info("🚀 Redis Cache Hit! (Query: {})", userQuery);
            }
        } catch (Exception e) {
            logger.warn("Redis 조회 중 오류 (무시하고 AI 호출 진행): {}", e.getMessage());
        }

        // [STEP 2] 캐시가 없으면 FastAPI 호출 (AI 추론)
        if (responseData == null) {
            try {
                responseData = chatService.getFastApiResponse(requestDto);
                
                // 다음을 위해 Redis에 저장 (TTL 설정)
                String jsonToCache = objectMapper.writeValueAsString(responseData);
                stringRedisTemplate.opsForValue().set(redisKey, jsonToCache, CACHE_TTL);
                
            } catch (Exception e) {
                logger.error("FastAPI 호출 실패: {}", e.getMessage());
                // 봇이 죽었을 때 예외 처리 (사용자에게 에러 메시지 반환 등)
                throw new RuntimeException("AI 서버 응답 실패");
            }
        }

        // [STEP 3] DB 저장은 '비동기'로 던져두기
        // 여기서 self.save...를 호출하면 별도 스레드가 돌기 때문에, 아래 return이 즉시 실행됨
        self.saveChatHistoryAsync(requestDto, responseData, member);

        // [STEP 4] 사용자에게 즉시 응답 반환
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
                KeywordAnalysis analysis = KeywordAnalysis.builder()
                        .session(session)
                        .content(userMessage)
                        .isDivorce(analysisDto.getIsDivorce())
                        .emotionLabel(analysisDto.getEmotionLabel())
                        .topic(analysisDto.getTopic())
                        .intent(analysisDto.getIntent())
                        .situation(analysisDto.getSituation())
                        .retrievedData(convertMapToJsonString(analysisDto.getRetrievedData()))
                        .alertTriggered(false)
                        .build();
                keywordAnalysisRepository.save(analysis);
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
    
    /**
     * [수동] 상담 종료
     */
    @Transactional
    public void endSessionManually(Long sessionId, Member member) {
        CounsellingSession session = sessionRepository.findBySessionIdAndMember(sessionId, member)
                .orElseThrow(() -> new RuntimeException("세션이 없거나 권한이 없습니다."));

        // 이미 끝난 세션이면 무시
        if (session.getCompletionStatus() != CompletionStatus.ONGOING) {
            return; 
        }

        // 종료 처리
        session.updateStatus(CompletionStatus.COMPLETED); // 수동 종료는 COMPLETED
        session.updateendTime(LocalDateTime.now());
        
        // (선택) 종료 메시지 남기기
        saveSystemMessage(session, "상담이 종료되었습니다.");
    }

    /**
     * [수동] 상담 재시작
     */
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

//	/**
//	 * [수정] 메시지 저장 및 봇 응답 처리
//	 */
//	// 👈 [수정] 요청: ChatRequestDto (A) / 응답: ChatResponseDto (B)
//	public ChatResponseDto addMessage(ChatRequestDto requestDto, Member member) {
//
//		CounsellingContent userMessage;
//		Long sessionId;
//
//		try {
//			// (A) 사용자 메시지 저장
//			userMessage = saveUserMessageAndUpdateSession(requestDto, member);
//			sessionId = userMessage.getSession().getSessionId();
//
//		} catch (RuntimeException e) {
//			logger.error("사용자 메시지 저장 실패 (DB 조회 오류): {}", e.getMessage());
//			// 에러 시 제목은 null
//			return new ChatResponseDto("메시지 전송에 실패했습니다. (세션 오류)", requestDto.getSessionId().toString(), null);
//		}
//
//		FastApiResponseDto fastApiResponse;
//
//		try {
//			// 1. FastAPI 호출
//			fastApiResponse = chatService.getFastApiResponse(requestDto);
//
//			// 2. 봇 응답 및 분석 내용 DB 저장
//			saveBotResponseAndAnalysis(userMessage, fastApiResponse);
//
//			// 3. 👈 [핵심 수정] 새 제목 가져오기
//			String newTitle = null;
//			if (fastApiResponse.getSessionUpdates() != null) {
//				newTitle = fastApiResponse.getSessionUpdates().getSummaryTitle();
//			}
//
//			// 4. (B) 프론트 응답 DTO 생성 (제목 포함)
//			return new ChatResponseDto(fastApiResponse.getChatbotResponse().getContent(), sessionId.toString(), newTitle // 👈
//																															// 여기에
//																															// 새
//																															// 제목을
//																															// 담아서
//																															// 보냄
//			);
//
//		} catch (Exception e) {
//			logger.error("FastAPI 챗봇 응답 또는 저장 실패 (세션 ID: {}): {}", sessionId, e.getMessage());
//			return new ChatResponseDto("죄송합니다. 봇 응답에 실패했습니다. (" + e.getMessage() + ")", sessionId.toString(), null);
//		}
//	}
//
//	/**
//	 * [헬퍼 1] 사용자 메시지 저장
//	 */
//	@Transactional
//	@CacheEvict(value = "initialData", key = "#member.userId")
//	// 👈 [수정] (A) DTO 사용
//	public CounsellingContent saveUserMessageAndUpdateSession(ChatRequestDto requestDto, Member member) {
//		Long sessionId = requestDto.getSessionId().longValue();
//
//		CounsellingSession session = sessionRepository.findBySessionIdAndMember(sessionId, member)
//				.orElseThrow(() -> new RuntimeException("세션을 찾을 수 없거나 권한이 없습니다."));
//
//		CounsellingContent userMessage = CounsellingContent.builder().session(session).sender(Sender.PERSON)
//				.content(requestDto.getUserMessage()).build();
//		contentRepository.save(userMessage);
//
//		session.updateLastMessageTime(LocalDateTime.now());
//		sessionRepository.save(session);
//
//		return userMessage;
//	}
//
//	/**
//	 * [헬퍼 2] 봇 메시지 및 키워드 저장
//	 */
//	@Transactional
//	@CacheEvict(value = "initialData", key = "#userMessage.session.member.userId")
//	public void saveBotResponseAndAnalysis(CounsellingContent userMessage, FastApiResponseDto fastApiResponse) {
//
//		CounsellingSession session = userMessage.getSession();
//
//		// 1. 봇 메시지 저장 (C) ChatbotResponseDto 사용
//		CounsellingContent botMessage = CounsellingContent.builder().session(session).sender(Sender.CHATBOT)
//				.content(fastApiResponse.getChatbotResponse().getContent()).build();
//		contentRepository.save(botMessage);
//
//		// 2. 키워드 분석 저장 (C) KeywordAnalysisDto 사용
//		KeywordAnalysisDto analysisDto = fastApiResponse.getKeywordAnalysis();
//		KeywordAnalysis analysis = KeywordAnalysis.builder().session(session).content(userMessage)
//				.isDivorce(analysisDto.getIsDivorce()).emotionLabel(analysisDto.getEmotionLabel())
//				.topic(analysisDto.getTopic()).intent(analysisDto.getIntent()).situation(analysisDto.getSituation())
//				.retrievedData(convertMapToJsonString(analysisDto.getRetrievedData())).alertTriggered(false).build();
//		keywordAnalysisRepository.save(analysis);
//
//		// 3. 세션 업데이트 (C) SessionUpdatesDto 사용
//		session.updateLastMessageTime(LocalDateTime.now());
//
//		String newTitle = fastApiResponse.getSessionUpdates().getSummaryTitle();
//		if (newTitle != null && !newTitle.isEmpty()
//				&& (session.getSummaryTitle() == null || session.getSummaryTitle().equals("새 대화"))) {
//			session.updateSummaryTitle(newTitle); // AI 제목으로 업데이트
//		}
//
//		sessionRepository.save(session);
//	}

	
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