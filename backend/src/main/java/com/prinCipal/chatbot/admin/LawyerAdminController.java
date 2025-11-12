package com.prinCipal.chatbot.admin;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/lawyers")
@RequiredArgsConstructor
public class LawyerAdminController {

    private final LawyerService lawyerService;

    @GetMapping
    public ResponseEntity<List<Lawyer>> getAllLawyers() {
        return ResponseEntity.ok(lawyerService.getAllLawyers());
    }
    
    @GetMapping("/search")
    public ResponseEntity<List<Lawyer>> searchLawyers(@RequestParam String keyword) {
        return ResponseEntity.ok(lawyerService.searchLawyers(keyword));
    }
    
    @PostMapping
    public ResponseEntity<Lawyer> addLawyer(@RequestBody Lawyer lawyer) {
    	System.out.println("변호사정보" + lawyer.getName());
        return ResponseEntity.ok(lawyerService.addLawyer(lawyer));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Lawyer> updateLawyer(@PathVariable Long id, @RequestBody Lawyer updatedLawyer) {
        Lawyer saved = lawyerService.updateLawyer(id, updatedLawyer);
        return ResponseEntity.ok(saved);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLawyer(@PathVariable Long id) {
        lawyerService.deleteLawyer(id);
        return ResponseEntity.noContent().build();
    }
}
