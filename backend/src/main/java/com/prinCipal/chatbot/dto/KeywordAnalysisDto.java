package com.prinCipal.chatbot.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

// public 클래스로 선언
@Data
@NoArgsConstructor
public class KeywordAnalysisDto {
    private Boolean isDivorce;
    private String emotionLabel;
    private String topic;
    private String intent;
    private String situation;
    private Map<String, Object> retrievedData; 
    private String alertSeverity;
}
