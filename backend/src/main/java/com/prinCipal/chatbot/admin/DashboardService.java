//package com.prinCipal.chatbot.admin;
//
//import lombok.RequiredArgsConstructor;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//
//import com.prinCipal.chatbot.counsel.SessionRepository;
//import com.prinCipal.chatbot.member.MemberRepository;
//
//import java.time.LocalDate;
//import java.time.LocalDateTime;
//import java.util.List;
//import java.util.stream.Collectors;
//
//@Service
//@RequiredArgsConstructor
//public class DashboardService {
//
//	
//    private final SessionRepository sessionRepo;
//    private final MemberRepository memberRepository; 
//    private final LawyerRepository lawyerRepository;
//    // 최근 상담 리스트
//    
//    @Transactional(readOnly = true)
//    public List<CounselLogDto> getRecentLogs() {
//        return sessionRepo.findTop20ByOrderByStartTimeDesc()
//            .stream()
//            .map(CounselLogDto::fromEntity)
//            .toList();
//    }
//
// // 대시보드 Summary
//    public DashboardSummaryDto getSummary() {
//
//        // 🔥 1. 회원 수 (nicknameCount == memberCount)
//        long nicknameCount = memberRepository.count();
//
//        // 🔥 2. 변호사 수
//        long lawyerCount = lawyerRepository.count();
//
//        // 🔥 3. 상담 총합 + 오늘 상담
//        LocalDateTime start = LocalDate.now().atStartOfDay();
//        LocalDateTime end = start.plusDays(1);
//
//        long total = sessionRepo.count(); 
//        // long today = sessionRepo.countByStartTimeBetween(start, end);
//
//        // 🔥 4. DTO 반환
//        return new DashboardSummaryDto(
//                nicknameCount,
//                lawyerCount,
//                total
//                // ,
//                //today
//        );
//    }
//}
//
