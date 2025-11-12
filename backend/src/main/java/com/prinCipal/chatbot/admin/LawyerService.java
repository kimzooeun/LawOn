package com.prinCipal.chatbot.admin;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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

    public void deleteLawyer(Long id) {
        lawyerRepository.deleteById(id);
    }

    public Lawyer updateLawyer(Long id, Lawyer updatedLawyer) {
        Lawyer lawyer = lawyerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("변호사를 찾을 수 없습니다."));

        lawyer.setName(updatedLawyer.getName());
        lawyer.setSpecialty(updatedLawyer.getSpecialty());
        lawyer.setOffice(updatedLawyer.getOffice());
        lawyer.setOfficeLocation(updatedLawyer.getOfficeLocation());
        lawyer.setContact(updatedLawyer.getContact());
        lawyer.setActive(updatedLawyer.isActive());
        lawyer.setImageUrl(updatedLawyer.getImageUrl());

        return lawyerRepository.save(lawyer);
    }
    
    public List<Lawyer> searchLawyers(String keyword) {
        return lawyerRepository.findByNameContainingIgnoreCaseOrSpecialtyContainingIgnoreCaseOrOfficeContainingIgnoreCaseOrOfficeLocationContainingIgnoreCase(
                keyword, keyword, keyword, keyword
        );
    }
}
