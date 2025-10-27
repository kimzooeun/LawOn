package com.prinCipal.chatbot;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.prinCipal.chatbot.dto.ChatRequest;
import com.prinCipal.chatbot.dto.ChatResponse;

@RestController
public class ChatController {

    private final chatService service;

    public ChatController(chatService service) {
        this.service = service;
    }

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        return ResponseEntity.ok(service.handleChat(request));
    }
}
