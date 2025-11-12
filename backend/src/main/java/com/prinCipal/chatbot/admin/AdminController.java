package com.prinCipal.chatbot.admin;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import lombok.RequiredArgsConstructor;

import com.prinCipal.chatbot.admin.AdminDto;
import com.prinCipal.chatbot.admin.AdminService;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/list")
    public ResponseEntity<List<AdminDto>> getAllAdmins() {
        return ResponseEntity.ok(adminService.getAllAdmins());
    }

    @GetMapping("/{username}")
    public ResponseEntity<AdminDto> getAdmin(@PathVariable String username) {
        return ResponseEntity.ok(adminService.getAdminByUsername(username));
    }
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        if ("admin01".equals(req.getUsername()) && "todak1234".equals(req.getPassword())) {
            return ResponseEntity.ok(Map.of("message", "success"));
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                 .body(Map.of("message", "failed"));
        }
    }

    @PostMapping("/create")
    public ResponseEntity<AdminDto> createAdmin(@RequestBody AdminDto dto) {
        return ResponseEntity.ok(adminService.createAdmin(dto));
    }

    @PutMapping("/{id}/active")
    public ResponseEntity<AdminDto> toggleActive(@PathVariable Long id, @RequestParam boolean active) {
        return ResponseEntity.ok(adminService.toggleActive(id, active));
    }
}
