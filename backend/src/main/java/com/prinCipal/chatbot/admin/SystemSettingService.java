package com.prinCipal.chatbot.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SystemSettingService {

    private final SystemSettingRepository systemSettingRepository;

    // ✅ 전체 설정 조회
    public List<SystemSetting> getAllSettings() {
        return systemSettingRepository.findAll();
    }

    // ✅ keyName으로 단일 설정 조회
    public Optional<SystemSetting> getSettingByKey(String keyName) {
        return systemSettingRepository.findByKeyName(keyName);
    }

    // ✅ keyName으로 설정값 가져오기 (value만)
    public String getValue(String keyName) {
        return systemSettingRepository.findByKeyName(keyName)
                .map(SystemSetting::getValue)
                .orElse(null);
    }

    // ✅ 설정 저장 또는 갱신
    public SystemSetting saveOrUpdate(String keyName, String value) {
        SystemSetting setting = systemSettingRepository.findByKeyName(keyName)
                .orElseGet(() -> SystemSetting.builder()
                        .keyName(keyName)
                        .build());

        setting.setValue(value);
        setting.setUpdatedAt(LocalDateTime.now().toString());

        return systemSettingRepository.save(setting);
    }

    // ✅ 특정 키 삭제
    public void deleteByKey(String keyName) {
        systemSettingRepository.findByKeyName(keyName)
                .ifPresent(systemSettingRepository::delete);
    }
}
