package com.prinCipal.chatbot;

import jakarta.persistence.*;
import java.sql.Timestamp;

@Entity
@Table(name = "ChatMessageLog")
public class ChatMessageLog {

    public enum Sender { USER, BOT }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id")
    private Integer messageId;

    @Column(name = "session_id", nullable = false)
    private Integer sessionId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender", nullable = false, length = 10)
    private Sender sender;

    @Lob
    @Column(name = "message_text", nullable = false, columnDefinition = "TEXT")
    private String messageText;

    @Column(name = "intent", length = 100)
    private String intent;

    @Column(name = "emotion_label", length = 50)
    private String emotionLabel;

    @Column(name = "confidence")
    private Float confidence;

    // DB가 DEFAULT CURRENT_TIMESTAMP로 넣어주니, JPA는 건드리지 않게!
    @Column(name = "created_at", insertable = false, updatable = false)
    private Timestamp createdAt;

    // --- getters/setters ---
    public Integer getMessageId() { return messageId; }
    public Integer getSessionId() { return sessionId; }
    public void setSessionId(Integer sessionId) { this.sessionId = sessionId; }
    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }
    public Sender getSender() { return sender; }
    public void setSender(Sender sender) { this.sender = sender; }
    public String getMessageText() { return messageText; }
    public void setMessageText(String messageText) { this.messageText = messageText; }
    public String getIntent() { return intent; }
    public void setIntent(String intent) { this.intent = intent; }
    public String getEmotionLabel() { return emotionLabel; }
    public void setEmotionLabel(String emotionLabel) { this.emotionLabel = emotionLabel; }
    public Float getConfidence() { return confidence; }
    public void setConfidence(Float confidence) { this.confidence = confidence; }
    public Timestamp getCreatedAt() { return createdAt; }
}
