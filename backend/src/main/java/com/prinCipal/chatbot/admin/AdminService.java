package com.prinCipal.chatbot.admin;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.prinCipal.chatbot.member.Member;
import com.prinCipal.chatbot.member.MemberRepository;
import com.prinCipal.chatbot.member.UserRole;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final MemberRepository memberRepository;

    public List<Member> getAllAdmins() {
        return memberRepository.findAll()
                .stream()
                .filter(m -> m.getRole() == UserRole.ADMIN)
                .toList();
    }

    public Member getAdminByNickname(String nickname) {
        return memberRepository.findByNickname(nickname)
                .filter(m -> m.getRole() == UserRole.ADMIN)
                .orElse(null);
    }
}

