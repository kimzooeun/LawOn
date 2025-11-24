package com.prinCipal.chatbot.admin;

// 팀원의 패키지 import (경로 확인!)
import com.prinCipal.chatbot.counsel.CounsellingSession;
import com.prinCipal.chatbot.counsel.SessionRepository;
import com.prinCipal.chatbot.member.MemberRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

	private final SessionRepository sessionRepository;
	private final MemberRepository memberRepository;
	private final LawyerRepository lawyerRepository; // 변호사 통계용

	// 대시보드 요약 데이터 - 전체 회원 수 - 전체 상담 수 - 오늘 상담 수 - 전체 변호사 수
	@Transactional(readOnly = true)
	public Map<String, Long> getDashboardSummary() {

		long totalMembers = memberRepository.count(); // 전체 회원
		long totalCounsels = sessionRepository.count(); // 전체 상담
		long totalLawyers = lawyerRepository.count(); // 변호사 수

		// 오늘 상담 수
		LocalDate today = LocalDate.now();
		LocalDateTime startOfToday = today.atStartOfDay();
		LocalDateTime endOfToday = today.atTime(23, 59, 59);

		long todayCounsels = sessionRepository.countByStartTimeBetween(startOfToday, endOfToday);

		return Map.of("totalMembers", totalMembers, "totalCounsels", totalCounsels, "todayCounsels", todayCounsels,
				"totalLawyers", totalLawyers);
	}

	// 최근 상담 로그 목록 조회 (최신순 10개)
	@Transactional(readOnly = true)
	public List<CounselLogDto> getRecentLogs() {
		// 1. DB에서 최근 상담 세션 10개 조회 (start_time 기준 내림차순)
		// PageRequest.of(페이지번호 0, 개수 10, 정렬)
		List<CounsellingSession> sessions = sessionRepository
				.findAll(PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "startTime"))).getContent();

		// Entity 리스트를 DTO 리스트로 변환 (CounselLogDto.fromEntity 메서드 활용)
		return sessions.stream().map(CounselLogDto::fromEntity).collect(Collectors.toList());
	}
}