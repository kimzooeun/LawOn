package com.prinCipal.chatbot.admin;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CounselService {

    private final CounselLogRepository counselRepo;

    // 상담 시작 시 로그 생성
    public CounselLog startCounsel(Long userId, String nickname) {
        CounselLog log = CounselLog.builder()
                .userId(userId)
                .userNickname(nickname)
                .startTime(LocalDateTime.now())
                .status("진행 중")
                .build();
        return counselRepo.save(log);
    }

    // 상담 종료 시 상태 업데이트
    public void endCounsel(Long logId) {
        counselRepo.findById(logId).ifPresent(log -> {
            log.setEndTime(LocalDateTime.now());
            log.setStatus("완료");
            counselRepo.save(log);
        });
    }
}

