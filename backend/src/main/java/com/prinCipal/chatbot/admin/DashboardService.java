package com.prinCipal.chatbot.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import com.prinCipal.chatbot.member.MemberRepository;

import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final MemberRepository memberRepo;
    private final LawyerRepository lawyerRepo;
    private final CounselLogRepository counselRepo;

    // ✅ 누적 + 오늘 상담 수 모두 포함
    public Map<String, Long> getDashboardSummary() {
        Map<String, Long> map = new HashMap<>();
        map.put("userCount", memberRepo.count());
        map.put("lawyerCount", lawyerRepo.count());
        map.put("chatTotalCount", counselRepo.count()); // 누적 상담 수
        map.put("chatTodayCount", counselRepo.countTodayCounselLogs()); // 오늘 상담 수
        return map;
    }
}
