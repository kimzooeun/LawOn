package com.prinCipal.chatbot.admin;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.prinCipal.chatbot.member.Member;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/list")
    public ResponseEntity<List<AdminDto>> getAdmins() {
        return ResponseEntity.ok(
                adminService.getAllAdmins()
                        .stream()
                        .map(AdminDto::fromEntity)
                        .toList()
        );
    }

    @GetMapping("/{nickname}")
    public ResponseEntity<AdminDto> getAdmin(@PathVariable String nickname) {
        Member admin = adminService.getAdminByNickname(nickname);
        if(admin == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(AdminDto.fromEntity(admin));
    }
}
