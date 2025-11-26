package com.prinCipal.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FastApiRequestDto {
	private String session_id;
    private String query; // FastAPI(main.py)가 기대하는 필드명
    private String prev_summary;
}
