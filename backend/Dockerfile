# Java + Gradle 포함된 공식 이미지 사용
FROM gradle:8.5-jdk17 AS builder
WORKDIR /app

# 프로젝트 복사
COPY . . 

# 테스트는 제외하고 빌드
RUN ./gradlew clean build -x test



# --------- 실행 단계 ----------
FROM eclipse-temurin:17-jdk
WORKDIR /app

RUN apt-get update && apt-get install -y curl
# 빌드된 jar 파일만 복사 (이 이름은 실제 생성된 jar 이름으로 자동 인식)
COPY --from=builder /app/build/libs/*.jar app.jar


EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
