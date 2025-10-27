package com.prinCipal.chatbot;


import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.prinCipal.chatbot.dto.ChatRequest;
import com.prinCipal.chatbot.dto.ChatResponse;

@Service
public class chatService {

    private final ChatMessageLogRepository repo;

    public chatService(ChatMessageLogRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public ChatResponse handleChat(ChatRequest req) {
        // 1) 사용자 메세지 저장
        ChatMessageLog userMsg = new ChatMessageLog();
        userMsg.setSessionId(req.sessionId());
        userMsg.setUserId(req.userId());
        userMsg.setSender(ChatMessageLog.Sender.USER);
        userMsg.setMessageText(req.message());
        repo.save(userMsg);

        // 2) (임시) 봇 응답 생성 — 실제론 FastAPI 호출/LLM 결과 등을 넣으면 됨
        String botReply = "너가 말한 건: " + req.message();

        // 3) 봇 메세지 저장
        ChatMessageLog botMsg = new ChatMessageLog();
        botMsg.setSessionId(req.sessionId());
        botMsg.setUserId(req.userId());
        botMsg.setSender(ChatMessageLog.Sender.BOT);
        botMsg.setMessageText(botReply);
        repo.save(botMsg);

        return new ChatResponse(botReply);
    }
}

