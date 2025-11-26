package com.prinCipal.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class FastApiRequestDto {
    private String query; // FastAPI(main.py)가 기대하는 필드명
}
