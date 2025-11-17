package com.prinCipal.chatbot.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/settings")
@RequiredArgsConstructor
public class SystemSettingController {

    private final SystemSettingService systemSettingService;

    // ✅ 전체 설정 조회
    @GetMapping
    public List<SystemSetting> getAllSettings() {
        return systemSettingService.getAllSettings();
    }

    // ✅ keyName으로 조회
    @GetMapping("/{keyName}")
    public String getValue(@PathVariable String keyName) {
        return systemSettingService.getValue(keyName);
    }

    // ✅ keyName으로 저장/갱신
    @PostMapping("/{keyName}")
    public SystemSetting saveOrUpdate(@PathVariable String keyName, @RequestParam String value) {
        return systemSettingService.saveOrUpdate(keyName, value);
    }

    // ✅ 특정 키 삭제
    @DeleteMapping("/{keyName}")
    public void deleteSetting(@PathVariable String keyName) {
        systemSettingService.deleteByKey(keyName);
    }
    
    @DeleteMapping("/RESET_ALL")
    public void resetAll() {
        systemSettingService.getAllSettings()
            .forEach(s -> systemSettingService.deleteByKey(s.getKeyName()));
    }
    
}