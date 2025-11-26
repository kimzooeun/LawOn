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
	private final S3Uploader s3Uploader;
	
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
	@PostMapping("/upload")
	public ResponseEntity<String> uploadImage(@RequestParam("image") MultipartFile file) {
		  System.out.println("🔥 업로드 컨트롤러 도착!");
		    System.out.println("🔥 파일 null? " + (file == null));
		    System.out.println("🔥 파일 isEmpty? " + (file != null && file.isEmpty()));
		    if (file != null) {
		        System.out.println("🔥 originalFilename = " + file.getOriginalFilename());
		        System.out.println("🔥 size = " + file.getSize());
		    }

		    // 🔥🔥 임시: S3 안 타고 바로 성공 응답
		    return ResponseEntity.ok("TEMP_OK");
		    
	}
//		try {
//			String imageUrl = s3Uploader.upload(file,"lawyers");
//			return ResponseEntity.ok(imageUrl);
//		} catch (Exception e) {
//			e.printStackTrace();  
//		    throw e;
//			// return ResponseEntity.status(500).body("변호사 이미지 업로드 실패");
//		}
//	}

}
