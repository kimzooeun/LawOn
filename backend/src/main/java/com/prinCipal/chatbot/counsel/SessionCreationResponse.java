package com.prinCipal.chatbot.counsel;

import lombok.Builder;
import lombok.Getter;
import java.util.List;

@Getter
@Builder
public class SessionCreationResponse {
    private Long id;       		// 세션 ID 
    private String title;  		// "새 대화"
    private List<?> messages; 	// 빈 리스트
}
