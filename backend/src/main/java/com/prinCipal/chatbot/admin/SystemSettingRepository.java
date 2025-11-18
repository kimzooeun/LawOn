package com.prinCipal.chatbot.admin;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemSettingRepository extends JpaRepository<SystemSetting, Long> {
	Optional<SystemSetting> findByKeyName(String keyName);
}
