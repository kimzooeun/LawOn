package com.prinCipal.chatbot.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RecentDto { // 3. 'static' 제거
    private Long id;
    private String title;
    private LocalDateTime lastMessageTime;
}