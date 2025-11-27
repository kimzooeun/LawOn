package com.prinCipal.chatbot.config;

import java.io.InputStream;

import org.springframework.core.io.InputStreamResource;

import io.jsonwebtoken.io.IOException;

public class MultipartInputStreamFileResource extends InputStreamResource{
	private final String filename;

    public MultipartInputStreamFileResource(InputStream inputStream, String filename) {
        super(inputStream);
        this.filename = filename;
    }

    @Override
    public String getFilename() {
        return this.filename;
    }

    @Override
    public long contentLength() throws IOException {
        return -1; // 파일 크기를 알 수 없을 때는 -1
    }
}
