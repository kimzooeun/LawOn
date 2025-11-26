package com.prinCipal.chatbot.security;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.prinCipal.chatbot.member.Member;
import com.prinCipal.chatbot.member.MemberRepository;
import com.prinCipal.chatbot.oauth2.CustomOAuth2User;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Service
public class MemberDetailService implements UserDetailsService{
	// 일반 로그인/회원가입을 위한 클래스
	// DB에서 사용자 정보 조회
	private final MemberRepository memberRepository;

	@Override
	public UserDetails loadUserByUsername(String nickname) throws UsernameNotFoundException {
		
		System.out.println(nickname+"!!!!!!!!!!!!젭알 나와주ㅠㅓ .......");
		 // 소셜 로그인 사용자 먼저 찾기
	    Optional<Member> socialUser = memberRepository.findBySocialId(nickname);
	    if (socialUser.isPresent()) {
	        Member member = socialUser.get();
	        Collection<GrantedAuthority> authorities = getAuthorities(member);
	        return new CustomOAuth2User(
	                member,
	                Map.of("name", member.getNickname()),
	                "name",
	                authorities,
	                null
	        );
	    }
	    
	    // 일반 회원 로그인 처리 (nickname)
	    Member member = memberRepository.findByNickname(nickname)  
	            .orElseThrow(() -> new UsernameNotFoundException("사용자 찾을 수 없음: " + nickname));
	    Collection<GrantedAuthority> authorities = getAuthorities(member);
	    return new CustomOAuth2User(
	            member,
	            Map.of("name", member.getNickname()),
	            "name",
	            authorities,
	            null
	    );
	    	
	}

	// 사용자 권한 목록 생성
	private Collection<GrantedAuthority> getAuthorities(Member member){
		List<GrantedAuthority> authorities = new ArrayList<>();
		if(member.getRole().equals(com.prinCipal.chatbot.member.UserRole.ADMIN)) {
			authorities.add(new SimpleGrantedAuthority(com.prinCipal.chatbot.member.UserRole.ADMIN.getAuthority()));
		} else {
			authorities.add(new SimpleGrantedAuthority(com.prinCipal.chatbot.member.UserRole.USER.getAuthority()));
		}
		return authorities;
	} 
}


