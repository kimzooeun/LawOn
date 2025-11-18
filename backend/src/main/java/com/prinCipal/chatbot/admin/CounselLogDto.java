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
    private Long userid;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
	private String nickname;

    public static CounselLogDto fromEntity(CounsellingSession s) {
        CounselLogDto dto = new CounselLogDto();
        dto.userid = s.getSessionId();
        dto.nickname = s.getMember().getNickname();
        dto.startTime = s.getStartTime();
        dto.endTime = s.getEndTime();
        dto.status = s.getCompletionStatus().name();
        return dto;
    }

}
