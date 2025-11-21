package com.prinCipal.chatbot.admin;

import java.util.List;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LawyerService {

	private final LawyerRepository lawyerRepository;

	@Value("${file.upload-dir}")
	private String uploadDir;

	public List<Lawyer> getAllLawyers() {
		return lawyerRepository.findAll();
	}

	public Lawyer addLawyer(Lawyer lawyer) {
		return lawyerRepository.save(lawyer);
	}

	public Lawyer updateLawyer(Long id, Lawyer updated) {
		Lawyer lawyer = lawyerRepository.findById(id).orElseThrow(() -> new RuntimeException("존재하지 않는 변호사"));

		lawyer.setName(updated.getName());
		lawyer.setGender(updated.getGender());
		lawyer.setDetailSpecialty(updated.getDetailSpecialty());
		lawyer.setDescription(updated.getDescription());
		lawyer.setContact(updated.getContact());
		lawyer.setOffice(updated.getOffice());
		lawyer.setOfficeLocation(updated.getOfficeLocation());
		lawyer.setImageUrl(updated.getImageUrl());

		return lawyerRepository.save(lawyer);
	}

	public void deleteLawyer(Long id) {
		lawyerRepository.deleteById(id);
	}

	// 이미지 업로드 메소드 (전체 교체)
	
	public String uploadImage(MultipartFile file) {
		if (file.isEmpty()) {
			throw new RuntimeException("파일이 비어있습니다.");
		}

		try {
			// 1. 변호사 이미지 전용 하위 폴더 이름
			String subFolder = "lawyers";

			// 2. 고유한 파일 이름 생성
			String originalName = file.getOriginalFilename();
			String fileName = System.currentTimeMillis() + "_" + originalName;

			// 3. (중요) 설정된 절대 경로와 하위 폴더를 조합하여 저장할 디렉터리 경로 생성
			// 예: ./uploads/lawyers
			Path directoryPath = Paths.get(uploadDir, subFolder).toAbsolutePath().normalize();

			// 4. (중요) 디렉터리가 없으면 생성 (이것이 FileNotFoundException을 해결)
			Files.createDirectories(directoryPath);

			// 5. 실제 파일이 저장될 전체 경로
			// 예: ./uploads/lawyers/12345_image.jpg
			Path filePath = directoryPath.resolve(fileName);

			// 6. 파일 저장
			file.transferTo(filePath.toFile());

			// 7. 클라이언트(브라우저)가 접근할 수 있는 URL 경로 반환
			// 1단계에서 설정한 spring.mvc.static-path-pattern과 일치해야 함
			// 예: /uploads/lawyers/12345_image.jpg
			return "/" + "uploads" + "/" + subFolder + "/" + fileName;

		} catch (IOException e) {
			// IOException으로 변경
			throw new RuntimeException("파일 업로드 실패", e);
		}
	}
}
