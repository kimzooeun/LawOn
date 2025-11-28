package com.prinCipal.chatbot.counsel;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/stt")
@RequiredArgsConstructor
public class SttController {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${cloud.aws.s3.bucket}")
    private String bucket;

    // 1) Presigned URL 발급
    @GetMapping("/presign")
    public PresignResponse presign(@RequestParam String fileName,@RequestParam String contentType) {
    	System.out.println("presign spring 진입 확인 .");
    	String key = "stt/" + UUID.randomUUID() + "_" + fileName;
    	String fixedContentType = "audio/webm"; 
    	PutObjectRequest objectRequest = PutObjectRequest.builder()
    	        .bucket(bucket)
    	        .key(key)
    	        .contentType(fixedContentType)
    	        .build();

    	PutObjectPresignRequest presignRequest =
    	        PutObjectPresignRequest.builder()
    	                .signatureDuration(Duration.ofMinutes(5))
    	                .putObjectRequest(objectRequest)
    	                .build();

    	PresignedPutObjectRequest presigned =
    	        s3Presigner.presignPutObject(presignRequest);

    	return new PresignResponse(
    	        presigned.url().toString(),
    	        key
    	);

    }

    // 2) STT 수행
    @PostMapping("/recognize")
    public ResponseEntity<?> recognize(@RequestBody RecognizeRequest req) {
        String key = req.getFileKey();

        try {
            // 1) S3에서 파일 다운로드
            ResponseBytes<GetObjectResponse> objectBytes = s3Client.getObjectAsBytes(
                    GetObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .build()
            );

            byte[] audioBytes = objectBytes.asByteArray();
            String base64 = Base64.getEncoder().encodeToString(audioBytes);

            // 2) FastAPI로 전송
            Map<String, String> body = Map.of("audio_base64", base64);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, String>> entity =
                    new HttpEntity<>(body, headers);

            RestTemplate rt = new RestTemplate();

            ResponseEntity<String> fastapiRes =
                    rt.postForEntity(
                            "http://3.34.155.21:8000/fastapi/stt-json",
                            entity,
                            String.class
                    );

            return ResponseEntity.ok(fastapiRes.getBody());

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity
                    .status(500)
                    .body("STT 처리 실패: " + e.getMessage());
        }
    }

    // DTO
    @Data
    @AllArgsConstructor
    static class PresignResponse {
        private String uploadUrl;
        private String fileKey;
    }

    @Data
    static class RecognizeRequest {
        private String fileKey;
    }
}
