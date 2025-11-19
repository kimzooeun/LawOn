package com.prinCipal.chatbot.counsel;

import com.prinCipal.chatbot.ChatService;
import com.prinCipal.chatbot.content.CounsellingContent;
import com.prinCipal.chatbot.content.KeywordAnalysis;
import com.prinCipal.chatbot.content.KeywordRepository;
import com.prinCipal.chatbot.content.ContentRepository;
import com.prinCipal.chatbot.content.Sender;
import com.prinCipal.chatbot.dto.ChatRequestDto; // 👈 (A) 프론트 요청 DTO
import com.prinCipal.chatbot.dto.ChatResponseDto; // 👈 (B) 프론트 응답 DTO
import com.prinCipal.chatbot.dto.FastApiResponseDto; // (C) FastAPI 응답
import com.prinCipal.chatbot.dto.KeywordAnalysisDto; // (C) FastAPI 내부 DTO
import com.prinCipal.chatbot.member.Member;
import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.CacheEvict;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Comparator;
import java.util.HashMap;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.databind.ObjectMapper; // JSON 변환

@Service
@RequiredArgsConstructor
public class SessionService {

	private final SessionRepository sessionRepository;
	private final ContentRepository contentRepository;
	private final KeywordRepository keywordAnalysisRepository;
	private final ChatService chatService;
	private final ObjectMapper objectMapper;

	private static final Logger logger = LoggerFactory.getLogger(SessionService.class);

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
			long updatedAtMillis = session.getLastMessageTime()
					.atZone(java.time.ZoneId.systemDefault()) // 서버의 기본 시간대로 ZoneId 설정
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
							.sorted(Comparator.comparing(CounsellingContent::getCreatedAt)).map(content -> {
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
	 * [수정] 메시지 저장 및 봇 응답 처리
	 */
	// 👈 [수정] 요청: ChatRequestDto (A) / 응답: ChatResponseDto (B)
	public ChatResponseDto addMessage(ChatRequestDto requestDto, Member member) {

	    CounsellingContent userMessage;
	    Long sessionId;

	    try {
	        // (A) 사용자 메시지 저장
	        userMessage = saveUserMessageAndUpdateSession(requestDto, member);
	        sessionId = userMessage.getSession().getSessionId();

	    } catch (RuntimeException e) {
	        logger.error("사용자 메시지 저장 실패 (DB 조회 오류): {}", e.getMessage());
	        // 에러 시 제목은 null
	        return new ChatResponseDto("메시지 전송에 실패했습니다. (세션 오류)", requestDto.getSessionId().toString(), null);
	    }

	    FastApiResponseDto fastApiResponse;

	    try {
	        // 1. FastAPI 호출
	        fastApiResponse = chatService.getFastApiResponse(requestDto);

	        // 2. 봇 응답 및 분석 내용 DB 저장
	        saveBotResponseAndAnalysis(userMessage, fastApiResponse);

	        // 3. 👈 [핵심 수정] 새 제목 가져오기
	        String newTitle = null;
	        if (fastApiResponse.getSessionUpdates() != null) {
	            newTitle = fastApiResponse.getSessionUpdates().getSummaryTitle();
	        }

	        // 4. (B) 프론트 응답 DTO 생성 (제목 포함)
	        return new ChatResponseDto(
	                fastApiResponse.getChatbotResponse().getContent(),
	                sessionId.toString(),
	                newTitle // 👈 여기에 새 제목을 담아서 보냄
	        );

	    } catch (Exception e) {
	        logger.error("FastAPI 챗봇 응답 또는 저장 실패 (세션 ID: {}): {}", sessionId, e.getMessage());
	        return new ChatResponseDto("죄송합니다. 봇 응답에 실패했습니다. (" + e.getMessage() + ")", sessionId.toString(), null);
	    }
	}

	/**
	 * [헬퍼 1] 사용자 메시지 저장
	 */
	@Transactional
	@CacheEvict(value = "initialData", key = "#member.userId")
	// 👈 [수정] (A) DTO 사용
	public CounsellingContent saveUserMessageAndUpdateSession(ChatRequestDto requestDto, Member member) {
		Long sessionId = requestDto.getSessionId().longValue();

		CounsellingSession session = sessionRepository.findBySessionIdAndMember(sessionId, member)
				.orElseThrow(() -> new RuntimeException("세션을 찾을 수 없거나 권한이 없습니다."));

		CounsellingContent userMessage = CounsellingContent.builder().session(session).sender(Sender.PERSON)
				.content(requestDto.getUserMessage()).build();
		contentRepository.save(userMessage);

		session.updateLastMessageTime(LocalDateTime.now());
		sessionRepository.save(session);

		return userMessage;
	}

	/**
	 * [헬퍼 2] 봇 메시지 및 키워드 저장
	 */
	@Transactional
	@CacheEvict(value = "initialData", key = "#userMessage.session.member.userId")
	public void saveBotResponseAndAnalysis(CounsellingContent userMessage, FastApiResponseDto fastApiResponse) {

		CounsellingSession session = userMessage.getSession();

		// 1. 봇 메시지 저장 (C) ChatbotResponseDto 사용
		CounsellingContent botMessage = CounsellingContent.builder().session(session).sender(Sender.CHATBOT)
				.content(fastApiResponse.getChatbotResponse().getContent()).build();
		contentRepository.save(botMessage);

		// 2. 키워드 분석 저장 (C) KeywordAnalysisDto 사용
		KeywordAnalysisDto analysisDto = fastApiResponse.getKeywordAnalysis();
		KeywordAnalysis analysis = KeywordAnalysis.builder().session(session).content(userMessage)
				.isDivorce(analysisDto.getIsDivorce()).emotionLabel(analysisDto.getEmotionLabel())
				.topic(analysisDto.getTopic()).intent(analysisDto.getIntent()).situation(analysisDto.getSituation())
				.retrievedData(convertMapToJsonString(analysisDto.getRetrievedData())).alertTriggered(false).build();
		keywordAnalysisRepository.save(analysis);

		// 3. 세션 업데이트 (C) SessionUpdatesDto 사용
		session.updateLastMessageTime(LocalDateTime.now());

		String newTitle = fastApiResponse.getSessionUpdates().getSummaryTitle();
		if (newTitle != null && !newTitle.isEmpty()
		        && (session.getSummaryTitle() == null || session.getSummaryTitle().equals("새 대화"))) {
		    session.updateSummaryTitle(newTitle); // AI 제목으로 업데이트
		}

		sessionRepository.save(session);
	}

	/**
	 * Map을 JSON 문자열로 변환
	 */
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

	// 사용자 전체 세션 삭제
	@Transactional
	public void deleteAllSessions(Member member) {
		// 이 사용자의 모든 세션을 찾음
		List<CounsellingSession> allSessions = sessionRepository.findByMemberOrderByLastMessageTimeDesc(member);

		if (!allSessions.isEmpty()) {
			sessionRepository.deleteAll(allSessions);
		}

	}

}