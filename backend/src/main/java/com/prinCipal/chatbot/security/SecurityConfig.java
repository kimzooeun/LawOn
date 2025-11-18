package com.prinCipal.chatbot.security;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Configuration
@EnableWebSecurity
public class SecurityConfig {

   @Autowired
   private Oauth2AuthenticationSuccessHandler oauth2SuccessHandler;
   private final Oauth2AuthenticationFailureHandler oauth2FailureHandler;
   private final MemberDetailService memberdetailService;
   
   private final CutomOAuth2UserService customOAuth2UserService;
    private final PasswordEncoder passwordEncoder;

    private static final String[] PERMIT_URL = {
          "/api/redis/test",      // Redis 관련 
          "/api/login", "/api/signup", "/api/refresh",  "/api/logout",
          "/oauth2/**",     // 소셜 로그인
          "/login/oauth2/code/**",  
          "/css/**", "/js/**", "/images/**", "/favicon.ico", "/actuator/health", "/actuator/info"// 정적 파일
      };
    
 
    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${app.frontend.internal_url}")
    private String frontendInternalUrl;
    
   @Bean
   public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter, CustomAuthenticationFilter customLoginFilter) throws Exception{
      String[] cookiesToClear = {"JSESSIONID", "refreshToken"};
      return http
            .csrf((csrf) -> csrf.disable())
            .cors(cors -> cors.configurationSource(request -> {
                   var config = new org.springframework.web.cors.CorsConfiguration();
                   config.setAllowedOrigins(List.of(frontendUrl, frontendInternalUrl)); // 프론트 주소
                   config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                   config.setAllowCredentials(true);
                   config.setAllowedHeaders(List.of("*"));
                   config.setExposedHeaders(List.of("Authorization"));
                   return config;
               }))
            .httpBasic(httpBasic -> httpBasic.disable()) // HTTP Basic 인증 비활성화
            .formLogin(formLogin -> formLogin.disable()) // Form Login 비활성화
             // authenticationToken(Security가 만들어내는 토큰을 없애야, JWTToken이 활성화 가능하다.) 
            .sessionManagement(session -> session
                      .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // 정민 추가
            .exceptionHandling(ex -> ex
                       .authenticationEntryPoint((request, response, authException) -> {
                           response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                           response.setContentType("application/json;charset=UTF-8");
                           response.getWriter().write("{\"error\": \"unauthorized\"}");
                       })
                       .accessDeniedHandler((request, response, accessDeniedException) -> {
                           response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                           response.setContentType("application/json;charset=UTF-8");
                           response.getWriter().write("{\"error\": \"forbidden\"}");
                       })
             )
               
            .oauth2Login(oauth2 -> oauth2
                  .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                  .successHandler(oauth2SuccessHandler)
                  .failureHandler(oauth2FailureHandler)
            )
            .logout(logout -> logout.disable())
            .authorizeHttpRequests((authorizeHttpRequests) -> authorizeHttpRequests
                  .requestMatchers("/api/auth/**").permitAll()
                  .requestMatchers(HttpMethod.OPTIONS, "/api/admin/lawyers/upload").permitAll()
                  .requestMatchers(HttpMethod.POST, "/api/admin/lawyers/upload").hasRole("ADMIN")
                  .requestMatchers("/api/admin/**").hasRole("ADMIN")
                  .requestMatchers("/admin/**").permitAll()
                  .requestMatchers(PERMIT_URL).permitAll()
                  .requestMatchers("/auth/**").authenticated() //인증 필요
                  .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider())
            // API 요청이 들어올 때마다 JWT 토큰을 검증할 커스텀 필터 => JwtAuthenticationFilter
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAt(customLoginFilter, UsernamePasswordAuthenticationFilter.class)    // 일반 로그인(JSON) 처리를 위한 커스텀 필터 등록
            .build();
   }

   
   // DaoAuthenticationProvider 은 내부적으로 UserDetailsService를 사용하여 정보를 조회하고,
   // 입력된 비밀번호와 데이터베이스에 저장된 비밀번호를 비교 (사용자 정보 로드와 비밀번호 검증 담당)
   @Bean
   public DaoAuthenticationProvider authenticationProvider() {
       DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
       authProvider.setUserDetailsService(memberdetailService);
       authProvider.setPasswordEncoder(passwordEncoder);
       return authProvider;
   }
   

   
   // (인증 요청을 처리할 중심)
   // AuthenticationManager는 여러 AuthenticationProvider를 사용하여 인증을 시도하는데 주로 DaoAuthenticationProvider를 사용
   @Bean
   public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
       return authenticationConfiguration.getAuthenticationManager();
   }
   
   // OAuth2에서 사용하는 jwt토큰 인증 필터
   @Bean
   public JwtAuthenticationFilter jwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider, MemberService memberService, BlackTokenRepository blackTokenRepository) {
       return new JwtAuthenticationFilter(jwtTokenProvider, memberService, blackTokenRepository);
   }
   
   @Bean
   public CustomAuthenticationFilter customAuthenticationFilter(AuthenticationManager authenticationManager, LocalJwtAuthenticationSuccessHandler jwtSuccessHandler,LocalJwtAuthenticationFailureHandler jwtFailureHandler) {
      CustomAuthenticationFilter filter = new CustomAuthenticationFilter(authenticationManager);
      filter.setAuthenticationSuccessHandler(jwtSuccessHandler);  // 일반 로그인 성공시 JSON 응답 핸들러 
      filter.setAuthenticationFailureHandler(jwtFailureHandler);  // 일반 로그인 실패시 JSON 에러 응답 핸들러 
      return filter;
   }

   
   
   
}
