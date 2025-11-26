package com.prinCipal.chatbot.admin;

import java.util.List;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LawyerService {

	private final LawyerRepository lawyerRepository;

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
}
