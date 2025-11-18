package com.prinCipal.chatbot.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder // 컨트롤러에서 .builder()를 사용하기 위해 필수
public class SessionCreationResponse {
    private Long id;
    private String title;
    private List<MessageDto> messages; // SessionDataDto와 동일하게 MessageDto 리스트
}
