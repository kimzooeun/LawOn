package com.prinCipal.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List; 

@Data
@AllArgsConstructor
public class SessionDataDto { 
    private Long id;
    private String title;
    private List<MessageDto> messages; // 같은 패키지라 MessageDto 자동 인식
}