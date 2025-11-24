import os
import re
import json
import uuid
import redis
import traceback
import asyncio

# stt tts 추가
import numpy as np
import tempfile
import subprocess
import io
from typing import List,Optional
from openai import OpenAI
from fastapi import FastAPI, HTTPException, UploadFile, File 
import models_load
from pydub import AudioSegment               
from fastapi.responses import StreamingResponse  
from pydantic import BaseModel

# --- 노트북에서 가져온 라이브러리 임포트 ---
from fastapi.middleware.cors import CORSMiddleware

frontend_url = os.getenv("FRONTEND_URL")
origins = [frontend_url]

# --- FastAPI 앱 초기화 및 모델 로딩 ---
all_models = models_load.load_all_models()
simple_models = models_load.load_simple_models()

# OpenAI 클라이언트 (OPENAI_API_KEY는 환경변수로)
client = OpenAI()

# Redis 클라이언트 (REDIS_HOST, REDIS_PORT는 환경변수로)
redis_client = redis.Redis(
    host= os.getenv("REDIS_HOST"),
    port = int(os.getenv("REDIS_PORT")),
    db=0,
    decode_responses=True,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],
)

# 간편 상담 최대 질문 수
LIMIT_SIMPLE = 5  

# --- FastAPI에서 들어오는 JSON 바디를 파이썬 객체로 변환해주는 모델 ----
class QueryRequest(BaseModel):
    query: str

class SimpleChatRequest(BaseModel):
    session_id: Optional[str] = None
    query: str

@app.get("/")
def read_root():
    return {"status": "AI RAG Server is running."} 

# Healthcheck 엔드포인트
@app.get("/health")
def health_check():
    return {"status": "healthy"}


# [엔드포인트 2: RAG 응답 생성]
@app.post("/generate-response")
async def handle_generate_response(request: QueryRequest):
    query = request.query
    results = {}

    # --- [A, B, C, D] 모델 병렬 실행 ---
    # (CPU-bound 작업이므로 asyncio.to_thread로 별도 스레드에서 실행)
    try:
        (
            sentiment_result,
            context_result,
            its_result,
            qa_result
        ) = await asyncio.gather(
            # [수정] models_load.predict_sentiment 로 변경
            asyncio.to_thread(models_load.predict_sentiment, query, all_models['model_A'], all_models['tokenizer_A']),
            # [수정] models_load.predict_context_kobert 로 변경
            asyncio.to_thread(models_load.predict_context_kobert, query, all_models['model_B'], all_models['tokenizer_B']),
            # [수정] models_load.predict_full로 변경
            asyncio.to_thread(models_load.predict_full, query, all_models),  # 전체 모델 dict를 통째로 넘김
            # [수정] models_load.search_qa_faiss 로 변경
            asyncio.to_thread(models_load.search_qa_faiss, query, all_models['db_D'], k=3)
        )

        # (결과 정리)
        text_a, probs_a, preds_a = sentiment_result
        results['sentiment'] = {"cleaned_text": text_a, "probabilities": probs_a, "labels": preds_a}

        pred_b, conf_b, prob_non_div, prob_div = context_result
        results['context'] = {"prediction": pred_b, "confidence": conf_b, "prob_non_divorce": prob_non_div, "prob_divorce": prob_div}

        # pred_i, pred_t, pred_s = its_result
        # results['its_classification'] = {"intent": pred_i, "topic": pred_t, "situation": pred_s}

        its_final = its_result.get("its", {})
        results['its_classification'] = {
            "intent": its_final.get("intent"),
            "topic": its_final.get("topic"),
            "situation": its_final.get("situation"),
        }

        results['qa_search'] = qa_result

    except Exception as e:
        # (A, B, C, D 중 하나라도 실패하면 여기로 옴)
        results['error_async_gather'] = {"error": str(e), "trace": traceback.format_exc()}
        # (안전장치로 개별 모델 결과 초기화)
        if 'sentiment' not in results: results['sentiment'] = {"error": "Model execution failed"}
        if 'context' not in results: results['context'] = {"error": "Model execution failed"}
        if 'its_classification' not in results: results['its_classification'] = {"error": "Model execution failed"}
        if 'qa_search' not in results: results['qa_search'] = [{"error": "Model execution failed"}]
        # E/F 검색에 필요한 값들 비워두기
        pred_i, pred_t = None, None

    # --- [E/F] 판례/법률 검색 (C의 결과가 필요하므로 순차 실행) ---
    try:
        # C에서 가져온 pred_i, pred_t, pred_s(상황) 사용
        its_data = results.get('its_classification', {})
        pred_i_val = its_data.get('intent')
        pred_t_val = its_data.get('topic')
        pred_s_val = its_data.get('situation') # 상황 추가 

        print(f"🔍 [DEBUG] Legal Search 진입 - 의도: {pred_i_val}, 주제: {pred_t_val}, 상황: {pred_s_val}")

        results['legal_search'] = await asyncio.to_thread(
            # 인자에 pred_s_val 추가
            models_load.search_legal_csv, query, pred_i_val, pred_t_val, pred_s_val, all_models
        )
    except Exception as e:
        results['legal_search'] = [{"error": str(e), "trace": traceback.format_exc()}]

    # ------------------------------------
    # 기존의 규칙 기반 답변 대신,
    # 모든 모델의 결과를 문자열로 조합하여 final_response에 담습니다.
    # ------------------------------------

    final_answer_lines = []
    source_type = "Full Model Report"

    try:
        # --- [A] 감정 분류 리포트 ---
        final_answer_lines.append("### [A] 감정 분류 결과 ###")
        sentiment_data = results.get('sentiment', {})
        if 'error' in sentiment_data:
            final_answer_lines.append(f"오류: {sentiment_data['error']}")
        else:
            final_answer_lines.append(f"발화: '{sentiment_data.get('cleaned_text', query)}'")
            labels = ", ".join(sentiment_data.get('labels', ['N/A']))
            if not labels: labels = "N/A"
            final_answer_lines.append(f"최종 감정: {labels}")
            
            # 확률 상세 (상위 2개, 불릿 포인트)
            probs_a = sentiment_data.get('probabilities', [])[:2]
            for label, prob in probs_a:
                final_answer_lines.append(f"- {label}: {prob:.4f}")

        # --- [B] 문맥 분류 리포트 ---
        final_answer_lines.append("\n### [B] 문맥 분류 결과 ###")
        context_data = results.get('context', {})
        if 'error' in context_data:
            final_answer_lines.append(f"오류: {context_data['error']}")
        else:
            pred_b = context_data.get('prediction', 'N/A')
            conf_b = context_data.get('confidence', 0) * 100
            final_answer_lines.append(f"예측 결과: {pred_b} (신뢰도: {conf_b:.2f}%)")

        # --- [C] 주제/의도/상황 리포트 ---
        final_answer_lines.append("\n### [C] 주제/의도/상황 분류 결과 ###")
        its_data = results.get('its_classification', {})
        if 'error' in its_data:
            final_answer_lines.append(f"오류: {its_data['error']}")
        else:
            final_answer_lines.append(f"➡️ 주제 : {its_data.get('topic', 'N/A')}")
            final_answer_lines.append(f"➡️ 의도 : {its_data.get('intent', 'N/A')}")
            final_answer_lines.append(f"➡️ 상황 : {its_data.get('situation', 'N/A')}")

        # --- [D] 질의응답 검색 리포트 ---
        final_answer_lines.append("\n### [D] 질의응답 검색 결과 (Top 1) ###")
        qa_data = results.get('qa_search', [])
        
        if qa_data:
            first_qa = qa_data[0]
            if 'error' in first_qa:
                final_answer_lines.append(f"검색 오류: {first_qa['error']}")
            else:
                final_answer_lines.append(f"Q: {first_qa.get('question', 'N/A')}")
                # 가독성을 위해 Q와 A 사이에 줄바꿈 추가
                final_answer_lines.append(f"\nA: {first_qa.get('answer', 'N/A')}")
        else:
            final_answer_lines.append("검색 결과 없음")


        # --- [E/F] 판례/법률 검색 리포트 ---
        final_answer_lines.append("\n### [E/F] 판례/법률 검색 ###")
        legal_data = results.get('legal_search', [])
        
        if not legal_data:
            final_answer_lines.append("검색 결과 없음")
        else:
            for item in legal_data:
                res_type = item.get('type')
                
                if res_type == 'precedent':
                    final_answer_lines.append("\n[판례]")
                    final_answer_lines.append(f"{item.get('title', 'N/A')}")
                    final_answer_lines.append(f"\n요약: {item.get('summary', 'N/A')}")
                    
                    # 참조 법령 처리
                    refs = item.get('references', [])
                    if refs:
                        # 대괄호 중복 방지 로직: DB 키에서 [ ] 제거 후 포맷팅
                        ref_keys = []
                        for r in refs:
                            clean_key = r.get('key', '').replace('[', '').replace(']', '')
                            ref_keys.append(f"[{clean_key}]")
                        
                        ref_line = ", ".join(ref_keys)
                        final_answer_lines.append(f"\n참조 법령 : {ref_line}")

                        # 상세 리스트
                        final_answer_lines.append("\n<참조법령>")
                        for i, ref in enumerate(refs, 1):
                            clean_key = ref.get('key', '').replace('[', '').replace(']', '')
                            final_answer_lines.append(f"{i}. [{clean_key}] : {ref.get('title')}")
                            final_answer_lines.append(f"내용: {ref.get('content', '내용 없음')}")
                            final_answer_lines.append("") 
                
                elif res_type == 'law':
                    clean_key = item.get('key', '').replace('[', '').replace(']', '')
                    final_answer_lines.append(f"\n[법령] {clean_key} - {item.get('title', 'N/A')}")
                    final_answer_lines.append(f"내용: {item.get('content', 'N/A')}")
                
                elif res_type in ['skipped', 'law_miss', 'precedent_miss']:
                    final_answer_lines.append(f"(참고: {item.get('content', 'N/A')})")
                    
                elif res_type == 'error':
                    final_answer_lines.append(f"오류: {item.get('content', 'N/A')}")

        # 모든 라인을 하나의 문자열로 합침
        final_answer = "\n".join(final_answer_lines)

    except Exception as e:
        final_answer = f"결과 리포트 생성 중 치명적 오류 발생: {str(e)}"
        traceback.print_exc() # 서버 로그에 상세 오류 출력

    # 1. 'CounsellingContent'용 챗봇 응답 데이터 (가장 위로)
    chatbot_response_content = final_answer
    
    chatbotResponse = {
        "content": chatbot_response_content, # CounsellingContent.content
        "sender": "CHATBOT"                  # CounsellingContent.sender
    }

    # 2. 'KeywordAnalysis'용 핵심 데이터 (두 번째)
    is_divorce_val = None
    emotion_label_val = None
    topic_val = None
    intent_val = None
    situation_val = None
    
    try:
        # [B] 문맥 -> isDivorce (Boolean)
        context_data = results.get('context', {})
        if 'error' not in context_data:
            is_divorce_val = (context_data.get('prediction') == '이혼') 

        # [A] 감정 -> emotionLabel (String)
        sentiment_data = results.get('sentiment', {})
        if 'error' not in sentiment_data:
            labels = sentiment_data.get('labels', [])
            if labels:
                emotion_label_val = ", ".join(labels) 

        # [C] 주제/의도/상황 -> topic, intent, situation (String)
        its_data = results.get('its_classification', {})
        if 'error' not in its_data:
            topic_val = its_data.get('topic')
            intent_val = its_data.get('intent')
            situation_val = its_data.get('situation')

    except Exception as e:
        print(f"KeywordAnalysis 데이터 매핑 중 오류: {e}")

    # 3. 'CounsellingSession' 업데이트용 데이터 (마지막)
    summary_title_val = "이혼 상담" # 기본값
    try:
        title_parts = []
        if situation_val and situation_val not in ['해당 없음', 'N/A', 'N/A (전처리 결과 없음)']:
            title_parts.append(situation_val)
        if topic_val and topic_val not in ['N/A', 'N/A (전처리 결과 없음)', '단순 이혼 질문']:
            title_parts.append(topic_val)
        
        if title_parts:
            summary_title_val = " / ".join(title_parts) 
    except Exception as e:
        print(f"제목 생성 중 오류: {e}")
        summary_title_val = "제목 생성 오류"

    sessionUpdates = {
        "summaryTitle": summary_title_val, # (String) CounsellingSession.summaryTitle
        "summary": None                    # (null) CounsellingSession.summary (전체 요약)
    }

    # 4. 'KeywordAnalysis.retrievedData'에 저장할 원본 JSON
    original_model_results = results.copy()
    original_model_results.pop('final_response', None)
    original_model_results.pop('response_source', None)

    # 백엔드에 반환할 최종 객체
    final_response_object = {

        # 1. 키워드 분석 결과 (KeywordAnalysis 저장용)
        "keywordAnalysis": {
            "isDivorce": is_divorce_val,
            "emotionLabel": emotion_label_val,
            "topic": topic_val,
            "intent": intent_val,
            "situation": situation_val,
            "retrievedData": original_model_results # (JSON) 나머지 모든 원본 결과
        },
      
        # 2. AI 답변 (CounsellingContent 저장용)
        "chatbotResponse": chatbotResponse,

        # 3. 세션 업데이트 (CounsellingSession 업데이트용)
        "sessionUpdates": sessionUpdates
    }

    return final_response_object
  
# ===================================================================================================

# [엔드포인트 3: 간편 상담]
@app.post("/simple-chat")
async def simple_chat(request:SimpleChatRequest):
    # 세션 ID 확인/생성
    session_id = request.session_id or str(uuid.uuid4())
    redis_key = f"simple:session:{session_id}"

    # Redis에서 이전 상태 가져오기 
    data_str = redis_client.get(redis_key)
    if data_str:
        data = json.loads(data_str)
    else:
        data = {"count":0, "history":[]}
    count = data.get("count",0)

    # 5회 초과 여부 체크
    if count >= LIMIT_SIMPLE:
        return {
            "session_id" : session_id,
            "answer": "간편 상담은 최대 5개의 질문까지 제공됩니다.\n"
                      "더 깊은 상담을 원하시면 회원가입 후 맞춤형 상담을 이용해 주세요 😊",
            "count_used":count,
            "limit": LIMIT_SIMPLE,
            "limit_reached":True,
        }
    
    query = request.query
    # --- [B] 문맥 (KoBERT) 분류 ---
    context_label = None # 이혼/비이혼 같은 문자열 
    context_conf = None # 신뢰도
    try:
        if simple_models.get('model_B'):
            # [수정] models_load.predict_context_kobert 로 변경
            pred_b, conf_b, prob_non_div, prob_div = models_load.predict_context_kobert(query, simple_models['model_B'], simple_models['tokenizer_B'])
            context_label = pred_b
            context_conf = conf_b
        else: print("간편 상담용 이혼 문맥 분류 모델 로딩 실패")
    except Exception as e: print("간편 상담용 문맥 분류 예측 오류 : ", e)

    # [C] 의도/주제/상황 분류 (이혼 질문일 때 활용)
    intent = topic = situation = None
    if simple_models.get('model_KOBERT_situation') and simple_models.get('model_KOBERT_intent') and simple_models.get('model_KOBERT_topic'):
        try:
            # [수정] models_load.predict_full 로 변경
            its_result = models_load.predict_full(query, simple_models)
            intent = its_result["its"]["intent"]
            topic = its_result["its"]["topic"]
            situation = its_result["its"]["situation"]
        except Exception as e :
            print("의도/주제/상황 분류 모델 예측 중 오류 발생 : ", e)


    # 이혼 여부에 따라 OpenAI 호출 여부 결정
    # context_label == 이혼 + 신뢰도 0.5 이상일때만 llm 사용 
    use_LLM = False
    if context_label == "이혼":
        use_LLM = True
    
    # 최종 답변 생성
    if use_LLM:
        system_prompt = """
            당신은 한국의 이혼/가사 법률에 특화된 상담 챗봇입니다.
            지금은 '간편 상담' 모드입니다.

            - 사용자의 상황을 공감해주되, 너무 깊은 법률 자문보다는 개괄적인 안내 위주로 답변합니다.
            - 주어진 intent/topic/situation 정보를 참고해서 3~6문장 정도로 친절하게 답변하세요.
            - 최종 답변에는 '모델 분류 결과' 같은 기술적인 내용은 노출하지 마세요.
            - 명확한 법률 자문이나 추가 서류 검토가 필요해 보이면,
            회원가입 후 맞춤형 상담을 이용하라는 안내를 가볍게 덧붙이세요.
        """
        user_prompt = f"""
            [사용자 질문]
            {query}

            [내부 분류 결과] (사용자에게 직접 보여주지 마세요)
            - KoBERT 문맥(context): {context_label} (신뢰도: {context_conf})
            - 의도(intent): {intent}
            - 주제(topic): {topic}
            - 상황(situation): {situation}
        """

        completion = client.chat.completions.create(
            model = "gpt-4.1-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        
        answer = completion.choices[0].message.content
    else:
        #  이혼 관련이 아니라고 판단되면 , 기본 안내만 제공
        answer = (
            "현재 간편 상담은 주로 이혼·가사 문제에 대한 안내를 드리도록 설계되어 있어요.\n"
            "말씀해 주신 내용은 이혼과 직접적인 관련이 크지 않은 일반 문의로 판단되어,\n"
            "정확한 답변을 드리기 어려운 점 양해 부탁드립니다.\n\n"
            "보다 구체적인 상담이 필요하시다면 회원가입 후 맞춤형 상담을 이용해 주세요."
        )
    
    # Redis에 count + history 업데이트
    new_history_item = {
        "user": query,
        "bot": answer,
        "context_label": context_label,
        "context_confidence": context_conf,
        "intent": intent,
        "topic": topic,
        "situation": situation,
    }
    
    data["count"] = count + 1
    data['history'].append(new_history_item)

    redis_client.set(redis_key, json.dumps(data))
    redis_client.expire(redis_key, 3600) # 1시간 유지
    # redis_client.expire(redis_key, 60) # 60초 = 1분 


    new_count = data["count"]
    limit_reached = new_count >= LIMIT_SIMPLE

    return {
        "session_id" : session_id,
        "answer": answer,
        "count_used": new_count,
        "limit": LIMIT_SIMPLE,
        "limit_reached": limit_reached,
        "context": {
            "label": context_label,
            "confidence": context_conf,
        },
        "its": {
            "intent": intent,
            "topic": topic,
            "situation": situation,
        },
    }

# ===================================================================================================

# [엔드포인트 4: 간편 상담 이력 조회]
@app.get("/simple-chat/history")
async def get_simple_chat_history(session_id: str):
    redis_key = f"simple:session:{session_id}"
    
    # Redis에서 데이터 조회
    data_str = redis_client.get(redis_key)
    
    if data_str:
        data = json.loads(data_str)
        count = data.get("count", 0)
        limit_reached = count >= LIMIT_SIMPLE
        
        return {
            "history": data.get("history", []),
            "count": count,
            "limit": LIMIT_SIMPLE,
            "limit_reached": limit_reached,
            "suggest_login": limit_reached  # 5회 넘었으면 로그인 유도
        }
    else:
        # Redis에 세션 정보가 없으면 빈 값 반환
        return {
            "history": [],
            "count": 0,
            "limit": LIMIT_SIMPLE,
            "limit_reached": False,
            "suggest_login": False
        }


# ===================================================================================================

# STT (Whisper) - 음성 → 텍스트
async def run_stt_memory(audio_file: UploadFile):
    # 메모리로 읽기
    raw_data = await audio_file.read()

    tmp_in_path = None
    tmp_out_path = None

    try:
        # 1) webm 임시 파일로 저장
        # tempfile.NamedTemporaryFile을 with 문으로 사용하면 자동으로 닫히지만, 
        # delete=False로 했으므로 직접 삭제해야 합니다.
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
            tmp_in.write(raw_data) # ⬅️ **수정: raw 대신 raw_data 사용**
            tmp_in_path = tmp_in.name

        # 2) wav 출력 파일 경로 설정
        tmp_out_path = tmp_in_path + ".wav"

        # 3) ffmpeg 변환
        cmd = [
            "ffmpeg", "-y",
            "-i", tmp_in_path,
            "-ar", "16000",
            "-ac", "1",
            tmp_out_path
        ]
        
        # stderr를 캡처하여 오류 확인 가능
        process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
        
        # ffmpeg 변환 실패 시 오류 출력
        if process.returncode != 0:
            raise Exception(f"FFmpeg 변환 실패: {process.stderr.decode('utf-8')}")

        # 4) wav 파일 읽기
        with open(tmp_out_path, "rb") as f:
            wav_bytes = f.read()

        wav_buf = io.BytesIO(wav_bytes)

        # 5) Whisper
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=("audio.wav", wav_buf, "audio/wav"),
            response_format="text",
            language="ko"
        )
        return transcription
        
    finally:
        # 6) 임시 파일 정리 (오류 발생 여부와 관계없이 실행)
        if tmp_in_path and os.path.exists(tmp_in_path):
            os.remove(tmp_in_path)
        if tmp_out_path and os.path.exists(tmp_out_path):
            os.remove(tmp_out_path)


@app.post("/stt")
async def stt_endpoint(audio_file: UploadFile = File(...)):
    try:
        text = await run_stt_memory(audio_file)
        return {"text": text}
    except Exception as e:
        print("STT 오류:", e)
        raise HTTPException(status_code=500, detail=f"STT 처리 실패: {str(e)}")

#  TTS (GPT-4o-mini-tts) - 텍스트 → 음성
class TTSRequest(BaseModel):
    text: str

@app.post("/tts")
async def tts_endpoint(req: TTSRequest):
    try:
        speech = client.audio.speech.create(
            model="gpt-4o-mini-tts",
            voice="alloy",
            input=req.text
        )

        audio_bytes = speech.read()

        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg"
        )

    except Exception as e:
        print("TTS 오류:", e)
        return {"error": str(e)}

# voice-chat (음성 전체 파이프라인)
# STT → generate-response → TTS

@app.post("/voice-chat")
async def voice_chat(audio_file: UploadFile = File(...)):
    try:
        # 1) STT
        user_text = await run_stt_memory(audio_file)
        print("🎤 사용자 음성 → 텍스트:", user_text)

        # 2) generate-response 호출 (내부 함수처럼 직접 실행)
        req = QueryRequest(query=user_text)
        result = await handle_generate_response(req)

        bot_text = result["chatbotResponse"]["content"]
        print("🤖 챗봇 답변:", bot_text)

        # 3) TTS
        speech = client.audio.speech.create(
            model="gpt-4o-mini-tts",
            voice="alloy",
            input=bot_text
        )
        audio_bytes = speech.read()

        return {
            "sttText": user_text,
            "botText": bot_text,
            "audioHex": audio_bytes.hex()   # 프론트가 재생하려면 base64도 가능
        }

    except Exception as e:
        print("voice-chat 오류:", e)
        return {"error": str(e)}
