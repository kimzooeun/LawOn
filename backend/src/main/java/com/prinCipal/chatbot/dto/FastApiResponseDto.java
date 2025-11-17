package com.prinCipal.chatbot.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;

//FastAPI가 어떤 JSON으로 응답하는지에 따라 수정해야 합니다.
//예: {"answer": "모델 답변입니다."}
@JsonIgnoreProperties(ignoreUnknown = true) 
@Getter
public class FastApiResponseDto {
    // 필드 이름 수정 (answer -> final_response)
    private String final_response;
}
