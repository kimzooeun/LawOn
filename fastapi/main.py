from fastapi import FastAPI, UploadFile, File, Form
import uvicorn
import redis.asyncio as redis
from fastapi.middleware.cors import CORSMiddleware

# from fastapi import FastAPI, UploadFile, File, Form
# from dotenv import load_dotenv
# import os, uuid, whisper, uvicorn,sys
# import redis.asyncio as redis
# from fastapi.responses import JSONResponse, FileResponse
# from openai import OpenAI
# from gtts import gTTS
# from fastapi.middleware.cors import CORSMiddleware


# # .env 파일 로드
# load_dotenv()

app = FastAPI()
# # client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # 현재 디렉토리 절대경로
# model = whisper.load_model("small")

# # 🔓 CORS 허용 (로컬 프론트와 연결 위해)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    # allow_origins=["http://localhost:5173"],  # 실제 배포 시엔 허용할 도메인만 지정!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# @app.on_event("startup")
# async def startaup_event():
#         # Redis 연결 객체를 앱 상태에 저장 (F) 
#         try:
#             app.state.redis = redis.from_url("redis://finalproject-redis:6379",decode_responses=True)
#             pong = await app.state.redis.ping()
#             if pong:
#                 print("Redis 연결 성공 (pong = ", pong, ")")
#             else:
#                 print("Redis 응답 오류. ")
#         except Exception as e:
#             print("error : " , e)
#             sys.exit(1)  # 연결 안 되면 FastAPI 실행 중단

# @app.on_event("shutdown")
# async def shutdown_event():
#     # 종료 시 연결 닫기
#     await app.state.redis.close()

# @app.get("/redis-test")
# async def redis_test():
#     await app.state.redis.set("test_key", "이혼상담심리 챗봇 Redis 테스트 해보는 중 ")
#     value = await app.state.redis.get("test_key")
#     return {"redis_value": value}


@app.get("/health")
def check_key():
    return {"message": "stt서버 돌아가는 중 "}  # 키 일부만 표시



# # 후에 whisper api를 끌고오게되면 아래와 같이 사용하면 됨 
# # @app.post("/stt")
# # async def stt(audio_file: UploadFile = File(...), task : str = Form("transcribe")):
# #     #  업로드 파일을 임시 저장
# #     try: 
# #         temp_filename = f"{uuid.uuid4()}.mp3"
# #         with open(temp_filename, "wb") as f:
# #             f.write(await audio_file.read())


# #         # OpenAI Whisper API 호출
# #         with open(temp_filename, "rb") as audio:
# #             transcription = client.audio.transcriptions.create(
# #                 model="whisper-1",
# #                 file = audio,
# #                 response_format= "text"  # 결과를 텍스트 형태로 받기
# #             )

# #         # 변환된 텍스트 반환
# #         return {"text": transcription}
# #     except Exception as e:
# #         print(f"STT 처리 중 오류 : {e}")
# #         return JSONResponse(status_code=500, content={"error": "음성 처리 중 내부 오류","detail":str(e)})

# #     finally:
# #         # 임시 파일 삭제
# #         if os.path.exists(temp_filename):
# #             os.remove(temp_filename)


# @app.post("/stt")
# async def stt(audio_file: UploadFile = File(...)):
#     try:
#         # 업로드된 오디오를 임시 파일로 저장
#         temp_filename = os.path.join(BASE_DIR, f"{uuid.uuid4()}_{audio_file.filename}")

#         with open(temp_filename, "wb") as f:
#             f.write(await audio_file.read())

#         # Whisper 로컬 모델로 음성 인식
#         result = model.transcribe(temp_filename, fp16= False)
#         text = result.get("text", "").strip()

#         # 결과 반환
#         if not text:
#             return JSONResponse(
#                 status_code=400,
#                 content={"message": "음성에서 인식된 텍스트가 없습니다."}
#             )

#         return {"text": text}

#     except Exception as e:
#         print(f"STT 처리 중 오류: {e}")
#         return JSONResponse(
#             status_code=500,
#             content={"error": "음성 처리 중 내부 오류", "detail": str(e)}
#         )

#     finally:
#         if os.path.exists(temp_filename):
#             os.remove(temp_filename)

# @app.post("/tts")
# async def tts(text: str = Form(...)):
#     try:
#         filename = f"{uuid.uuid4()}.mp3"
#         filepath = os.path.join(BASE_DIR, filename)
#         # 입력 텍스트를 음성으로 변환
#         tts = gTTS(text=text, lang="ko")
#         tts.save(filepath)
#         print(f"TTS 생성 완료: {filepath}")

#         # 생성된 mp3 파일 바로 반환
#         return FileResponse(
#             filepath,
#             media_type="audio/mpeg",
#             filename="result.mp3"
#         )

#     except Exception as e:
#         print(f"TTS 처리 중 오류: {e}")
#         return JSONResponse(status_code=500, content={"error": str(e)})

#     finally:
#         # 10초 뒤 파일 자동 삭제 (원하면 생략 가능)
#         import threading, time
#         def delete_later(path):
#             time.sleep(10)
#             if os.path.exists(path):
#                 os.remove(path)
#         threading.Thread(target=delete_later, args=(filepath,)).start()



# 이 파일을 직접 실행할 경우 uvicorn 서버를 실행합니다.
if __name__ == "__main__":
    print("FastAPI 서버를 http://127.0.0.1:8000 에서 시작합니다.")
    uvicorn.run(app, host="127.0.0.1", port=8000)