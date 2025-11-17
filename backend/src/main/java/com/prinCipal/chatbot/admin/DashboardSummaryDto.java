package com.prinCipal.chatbot.admin;


import lombok.*;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Data
public class DashboardSummaryDto {
    private Long chatTotalCount;
    private Long chatTodayCount;
    private Long nicknameCount;
    private Long lawyerCount;
    
}
