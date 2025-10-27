package com.prinCipal.chatbot.alert;

import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;


@Entity
@Table(name="CrisisTypeCode")
@Getter
@NoArgsConstructor
public class CrisisTypeCode {
	
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long typeId;
    
    @Column(nullable = false, unique = true, length = 50)
    private String typeCode;

    private String typeDescription;

    private Boolean isActive = true;

    @OneToMany(mappedBy = "crisisTypeCode", cascade = CascadeType.ALL, orphanRemoval = false)
    private List<CrisisAlert> crisisAlerts;
}
