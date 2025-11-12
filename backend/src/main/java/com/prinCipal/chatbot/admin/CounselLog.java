package com.prinCipal.chatbot.admin;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;

@Entity
@Table(name = "counsel_log")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CounselLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 사용자 닉네임
    private String userNickname;

    // 사용자 아이디 (선택)
    private String userId;

    // 상담 시작 시간
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;

    // 상담 종료 시간
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime endTime;

    // 상태 (진행중 / 완료 / 취소 등)
    private String status;
}
