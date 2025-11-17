package com.prinCipal.chatbot.admin;

import java.time.LocalDateTime;

import com.prinCipal.chatbot.counsel.CounsellingSession;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter 
@Builder
@AllArgsConstructor 
@NoArgsConstructor
public class CounselLogDto {
    private Long id;
    private LocalDateTime start;
    private LocalDateTime end;
    private String status;
	private String nickname;

    public static CounselLogDto fromEntity(CounsellingSession s) {
        CounselLogDto dto = new CounselLogDto();
        dto.id = s.getSessionId();
        dto.nickname = s.getMember().getNickname();
        dto.start = s.getStartTime();
        dto.end = s.getEndTime();
        dto.status = s.getCompletionStatus().name();
        return dto;
    }

}
