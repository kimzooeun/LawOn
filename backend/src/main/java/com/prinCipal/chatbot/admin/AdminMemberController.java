package com.prinCipal.chatbot.admin;

import com.prinCipal.chatbot.member.Member;
import com.prinCipal.chatbot.member.MemberRepository;
import com.prinCipal.chatbot.admin.MemberAdminDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/members")
public class AdminMemberController {

    private final MemberRepository memberRepository;
    
 // 🔥 전체 회원 조회
    @GetMapping("")
    public List<MemberAdminDto> getMembers() {
        return memberRepository.findAll().stream()
                .map(MemberAdminDto::from)
                .toList();
    }
    
    
    
}
