package com.prinCipal.chatbot.counsel;

import com.prinCipal.chatbot.member.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<CounsellingSession, Long> {
    
	// 사용자가 소유한 세션인지 확인하기 위해 Member로 찾는 기능
    Optional<CounsellingSession> findBySessionIdAndMember(Long sessionId, Member member);
    
    // (선택적) 나중에 '최근 대화' 목록을 가져오기 위함
    List<CounsellingSession> findByMemberOrderByLastMessageTimeDesc(Member member);
}