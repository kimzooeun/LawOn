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

	// keyName으로 단일 설정 조회
	public Optional<SystemSetting> getSettingByKey(String keyName) {
		return systemSettingRepository.findByKeyName(keyName);
	}

	// keyName으로 설정값 가져오기 (value만)
	public String getValue(String keyName) {
		return systemSettingRepository.findByKeyName(keyName).map(SystemSetting::getValue).orElse(null);
	}

	// 설정 저장 또는 갱신
	public SystemSetting saveOrUpdate(String keyName, String value) {
		SystemSetting setting = systemSettingRepository.findByKeyName(keyName)
				.orElseGet(() -> SystemSetting.builder().keyName(keyName).build());

		setting.setValue(value);

		return systemSettingRepository.save(setting);
	}

	// 특정 키 삭제
	public void deleteByKey(String keyName) {
		systemSettingRepository.findByKeyName(keyName).ifPresent(systemSettingRepository::delete);
	}

	public boolean changeAdminPassword(String currentPw, String newPw) {

		// 1) admin 계정 단일 조회 (기본값 1번 또는 username=admin)
		Member admin = memberRepository.findByNickname("admin")
				.orElseThrow(() -> new RuntimeException("관리자 계정을 찾을 수 없습니다."));

		// 2) 현재 비밀번호 비교
		if (!passwordEncoder.matches(currentPw, admin.getPassword())) {
			return false; // 불일치
		}

		// 3) 새 비밀번호 암호화 후 저장
		admin.setPassword(passwordEncoder.encode(newPw));
		memberRepository.save(admin);

		return true;
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
