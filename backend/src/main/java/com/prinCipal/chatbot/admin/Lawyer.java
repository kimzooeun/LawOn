package com.prinCipal.chatbot.admin;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "lawyers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lawyer {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 50)
	private String name;

	@Column(length = 10)
	private String gender;

	@Column(length = 200)
	private String detailSpecialty;

	@Column(length = 1000)
	private String description;

	@Column(length = 50)
	private String contact;

	@Column(length = 100)
	private String office;

	@Column(length = 100)
	private String officeLocation;

	private String imageUrl;
}
