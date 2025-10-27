package com.prinCipal.chatbot.dto;

public record ChatRequest(Integer sessionId, Integer userId, String message) {}
