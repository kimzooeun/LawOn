package com.prinCipal.chatbot.admin;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "system_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 설정 키 (예: THEME, BACKUP_PATH, AUTO_BACKUP)
    @Column(nullable = false, unique = true)
    private String keyName;

    // 설정 값 (예: dark, /backup/data/, true 등)
    @Column(columnDefinition = "TEXT")
    private String value;

}
