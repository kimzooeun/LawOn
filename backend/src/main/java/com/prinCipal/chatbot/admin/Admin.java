package com.prinCipal.chatbot.admin;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "admin_users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Admin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(length = 20)
    private String role;  // 예: "SUPER_ADMIN", "MANAGER"

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false, updatable = false)
    private String createdAt;

    private String lastLogin;
}
