# -------- 개발용: Builder로만 환경 설정 --------
FROM gradle:8.5-jdk17

WORKDIR /app

# Gradle wrapper와 dependencies 캐시
COPY build.gradle settings.gradle gradlew ./
COPY gradle gradle
RUN ./gradlew dependencies --no-daemon

EXPOSE 8080
EXPOSE 35729

CMD ["./gradlew", "bootRun", "--no-daemon"]