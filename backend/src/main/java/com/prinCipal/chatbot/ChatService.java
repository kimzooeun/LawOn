package com.prinCipal.chatbot;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.prinCipal.chatbot.dto.ChatRequestDto;
import com.prinCipal.chatbot.dto.ChatResponseDto;
import com.prinCipal.chatbot.dto.FastApiRequestDto;
import com.prinCipal.chatbot.dto.FastApiResponseDto;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ChatService {

    // 1. AppConfig에서 만든 RestTemplate을 주입받음
    private final RestTemplate restTemplate;

    // 2. FastAPI 엔드포인트 주소 (docker-compose의 서비스 이름 사용)
    private final String FASTAPI_URL = "http://fastapi:8000/generate-response";

	public ChatResponseDto getFastApiResponse(ChatRequestDto requestDto) {
	        
        // 1. 프론트에서 받은 메시지
        String userMessage = requestDto.getUserMessage();
        
        // 2. FastAPI가 요구하는 DTO 형식으로 변환 ("query" 필드 사용)
        FastApiRequestDto fastApiRequest = new FastApiRequestDto(userMessage);

        // 3. Http 헤더 설정
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<FastApiRequestDto> entity = new HttpEntity<>(fastApiRequest, headers);

        // 4. (중요) RestTemplate으로 FastAPI에 POST 요청
        FastApiResponseDto fastApiResponse = restTemplate.postForObject(
            FASTAPI_URL, 
            entity, 
            FastApiResponseDto.class
        );

        // 5. FastAPI로부터 받은 응답("final_response")을 추출
        String botAnswer = "오류가 발생했습니다."; // 기본값
        if (fastApiResponse != null && fastApiResponse.getFinal_response() != null) {
            botAnswer = fastApiResponse.getFinal_response();
        }

        // 6. 프론트엔드(chat.js)가 요구하는 DTO("text" 필드)로 변환하여 반환
        return new ChatResponseDto(botAnswer);
        }
}