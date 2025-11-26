package com.prinCipal.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RecentDto { 
    private Long id;
    private String title;
    private long lastMessageTime;
}