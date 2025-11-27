package com.prinCipal.chatbot.admin;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.prinCipal.chatbot.exception.NotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LawyerService {

	private final LawyerRepository lawyerRepository;
	private final S3PreSignedService s3PreSignedService;
	
	public List<Lawyer> getAllLawyers() {
		return lawyerRepository.findAll();
	}

	public Lawyer addLawyer(Lawyer lawyer) {
		return lawyerRepository.save(lawyer);
	}

	
	@Transactional
	public Lawyer updateLawyer(Long id, Lawyer updated) {
		Lawyer lawyer = lawyerRepository.findById(id).orElseThrow(() -> new NotFoundException("변호사를 찾을 수 없습니다. id=" + id));

		
		// 이미지 교체 감지
		String oldImageUrl = lawyer.getImageUrl();
		String newImageUrl = updated.getImageUrl();
		
		if(newImageUrl != null && !newImageUrl.equals(oldImageUrl)) {
			//기존 이미지 S3에서 삭제 
			this.s3PreSignedService.deleteByImageUrl(oldImageUrl);
			lawyer.setImageUrl(newImageUrl);
		}
		
		lawyer.setName(updated.getName());
		lawyer.setGender(updated.getGender());
		lawyer.setDetailSpecialty(updated.getDetailSpecialty());
		lawyer.setDescription(updated.getDescription());
		lawyer.setContact(updated.getContact());
		lawyer.setOffice(updated.getOffice());
		lawyer.setOfficeLocation(updated.getOfficeLocation());

		return lawyerRepository.save(lawyer);
	}
	
	
	@Transactional
	public void deleteLawyer(Long id) {
		Lawyer lawyer = lawyerRepository.findById(id).orElseThrow(() -> new NotFoundException("변호사를 찾을 수 없습니다. id=" + id));
		String imageUrl = lawyer.getImageUrl();
		
		// DB 삭제 전, S3 이미지 삭제 시도 
		this.s3PreSignedService.deleteByImageUrl(imageUrl);
		
		lawyerRepository.delete(lawyer);
	}
}
