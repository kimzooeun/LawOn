package com.prinCipal.chatbot.admin;

import com.prinCipal.chatbot.member.Member;
import com.prinCipal.chatbot.member.MemberRepository;
import com.prinCipal.chatbot.admin.AdminDto.ChangePasswordRequest;
import com.prinCipal.chatbot.counsel.SessionRepository;
import com.prinCipal.chatbot.admin.MemberAdminDto;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/members")
public class AdminMemberController {
	
	private final SessionRepository sessionRepository; // 팀원의 상담 저장소
    private final MemberRepository memberRepository;   // 회원 저장소
    private final AdminMemberService adminMemberService;
    
 // 🔥 전체 회원 조회
    @GetMapping("")
    public List<MemberAdminDto> getMembers() {
        return memberRepository.findAll().stream()
                .map(MemberAdminDto::from)
                .toList();
    }
    
}
