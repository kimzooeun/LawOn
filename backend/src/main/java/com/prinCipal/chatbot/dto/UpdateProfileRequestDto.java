package com.prinCipal.chatbot.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;


 //프로필 이름(displayName) 변경 요청을 위한 DTO

@Getter
@NoArgsConstructor
public class UpdateProfileRequestDto {

    @NotBlank(message = "새로운 표시 이름을 입력해주세요.")
    private String newDisplayName;
}
