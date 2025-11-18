//package com.prinCipal.chatbot.admin;
//
//import lombok.Getter;
//import lombok.AllArgsConstructor;
//import java.time.LocalDateTime;
//
//import com.prinCipal.chatbot.member.Member;
//
//@Getter
//@AllArgsConstructor
//public class MemberAdminDto {
//
//    private Long userId;
//    private String nickname;
//    private String displayName;
//    private String role;
//    private String socialProvider;
//    private String socialId;
//    private String profileImageUrl;
//    private LocalDateTime createdAt;
//    private LocalDateTime updatedAt;
//    private LocalDateTime withdrawDate;   // 🔥 추가됨
//
//    public static MemberAdminDto from(Member m) {
//        return new MemberAdminDto(
//            m.getUserId(),
//            m.getNickname(),
//            m.getDisplayName(),
//            m.getRole().name(),
//            m.getSocialProvider(),
//            m.getSocialId(),
//            m.getProfileImageUrl(),
//            m.getCreatedAt(),
//            m.getUpdatedAt(),
//            m.getWithdrawDate()   // 🔥 추가됨
//        );
//    }
//}
