package com.prinCipal.chatbot.alert;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.prinCipal.chatbot.content.KeywordAnalysis;

@Repository
public interface CrisisAlertRepository extends JpaRepository<CrisisAlert, Long>{

}
