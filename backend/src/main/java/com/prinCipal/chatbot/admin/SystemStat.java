package com.prinCipal.chatbot.admin;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "system_stats")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemStat {

    @Id
    private Long id;

    @Column(name = "total_counsel_count")
    private Long totalCounselCount;
}

