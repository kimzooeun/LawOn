package com.prinCipal.chatbot.dto;

import lombok.Data; // 2. 필요한 import 추가

@Data
public class TempSessionRequest { // 3. 'static' 제거
   private Long userId;
}