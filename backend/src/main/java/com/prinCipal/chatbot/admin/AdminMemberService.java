package com.prinCipal.chatbot.admin;

// Member 관련 import
import com.prinCipal.chatbot.member.Member;
import com.prinCipal.chatbot.member.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminMemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * 비밀번호 변경 로직
     * @param nickname 로그인한 사용자의 닉네임 (ID)
     * @param request 변경할 비밀번호 정보
     */
    @Transactional
    public void changePassword(String nickname, com.prinCipal.chatbot.admin.AdminDto.ChangePasswordRequest request) {
        log.info("🔹 비밀번호 변경 서비스 진입 - 사용자: {}", nickname);

        // 1. 사용자 조회 (로그인 ID인 nickname으로 찾기)
        Member member = memberRepository.findByNickname(nickname)
                .orElseThrow(() -> new RuntimeException("사용자 정보를 찾을 수 없습니다."));

        // 2. 현재 비밀번호 일치 여부 확인
        if (!passwordEncoder.matches(request.getCurrentPassword(), member.getPassword())) {
            throw new RuntimeException("현재 비밀번호가 일치하지 않습니다.");
        }

        // 3. 새 비밀번호 암호화
        String encodedPassword = passwordEncoder.encode(request.getNewPassword());
        
        // 4. 비밀번호 변경 (Member 엔티티의 메서드 사용)
        // (만약 updatePassword 메서드가 없다면 member.setPassword(encodedPassword); 사용)
        member.updatePassword(encodedPassword);
        
        // 5. 저장
        memberRepository.save(member);
        log.info("✅ 비밀번호 변경 완료");
    }
}