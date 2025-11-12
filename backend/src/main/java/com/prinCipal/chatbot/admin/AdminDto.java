package com.prinCipal.chatbot.admin;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminDto {
	private Long id;
	private String username;
	private	String email;
	private String role;
	private boolean active;
    private String createdAt;
    private String lastLogin;
}
