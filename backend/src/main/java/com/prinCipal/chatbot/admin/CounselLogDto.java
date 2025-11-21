package com.prinCipal.chatbot.admin;

import com.prinCipal.chatbot.counsel.CounsellingSession;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.format.DateTimeFormatter;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CounselLogDto {
	private Long id; // 프론트에서 사용할 ID (DB의 session_id)
	private String nickname; // 사용자 닉네임
	private String startTime; // 시작 시간 (문자열)
	private String endTime; // 종료 시간 (문자열)
	private String status; // 상태 (ONGOING, END 등)

	// 팀원의 Entity -> 내 DTO 변환 메서드
	public static CounselLogDto fromEntity(CounsellingSession s) {
		DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

		// 닉네임 안전하게 꺼내기 (Member가 null일 경우 대비)
		String userNickname = (s.getMember() != null) ? s.getMember().getNickname() : "(알수없음)";

		// 상태값 문자열로 변환
		String statusStr = (s.getCompletionStatus() != null) ? s.getCompletionStatus().name() : "UNKNOWN";

		return CounselLogDto.builder().id(s.getSessionId()).nickname(userNickname)
				.startTime(s.getStartTime() != null ? s.getStartTime().format(formatter) : "-")
				.endTime(s.getEndTime() != null ? s.getEndTime().format(formatter) : "-").status(statusStr).build();
	}
}