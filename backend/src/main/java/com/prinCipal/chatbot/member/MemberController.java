package com.prinCipal.chatbot.member;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class MemberController{

	@GetMapping("/login")
	public String login() {
		return "login";
	}
	
	@GetMapping("/signup")
	public String register() {
		return "signup";
	}
	
	@GetMapping("/")
	public String index() {
		return "index";
	}
	

	@GetMapping("/user-profile")
	public String userProfile() {
	    return "user-profile"; 
	}
	
	@GetMapping("/oauth2-success")
	public String loginSuccess() {
	    return "oauth2-success";
	}
	
	@GetMapping("/access-denied")
    public String accessDeniedPage() {
        System.out.println("🚫 접근 거부 페이지");
        return "access-denied";
    }
}
