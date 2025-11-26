package com.prinCipal.chatbot.admin; // 패키지명은 본인 프로젝트에 맞게 수정

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminLogController {

	private final CounselService counselService;

	@GetMapping("/logs")
	public ResponseEntity<java.util.List<CounselLogDto>> getCounselLogs(@RequestParam(required = false) String username,
			@RequestParam(required = false) String status

	) {
		java.util.List<CounselLogDto> logs = counselService.findAllAdminLogs(username, status);

		return ResponseEntity.ok(logs);
	}
}