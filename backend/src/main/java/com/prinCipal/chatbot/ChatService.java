package com.prinCipal.chatbot;

import org.springframework.stereotype.Service;
//import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;

import com.prinCipal.chatbot.dto.ChatRequestDto;
import com.prinCipal.chatbot.dto.ChatResponseDto;
import com.prinCipal.chatbot.dto.FastApiRequestDto;
import com.prinCipal.chatbot.dto.FastApiResponseDto;

import java.time.Duration;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import lombok.RequiredArgsConstructor;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class ChatService {

    // 1. AppConfig에서 만든 RestTemplate을 주입받음 => 동기식 처리
//    private final RestTemplate restTemplate;
	
	// 1. 비동기식 처리
	private final WebClient.Builder webClientBuilder;

    // 2. FastAPI 엔드포인트 주소 (docker-compose의 서비스 이름 사용)
    private final String FASTAPI_URL = "http://fastapi:8000/generate-response";

	public ChatResponseDto getFastApiResponse(ChatRequestDto requestDto) {
	        
        // 1. 프론트에서 받은 메시지
        String userMessage = requestDto.getUserMessage();
        
        // 2. FastAPI가 요구하는 DTO 형식으로 변환 ("query" 필드 사용)
        FastApiRequestDto fastApiRequest = new FastApiRequestDto(userMessage);
        
        // 3. (중요) WebClient로 비동기 POST 요청
        WebClient webClient = webClientBuilder.baseUrl(FASTAPI_URL).build();
        
        // 4. (중요) WebClient로 비동기 요청을 보낸 뒤, .block()으로 동기 대기
        try {
            FastApiResponseDto fastApiResponse = webClient.post()
                .uri("")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .bodyValue(fastApiRequest)
                .retrieve() // (응답 받기)
                .bodyToMono(FastApiResponseDto.class) // (응답을 Mono로 받음)
                .timeout(Duration.ofSeconds(30)) // 👈 (안전장치) 30초 이상 걸리면 타임아웃
                .block(); // 👈 "이곳에서 작업이 끝날 때까지 멈춰서 기다림"

            // 5. FastAPI로부터 받은 응답("final_response")을 추출
            String botAnswer = "오류가 발생했습니다."; // 기본값
            if (fastApiResponse != null && fastApiResponse.getFinal_response() != null) {
                botAnswer = fastApiResponse.getFinal_response();
            }

            // 6. 프론트엔드(chat.js)가 요구하는 DTO로 변환하여 반환
            return new ChatResponseDto(botAnswer, requestDto.getSessionId().toString());

        } catch (Exception e) {
            // (WebClient 예외 또는 .block() 타임아웃 발생 시)
            return new ChatResponseDto("죄송합니다. 봇 응답에 실패했습니다.", requestDto.getSessionId().toString());
        }

//        // 3. Http 헤더 설정
//        HttpHeaders headers = new HttpHeaders();
//        headers.setContentType(MediaType.APPLICATION_JSON);
//        
//        HttpEntity<FastApiRequestDto> entity = new HttpEntity<>(fastApiRequest, headers);
//
//        // 4. (중요) RestTemplate으로 FastAPI에 POST 요청
//        FastApiResponseDto fastApiResponse = restTemplate.postForObject(
//            FASTAPI_URL, 
//            entity, 
//            FastApiResponseDto.class
//        );
//
//        // 5. FastAPI로부터 받은 응답("final_response")을 추출
//        String botAnswer = "오류가 발생했습니다."; // 기본값
//        if (fastApiResponse != null && fastApiResponse.getFinal_response() != null) {
//            botAnswer = fastApiResponse.getFinal_response();
//        }
//
//        // 6. 프론트엔드(chat.js)가 요구하는 DTO("text" 필드)로 변환하여 반환
//        return new ChatResponseDto(botAnswer, requestDto.getSessionId().toString());
    	}
}