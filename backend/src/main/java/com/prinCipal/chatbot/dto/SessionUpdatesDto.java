package com.prinCipal.chatbot.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

// public 클래스로 선언
@Data
@NoArgsConstructor
public class SessionUpdatesDto {
    private String summaryTitle;
    private String summary;
}
