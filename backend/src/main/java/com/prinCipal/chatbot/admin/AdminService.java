package com.prinCipal.chatbot.admin;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.prinCipal.chatbot.exception.LoginFailedException;
import com.prinCipal.chatbot.member.Member;
import com.prinCipal.chatbot.member.MemberRepository;
import com.prinCipal.chatbot.member.UserRole;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminService {

	private final PasswordEncoder passwordEncoder;
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
    
    // 비밀번호 변경
    @Transactional
    public void changePassword(Long userId, String currentPassword, String newPassword) {
       
       // 사용자 조회
       Member member = memberRepository.findById(userId)
             .orElseThrow(()-> new LoginFailedException("회원 정보를 찾을 수 없습니다."));
       // 현재 비밀번호 검증
       if(!passwordEncoder.matches(currentPassword, member.getPassword())) {
          throw new LoginFailedException("현재 비밀번호가 일치하지 않습니다.");
       }
       // 새 비밀번호 인코딩 및 member 엔티티 업데이트
       member.updatePassword(passwordEncoder.encode(newPassword));
    }
}

