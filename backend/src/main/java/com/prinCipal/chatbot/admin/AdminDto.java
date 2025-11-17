package com.prinCipal.chatbot.admin;

import com.prinCipal.chatbot.member.Member;

import lombok.*;

@Getter
@Setter
public class AdminDto {
    private Long id;
    private String nickname;
    private String role;

    public static AdminDto fromEntity(Member m) {
        AdminDto dto = new AdminDto();
        dto.setId(m.getUserId());
        dto.setNickname(m.getNickname());
        dto.setRole(m.getRole().name());
        return dto;
    }
}

