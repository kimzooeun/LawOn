package com.prinCipal.chatbot;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.prinCipal.chatbot.dto.ChatRequestDto;
import com.prinCipal.chatbot.dto.FastApiRequestDto;
import com.prinCipal.chatbot.dto.FastApiResponseDto;

import java.time.Duration;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ChatService {
	
	// 1. 비동기식 처리
	private final WebClient.Builder webClientBuilder;

    // 2. FastAPI 엔드포인트 주소 (docker-compose의 서비스 이름 사용)
    private final String FASTAPI_URL = "http://fastapi:8000/generate-response";

	public FastApiResponseDto getFastApiResponse(ChatRequestDto requestDto) {
	        
        // 1. 프론트에서 받은 메시지
        String userMessage = requestDto.getUserMessage();
        String sessionIdStr = requestDto.getSessionId().toString();
        
        // 2. FastAPI가 요구하는 DTO 형식으로 변환 ("query" 필드 사용)
        FastApiRequestDto fastApiRequest = new FastApiRequestDto(sessionIdStr,userMessage);
        
        // 3. (중요) WebClient로 비동기 POST 요청
        WebClient webClient = webClientBuilder.baseUrl(FASTAPI_URL).build();
        
        // 4. (중요) WebClient로 비동기 요청을 보낸 뒤, .block()으로 동기 대기
        try {
        	FastApiResponseDto fastApiResponse = webClient.post()
                    .uri("")
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .bodyValue(fastApiRequest)
                    .retrieve()
                    .bodyToMono(FastApiResponseDto.class) 
                    .timeout(Duration.ofSeconds(30)) 
                    .block(); 

                // 받은 객체를 변환하지 않고 그대로 반환합니다.
                if (fastApiResponse == null) {
                     throw new RuntimeException("FastAPI 응답이 null입니다.");
                }
                
                return fastApiResponse; // 복합 DTO 객체 자체를 반환

            } catch (Exception e) {
                // 예외 발생 시, SessionService가 처리할 수 있도록 throw
                throw new RuntimeException("FastAPI 봇 응답 실패: " + e.getMessage(), e);
            }

    	}
}