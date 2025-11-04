package com.prinCipal.chatbot.member;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Long>{

	Optional<Member> findByNickname(String nickname);

	// 소셜아이디를 기준으로 찾기
	Optional<Member> findBySocialId(String socialId);
	

	boolean existsByNickname(String nickname);

}
