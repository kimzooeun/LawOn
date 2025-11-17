package com.prinCipal.chatbot.admin;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class AdminDashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/logs")
    public ResponseEntity<List<CounselLogDto>> getLogs() {
    	System.out.println(dashboardService.getRecentLogs());
        return ResponseEntity.ok(dashboardService.getRecentLogs());
    }
    

    // 🔹 요약 데이터 (대시보드 상단)
    @GetMapping("/summary")
    public DashboardSummaryDto getSummary() {
        return dashboardService.getSummary();
    }

}
