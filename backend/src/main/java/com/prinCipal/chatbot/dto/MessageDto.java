package com.prinCipal.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.time.LocalDateTime; 

@Data
@AllArgsConstructor
public class MessageDto { 
    private String role; // "user" 또는 "bot"
    private String text;
    private LocalDateTime at;
}