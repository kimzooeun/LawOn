package com.prinCipal.chatbot.admin;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

   @GetMapping("/summary")
    public ResponseEntity<Map<String, Long>> getSummary() {
        return ResponseEntity.ok(adminDashboardService.getDashboardSummary());
    }
   
   @GetMapping("/logs")
   public ResponseEntity<List<CounselLogDto>> getLogs() {
       return ResponseEntity.ok(adminDashboardService.getRecentLogs());
   }
}
