package com.prinCipal.chatbot;

import org.springframework.web.bind.annotation.*; // GetMapping, PostMapping 등
import java.util.Map; // Map 자료구조 사용
/**
* @RestController
* 이 클래스가 API 요청을 받는 컨트롤러임을 Spring에게 알립니다.
* 이 어노테이션이 붙은 클래스의 메소드들은 기본적으로 JSON 형태의 데이터를 반환합니다.
*/
@RestController
@RequestMapping("/api") // 이 클래스의 모든 메소드에 공통적으로 /api 경로를 붙여줍니다.
public class TestController {
   /**
    * GET /api/test 요청을 처리하는 메소드
    * * Postman에서 GET http://localhost:8080/api/test 로 호출 시 실행됩니다.
    */
   @GetMapping("/test")
   public Map<String, Object> getTest() {
       // Map.of(...)는 간단하게 JSON 객체를 만들기 좋은 방법입니다.
       return Map.of(
           "status", 200,
           "message", "GET 요청 성공!",
           "data", "이것은 GET 응답 데이터입니다."
       );
   }
   /**
    * POST /api/test 요청을 처리하는 메소드
    *
    * @RequestBody
    * Postman에서 보낸 JSON 본문(Body)을 Java의 Map 객체(requestBody)로
    * 자동으로 변환해 줍니다.
    *
    * Postman에서 POST http://localhost:8080/api/test 로 호출 시 실행됩니다.
    */
   @PostMapping("/test")
   public Map<String, Object> postTest(@RequestBody Map<String, Object> requestBody) {
      
       // Postman이 보낸 JSON 데이터를 콘솔에 출력해 봅니다.
       System.out.println("Postman으로부터 받은 데이터: " + requestBody);
       // 받은 데이터를 그대로 응답에 포함시켜 봅니다.
       return Map.of(
           "status", 200,
           "message", "POST 요청 성공!",
           "received_data", requestBody // 받은 데이터를 그대로 다시 보내줍니다.
       );
   }
}
