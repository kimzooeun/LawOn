package com.prinCipal.chatbot.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.prinCipal.chatbot.member.MemberService;
import com.prinCipal.chatbot.oauth2.CutomOAuth2UserService;
import com.prinCipal.chatbot.oauth2.Oauth2AuthenticationFailureHandler;
import com.prinCipal.chatbot.oauth2.Oauth2AuthenticationSuccessHandler;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Configuration
@EnableWebSecurity
public class SecurityConfig {

	private final Oauth2AuthenticationSuccessHandler oauth2SuccessHandler;
	private final Oauth2AuthenticationFailureHandler oauth2FailureHandler;
	private final MemberDetailService memberdetailService;
	
	private final CutomOAuth2UserService customOAuth2UserService;
    private final PasswordEncoder passwordEncoder;

    private static final String[] PERMIT_URL = {
    		"/auth/login", "/auth/signup", "/auth/refresh",  "/auth/logout",
		    "/oauth2/**",     // 소셜 로그인
		    "/css/**", "/js/**", "/images/**", "/favicon.ico" // 정적 파일
		};
    
 
	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception{
		String[] cookiesToClear = {"JSESSIONID", "refreshToken"};
		return http
				.csrf((csrf) -> csrf.disable())
				.httpBasic(httpBasic -> httpBasic.disable()) // HTTP Basic 인증 비활성화
	            .formLogin(formLogin -> formLogin.disable()) // Form Login 비활성화
			    // authenticationToken(Security가 만들어내는 토큰을 없애야, JWTToken이 활성화 가능하다.) 
	            .sessionManagement(session -> session
	                    .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)) // 👈 필요할 때 세션을 사용
				.logout(logout -> logout.disable())
				.authorizeHttpRequests((authorizeHttpRequests) -> authorizeHttpRequests
						.requestMatchers(PERMIT_URL).permitAll()
						.requestMatchers("/auth/**").authenticated() //인증 필요
						.anyRequest().authenticated()
				)
				
				.oauth2Login(oauth2 -> oauth2
						.userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
						.successHandler(oauth2SuccessHandler)
						.failureHandler(oauth2FailureHandler)
				)
				
				.authenticationProvider(authenticationProvider())
				// API 요청이 들어올 때마다 JWT 토큰을 검증할 커스텀 필터 => JwtAuthenticationFilter
				.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
				.build();
	}

	
	// DaoAuthenticationProvider 은 내부적으로 UserDetailsService를 사용하여 정보를 조회하고,
	// 입력된 비밀번호와 데이터베이스에 저장된 비밀번호를 비교
	@Bean
	public DaoAuthenticationProvider authenticationProvider() {
		DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(memberdetailService);
		authProvider.setPasswordEncoder(passwordEncoder);
		return authProvider;
	}
	
	
	
	// AuthenticationManager는 여러 AuthenticationProvider를 사용하여 인증을 시도하는데 주로 DaoAuthenticationProvider를 사용
	@Bean
	public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
	    return authenticationConfiguration.getAuthenticationManager();
	}
	
	@Bean
	public JwtAuthenticationFilter jwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider, MemberService memberService) {
	    return new JwtAuthenticationFilter(jwtTokenProvider, memberService);
	}

	
	
	
}
