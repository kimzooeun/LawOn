# -------- 개발용: Builder로만 환경 설정 --------
FROM gradle:8.5-jdk17

WORKDIR /app

# gradlew 실행 권한 부여
COPY gradlew ./
RUN chmod +x gradlew

# Gradle 설정 및 의존성 캐시
COPY build.gradle settings.gradle ./
COPY gradle gradle
RUN ./gradlew dependencies --no-daemon || true

# 소스 코드 복사
COPY src src



EXPOSE 8080
EXPOSE 35729

CMD ["./gradlew", "bootRun", "--no-daemon"]