package com.prinCipal.chatbot.admin;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.prinCipal.chatbot.exception.LoginFailedException;
import com.prinCipal.chatbot.member.Member;
import com.prinCipal.chatbot.member.MemberProfileDto;
import com.prinCipal.chatbot.member.MemberRepository;
import com.prinCipal.chatbot.oauth2.CustomOAuth2User;
import com.prinCipal.chatbot.security.JwtTokenProvider;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final MemberRepository memberRepository;

    @GetMapping("/list")
    public ResponseEntity<List<AdminDto>> getAdmins() {
        return ResponseEntity.ok(
                adminService.getAllAdmins()
                        .stream()
                        .map(AdminDto::fromEntity)
                        .toList()
        );
    }

    @GetMapping("/{nickname}")
    public ResponseEntity<AdminDto> getAdmin(@PathVariable String nickname) {
        Member admin = adminService.getAdminByNickname(nickname);
        if(admin == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(AdminDto.fromEntity(admin));
    }
    
    @PutMapping("/changepassword")
    public ResponseEntity<?> changePassword(
          @PathVariable Long id,
          @RequestBody Map<String, String> body,
          @AuthenticationPrincipal CustomOAuth2User customOAuth2User ){
       
       // URL의 ID와 실제 로그인한 사용자의 ID가 일치하는지 확인
       if(!customOAuth2User.getMember().getUserId().equals(id)) {
          throw new AccessDeniedException("권한이 없습니다.");
          
       }
       String currentPassword = body.get("currentPassword");
       String newPassword = body.get("newPassword");
       
       if(currentPassword == null || newPassword == null) {
          return ResponseEntity.badRequest().body("모든 필드가 필요합니다.");
       }
       adminService.changePassword(id, currentPassword ,newPassword);
       return ResponseEntity.ok(Map.of("status","success","message","비밀번호가 변경되었습니다."));
    }
}
