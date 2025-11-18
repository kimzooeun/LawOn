package com.prinCipal.chatbot.member;

import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class ForbiddenWordService {

	private final ResourceLoader resourceLoader;
	
	// 금지어 목록을 저장할 Set (검색 속도 O(1)로 매우 빠름)
    private Set<String> forbiddenWords = new HashSet<>();
    // 생성자를 통해 Spring의 ResourceLoader를 주입받음
    public ForbiddenWordService(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }
	
    /**
     * @PostConstruct: Spring이 이 컴포넌트를 초기화한 직후(서버 시작 시)
     * 이 메소드를 자동으로 실행하여 파일을 로드합니다.
     */
    @PostConstruct
    public void loadWords() {
        // "classpath:"는 src/main/resources/ 경로를 의미합니다.
        Resource resource = resourceLoader.getResource("classpath:forbidden_words.txt");
        
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            
            // 파일을 한 줄씩 읽어(lines()), 공백을 제거(trim())하고,
            // 빈 줄은 거르고(filter), 모두 소문자(toLowerCase)로 변환하여
            // Set에 저장합니다.
            this.forbiddenWords = reader.lines()
                    .map(String::trim)
                    .filter(line -> !line.isEmpty())
                    .map(String::toLowerCase)
                    .collect(Collectors.toSet());
            
            // (로그) 로드가 완료되었는지 콘솔에서 확인
            System.out.println("[ForbiddenWordService] 금지어 " + forbiddenWords.size() + "개 로드 완료.");

        } catch (IOException e) {
            // 파일을 읽는 중 오류가 발생하면 로그를 남깁니다.
            System.err.println("[ForbiddenWordService] 금지어 파일을 읽는 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
    
    /**
     * 닉네임 변경 로직(MemberService)에서 실제로 호출할 메소드
     * @param text 확인할 닉네임 문자열
     * @return 금지어가 포함되어 있으면 true, 아니면 false
     */
    public boolean containsForbiddenWord(String text) {
        if (text == null || text.isEmpty()) {
            return false;
        }

        // 검사할 텍스트도 소문자로 변경하여 비교
        String lowerText = text.toLowerCase();

        // 저장된 금지어(forbiddenWords) 중 하나라도
        // 입력된 텍스트(lowerText)에 포함되는지(contains) 확인
        return forbiddenWords.stream()
                .anyMatch(forbiddenWord -> lowerText.contains(forbiddenWord));
    }
    
  
    
}
    

