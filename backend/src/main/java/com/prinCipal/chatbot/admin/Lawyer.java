package com.prinCipal.chatbot.admin;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "lawyers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lawyer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 변호사 이름
    @Column(nullable = false, length = 50)
    private String name;

    // 전문 분야 (예: 이혼, 형사, 민사 등)
    @Column(length = 100)
    private String specialty;

    // 연락처
    @Column(length = 50)
    private String contact;

    // 소속 또는 로펌 이름
    @Column(length = 100)
    private String office;

    // 사무실 위치
    @Column(name = "office_location", length = 100)
    private String officeLocation;

    // 프로필 이미지 URL
    private String imageUrl;
}

