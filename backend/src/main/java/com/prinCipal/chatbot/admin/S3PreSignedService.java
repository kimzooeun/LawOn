package com.prinCipal.chatbot.admin;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import software.amazon.awssdk.services.s3.model.ObjectCannedACL;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
@RequiredArgsConstructor
public class S3PreSignedService {

	private final S3Presigner presigner;
	
    @Value("${cloud.aws.s3.bucket}")
    private String bucket;
    
    public String generateUploadUrl(String fileName, String contentType) {
    	
    	PutObjectRequest objectRequest = PutObjectRequest.builder()
    													.bucket(bucket)
    													.key("lawyers/" + fileName)
    													.acl(ObjectCannedACL.PUBLIC_READ)
    													.contentType(contentType)
    													.build();
    	
    	PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
    											.signatureDuration(Duration.ofMinutes(5))  //URL 5분만 유효
    											.putObjectRequest(objectRequest)
    											.build();
    	
    	PresignedPutObjectRequest presigned = presigner.presignPutObject(presignRequest);
    	
    	return presigned.url().toString();
    }
}
