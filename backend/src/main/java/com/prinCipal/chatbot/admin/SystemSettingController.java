package com.prinCipal.chatbot.admin;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import com.prinCipal.chatbot.admin.AdminDto.ChangePasswordRequest;
import com.prinCipal.chatbot.oauth2.CustomOAuth2User;
import com.prinCipal.chatbot.security.JwtTokenProvider;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class SystemSettingController {

	private final SystemSettingService systemSettingService;
	private final AdminMemberService adminMemberService;

	// 전체 설정 조회
	@GetMapping
	public List<SystemSetting> getAllSettings() {
		return systemSettingService.getAllSettings();
	}

	@PostMapping("/change-password")
	public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest body,
			@AuthenticationPrincipal CustomOAuth2User customOAuth2User) {
		// 로그인 정보 없는 경우
		if (customOAuth2User == null || customOAuth2User.getMember() == null) {
			return ResponseEntity.status(401).body("인증 정보가 없습니다.");
		}

		// 현재 로그인한 관리자 ID
		Long adminId = customOAuth2User.getMember().getUserId();

		String currentPw = body.getCurrentPassword();
		String newPw = body.getNewPassword();

		if (currentPw == null || newPw == null) {
			return ResponseEntity.badRequest().body("모든 필드가 필요합니다.");
		}

		boolean result = systemSettingService.changeAdminPassword(adminId, currentPw, newPw);

		if (!result) {
			return ResponseEntity.status(400).body("현재 비밀번호가 일치하지 않습니다.");
		}

		return ResponseEntity.ok("비밀번호가 변경되었습니다.");
	}

}