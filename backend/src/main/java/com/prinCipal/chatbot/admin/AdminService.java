package com.prinCipal.chatbot.admin;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final AdminRepository adminRepository;

    // ✅ Entity → DTO 변환 메서드 (Mapper 없이 직접)
    private AdminDto toDto(Admin admin) {
        return AdminDto.builder()
                .id(admin.getId())
                .username(admin.getUsername())
                .role(admin.getRole())
                .active(admin.isActive())
                .createdAt(admin.getCreatedAt())
                .lastLogin(admin.getLastLogin())
                .build();
    }

    // ✅ DTO → Entity 변환 (필요 시)
    private Admin toEntity(AdminDto dto) {
        return Admin.builder()
                .id(dto.getId())
                .username(dto.getUsername())
                .role(dto.getRole())
                .active(dto.isActive())
                .createdAt(dto.getCreatedAt())
                .lastLogin(dto.getLastLogin())
                .build();
    }

    // ✅ 전체 조회
    public List<AdminDto> getAllAdmins() {
        return adminRepository.findAll()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    // ✅ 단일 조회
    public AdminDto getAdminByUsername(String username) {
        Admin admin = adminRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("관리자 계정을 찾을 수 없습니다."));
        return toDto(admin);
    }

    // ✅ 새 관리자 등록
    public AdminDto createAdmin(AdminDto dto) {
        if (adminRepository.existsByUsername(dto.getUsername())) {
            throw new RuntimeException("이미 존재하는 관리자입니다.");
        }
        Admin admin = toEntity(dto);
        Admin saved = adminRepository.save(admin);
        return toDto(saved);
    }

    // ✅ 활성/비활성 변경
    public AdminDto toggleActive(Long id, boolean active) {
        Admin admin = adminRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("관리자 계정을 찾을 수 없습니다."));
        admin.setActive(active);
        return toDto(adminRepository.save(admin));
    }
}
