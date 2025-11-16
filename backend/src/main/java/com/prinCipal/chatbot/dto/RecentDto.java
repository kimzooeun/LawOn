package com.prinCipal.chatbot.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RecentDto { 
    private Long id;
    private String title;
    private LocalDateTime lastMessageTime;
}