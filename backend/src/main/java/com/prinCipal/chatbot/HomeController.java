package com.prinCipal.chatbot;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import com.prinCipal.chatbot.member.Member;
import com.prinCipal.chatbot.member.MemberProfileDto;
import com.prinCipal.chatbot.oauth2.CustomOAuth2User;

import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class HomeController {

	@GetMapping("/kakao_login_test")
	public String kakaoTest() {
		return "kakaoTest";
	}

	// 로그인 성공 후 받은 토큰을 기반으로 /home 페이지가 스스로 사용자 정보를 요청하게 하거나
	// 서버에서 토큰을 검증하여 사용자 정보를 내려주는 방식
	 @GetMapping("/home")
    // @AuthenticationPrincipal을 통해 CustomOAuth2User 객체를 바로 주입받을 수 있습니다.
    public String home(@AuthenticationPrincipal CustomOAuth2User customOAuth2User, Model model) {
        if (customOAuth2User != null) {
            // CustomOAuth2User에서 AppUser 정보를 가져옵니다.
            Member member = customOAuth2User.getMember();
            
            // DTO로 변환하여 모델에 담는 것을 권장합니다.
            MemberProfileDto memberDto = new MemberProfileDto(member);
    		model.addAttribute("user", memberDto);
    		return "kakao"; 
    	} else {
            // 인증된 사용자가 아니면 로그인 페이지로
    		return "redirect:/kakao_login_test";
    	}
    }
	
}
