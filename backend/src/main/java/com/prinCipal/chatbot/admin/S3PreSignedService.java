package com.prinCipal.chatbot.admin;

import java.net.URI;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;


import com.prinCipal.chatbot.counsel.SessionService;

import jakarta.annotation.Nullable;
import lombok.RequiredArgsConstructor;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
@RequiredArgsConstructor
public class S3PreSignedService {

	private final S3Presigner presigner;
	
	private final S3Client s3Client;
	private static final Logger logger = LoggerFactory.getLogger(SessionService.class);
	
	
    @Value("${cloud.aws.s3.bucket}")
    private String bucket;
    
    public String generateUploadUrl(String fileName, String contentType) {
    	
    	PutObjectRequest objectRequest = PutObjectRequest.builder()
    													.bucket(bucket)
    													.key("lawyers/" + fileName)
    													.contentType(contentType)
    													.build();
    	
    	PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
    											.signatureDuration(Duration.ofMinutes(5))  //URL 5분만 유효
    											.putObjectRequest(objectRequest)
    											.build();
    	
    	PresignedPutObjectRequest presigned = presigner.presignPutObject(presignRequest);
    	
    	return presigned.url().toString();
    }
    
    public void deleteByImageUrl(@Nullable String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) return;

        try {
            URI uri = URI.create(imageUrl);
            String key = uri.getPath(); // "/lawyers/3_이준호.jpg"
            if (key.startsWith("/")) {
                key = key.substring(1);
            }

            DeleteObjectRequest request = DeleteObjectRequest.builder()
            		.bucket(bucket)
                    .key(key)
                    .build();

            s3Client.deleteObject(request);
        } catch (Exception e) {
            // 로깅 정도만 하고, 비즈니스 로직은 실패시키지 않는게 보통 좋음
            logger.warn("S3 이미지 삭제 실패. url={}", imageUrl, e);
        }
    }
    
    
    
    
    
}
