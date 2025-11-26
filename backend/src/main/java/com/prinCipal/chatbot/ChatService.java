package com.prinCipal.chatbot;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.prinCipal.chatbot.dto.ChatRequestDto;
import com.prinCipal.chatbot.dto.FastApiRequestDto;
import com.prinCipal.chatbot.dto.FastApiResponseDto;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import lombok.RequiredArgsConstructor;

import java.util.Map;
import java.util.HashMap;

@Service
@RequiredArgsConstructor
public class ChatService {
	
	// 1. 비동기식 처리
	private final WebClient.Builder webClientBuilder;

    // 2. FastAPI 엔드포인트 주소 (docker-compose의 서비스 이름 사용)
    private final String FASTAPI_URL = "http://fastapi:8000";
    
    private static final Logger logger = LoggerFactory.getLogger(ChatService.class);

    /**
     * 1. 일반 대화 요청 (prevSummary를 인자로 받음)
     */
	public FastApiResponseDto getFastApiResponse(ChatRequestDto requestDto, String prevSummary) { // 👈 인자 추가
		
        String userMessage = requestDto.getUserMessage();
        String sessionIdStr = requestDto.getSessionId().toString();
        
        // FastAPI DTO 생성 (이제 인자로 받은 prevSummary를 사용)
        FastApiRequestDto fastApiRequest = FastApiRequestDto.builder()
                .session_id(sessionIdStr)
                .query(userMessage)
                .prev_summary(prevSummary) // 👈 SessionService가 넘겨준 값
                .build();
        
        return webClientBuilder.baseUrl(FASTAPI_URL).build()
                .post()
                .uri("/generate-response")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .bodyValue(fastApiRequest)
                .retrieve()
                .bodyToMono(FastApiResponseDto.class) 
                .timeout(Duration.ofSeconds(60)) 
                .block(); 
	}
    
    /**
     * 2. [추가] 최종 리포트 생성 요청 (상담 종료 시 호출)
     */
    public String getFinalReport(String sessionId, String prevSummary) {
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("session_id", sessionId);
        requestBody.put("prev_summary", prevSummary);

        try {
            Map response = webClientBuilder.baseUrl(FASTAPI_URL).build()
                    .post()
                    .uri("/generate-report") // 👈 FastAPI의 리포트 생성 엔드포인트
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && response.containsKey("final_report")) {
                return (String) response.get("final_report");
            }
            return null;
        } catch (Exception e) {
        	
        	logger.error("최종 리포트 생성 실패 (SessionId: {}): {}", sessionId, e.getMessage());
            return null;
        }
    }
}