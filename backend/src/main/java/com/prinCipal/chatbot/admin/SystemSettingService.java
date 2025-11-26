package com.prinCipal.chatbot.admin;

import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.prinCipal.chatbot.member.Member;
import com.prinCipal.chatbot.member.MemberRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SystemSettingService {

	private final SystemSettingRepository systemSettingRepository;
	private final PasswordEncoder passwordEncoder;
	private final MemberRepository memberRepository;

	// 전체 설정 조회
	public List<SystemSetting> getAllSettings() {
		return systemSettingRepository.findAll();
	}

	public boolean changeAdminPassword(Long adminId, String currentPw, String newPw) {

		// 로그인한 관리자 계정 조회
		Member admin = memberRepository.findById(adminId).orElseThrow(() -> new RuntimeException("관리자 계정을 찾을 수 없습니다."));

		// 현재 비밀번호 검증
		if (!passwordEncoder.matches(currentPw, admin.getPassword())) {
			return false;
		}

		// 새 비밀번호 저장
		admin.setPassword(passwordEncoder.encode(newPw));
		memberRepository.save(admin);

		return true;
	}

}
