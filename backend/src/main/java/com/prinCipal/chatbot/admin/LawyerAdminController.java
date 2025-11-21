package com.prinCipal.chatbot.admin;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/lawyers")
@RequiredArgsConstructor
public class LawyerAdminController {

	private final LawyerService lawyerService;
	
	/* 전체 변호사 조회 */
	@GetMapping
	public ResponseEntity<List<Lawyer>> getAllLawyers() {
		return ResponseEntity.ok(lawyerService.getAllLawyers());
	}

	/* 변호사 등록 */
	@PostMapping
	public ResponseEntity<Lawyer> addLawyer(@RequestBody Lawyer lawyer) {
		System.out.println("변호사 등록 요청: " + lawyer.getName());
		return ResponseEntity.ok(lawyerService.addLawyer(lawyer));
	}

	/* 변호사 정보 수정 */
	@PutMapping("/{id}")
	public ResponseEntity<Lawyer> updateLawyer(@PathVariable Long id, @RequestBody Lawyer updatedLawyer) {
		return ResponseEntity.ok(lawyerService.updateLawyer(id, updatedLawyer));
	}

	/* 변호사 삭제 */
	@DeleteMapping("/{id}")
	public ResponseEntity<Void> deleteLawyer(@PathVariable Long id) {
		lawyerService.deleteLawyer(id);
		return ResponseEntity.noContent().build();
	}

	/* 이미지 업로드 */
//	@PostMapping("/upload")
//	public ResponseEntity<String> uploadImage(@RequestParam("image") MultipartFile file) {
//		String imageUrl = lawyerService.uploadImage(file);
//		return ResponseEntity.ok(imageUrl);
//	}

}
