package com.prinCipal.chatbot.oauth2;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.prinCipal.chatbot.member.Member;
import com.prinCipal.chatbot.member.MemberRepository;
import com.prinCipal.chatbot.member.UserRole;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SocialUserService {

	private final MemberRepository memberRepository;
	private final PasswordEncoder passwordEncoder;
	
	// REQUIRES_NEW를 대체
	// 1. REQUIRD : 기존 트랜잭션 재사용
	// 2. SUPPORTS : 트랜잭션이 있으면 사용, 없으면 없이 실행
	// 3. MANDATORY : 기존 트랜잭션 필수
	// 4. NOT_SUPPORTED : 트랜잭션 없이 실행.
	
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public Member saveOrUpdateSocialMember(SocialUserInfo socialUserInfo, String provider) {
		String socialId = provider + "_" + socialUserInfo.getId(); //  소셜제공자 + 사용자 id 조합으로 새로운 아이디 생성
		
		Optional<Member> existingUserOpt = this.memberRepository.findBySocialId(socialId);
		
		if(existingUserOpt.isPresent()) {
			// 기존 회원 정보 업데이트 (닉네임은 유지)
			Member existingUser = existingUserOpt.get();
			existingUser.updateSocialInfo(
	            socialUserInfo.getName(),             // 새 닉네임 (optional)
	            socialUserInfo.getProfileImageUrl()   // 새 프로필 이미지
	        );
	        return this.memberRepository.save(existingUser);
		} else {
			Member newMember = Member.builder()
				// 카카오 닉네임이 중복될 수 있기 때문에, 이메일 기반으로 유니크한 닉네임을 자동 생성하기 위한 설계
                .nickname(generateUniqueNickname(socialUserInfo.getEmail()))
                // 실제로 후에 , 이메일을 받게된다면 
                // email(socialUserInfo.getEmail() != null ? socialUserInfo.getEmail() : generateTempEmail(socialUserInfo.getName()));
                // .nickname(socialUserInfo.getName())
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .role(UserRole.USER)
                .socialProvider(provider)
                .socialId(socialId)
                .profileImageUrl(socialUserInfo.getProfileImageUrl())
                .build();
			  
			  return this.memberRepository.save(newMember);
		}

	}
	
	
//	private String generateTempEmail(String name) {
//        return name.replaceAll("\\s+", "") + "_" + UUID.randomUUID().toString().substring(0, 8) + "@social.user.temp";
//	}

	
	private String generateUniqueNickname(String email) {
		if(email == null) {
			return "social_user" + UUID.randomUUID().toString().substring(0,8);
		}
		
		String baseUsername = email.split("@")[0];
		String nickname = baseUsername;
		
		// DB에서 사용자명 중복 확인 => 중복 발생 시 
		if(!isValidUsername(nickname)) {  // 여기서 예외를 던저도 되고, 기본값으로 줘도 됨
			nickname = "기본 사용자";
		}
		
		int cnt  = 1;

		while(this.memberRepository.existsByNickname(nickname) || !isValidUsername(nickname)) {
			nickname = baseUsername + "_" + cnt++;
			if(!isValidUsername(nickname)) {
				nickname = nickname.substring(0, Math.min(nickname.length(), 15));
			}
		}
		return nickname;
	}
	
	
	public boolean isValidUsername(String nickname) {
		// 허용 문자 (영문, 숫자, _)
		if(!nickname.matches("^[a-zA-Z0-9_]+$")) {
			return false;
		}
		// 길이 제한
		if(nickname.length()< 3 || nickname.length() >15) {
			return false;
		}
		return true;
	}
	
}















