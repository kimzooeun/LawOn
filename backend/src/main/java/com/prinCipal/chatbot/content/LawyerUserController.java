package com.prinCipal.chatbot.content;

import com.prinCipal.chatbot.admin.Lawyer;
import com.prinCipal.chatbot.admin.LawyerService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/lawyers")
@RequiredArgsConstructor
public class LawyerUserController {

    private final LawyerService lawyerService; // import 했기 때문에 사용 가능

    @GetMapping
    public ResponseEntity<List<Lawyer>> getPublicLawyers() {
        return ResponseEntity.ok(lawyerService.getAllLawyers());
    }
}