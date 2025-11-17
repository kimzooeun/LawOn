import os
import re
import json
import uuid
import redis
import traceback
from typing import List,Optional
from openai import OpenAI
from models_load import (predict_sentiment, predict_context_kobert,predict_its,search_qa_faiss,search_legal_csv, load_simple_models, load_all_models)

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
# import whisper # STT 모델 (제거)
# import shutil # STT 임시파일 (제거)

# --- 노트북에서 가져온 라이브러리 임포트 ---
from fastapi.middleware.cors import CORSMiddleware
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.pipeline import Pipeline

frontend_url = os.getenv("FRONTEND_URL")
origins = [frontend_url]

# --- FastAPI 앱 초기화 및 모델 로딩 ---
all_models = load_all_models()
simple_models = load_simple_models()

# OpenAI 클라이언트 (OPENAI_API_KEY는 환경변수로)
client = OpenAI()

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


LIMIT_SIMPLE = 5  # 간편 상담 최대 질문 수

# --- FastAPI에서 들어오는 JSON 바디를 파이썬 객체로 변환해주는 모델----
class QueryRequest(BaseModel):
    query: str

class SimpleChatRequest(BaseModel):
    session_id: Optional[str] = None
    query: str


@app.get("/")
def read_root():
    return {"status": "AI RAG Server is running."} # STT 문구 제거

# [추가] Healthcheck 엔드포인트
@app.get("/health")
def health_check():
    # 간단하게 200 OK 상태와 메시지를 반환합니다.
    return {"status": "healthy"}

# [엔드포인트 2: RAG 응답 생성]
@app.post("/generate-response")
async def handle_generate_response(request: QueryRequest):
    query = request.query
    results = {} # 모든 결과를 담을 딕셔너리

    # --- [A] 감정 분류 ---
    try:
        if all_models.get('model_A'):
            text_a, probs_a, preds_a = predict_sentiment(query, all_models['model_A'], all_models['tokenizer_A'])
            results['sentiment'] = {
                "cleaned_text": text_a,
                "probabilities": probs_a,
                "labels": preds_a
            }
        else: results['sentiment'] = {"error": "Model A not loaded"}
    except Exception as e: results['sentiment'] = {"error": str(e), "trace": traceback.format_exc()}

    # --- [B] 문맥 (KoBERT) 분류 ---
    try:
        if all_models.get('model_B'):
            pred_b, conf_b, prob_non_div, prob_div = predict_context_kobert(query, all_models['model_B'], all_models['tokenizer_B'])
            results['context'] = {
                "prediction": pred_b,
                "confidence": conf_b,
                "prob_non_divorce": prob_non_div,
                "prob_divorce": prob_div
            }
        else: results['context'] = {"error": "Model B not loaded"}
    except Exception as e: results['context'] = {"error": str(e), "trace": traceback.format_exc()}

    # --- [C] 주제/의도/상황 분류 ---
    pred_i, pred_t, pred_s = None, None, None # E/F 검색을 위해 변수 유지
    try:
        if all_models.get('model_C_intent') and all_models.get('model_C_topic') and all_models.get('model_C_situation'):
            pred_i, pred_t, pred_s = predict_its(
                query,
                all_models['model_C_intent'],
                all_models['model_C_topic'],
                all_models['model_C_situation']
            )
            results['its_classification'] = {
                "intent": pred_i,
                "topic": pred_t,
                "situation": pred_s
            }
        else: results['its_classification'] = {"error": "Model C not loaded"}
    except Exception as e: results['its_classification'] = {"error": str(e), "trace": traceback.format_exc()}

    # --- [D] 질의응답 검색 ---
    try:
        if all_models.get('db_D'):
            results['qa_search'] = search_qa_faiss(query, all_models['db_D'], k=3)
        else: results['qa_search'] = [{"error": "DB D not loaded"}]
    except Exception as e: results['qa_search'] = [{"error": str(e), "trace": traceback.format_exc()}]

    # --- [E/F] 판례/법률 검색 ---
    try:
        # C 모델의 결과(pred_i, pred_t)를 기반으로 검색 실행
        results['legal_search'] = search_legal_csv(query, pred_i, pred_t, all_models)
    except Exception as e: results['legal_search'] = [{"error": str(e), "trace": traceback.format_exc()}]


    # *** (중요) Colab 테스트처럼 모든 결과를 문자열로 포맷팅 ***
    # ------------------------------------
    # 기존의 규칙 기반 답변 대신,
    # 모든 모델의 결과를 문자열로 조합하여 final_response에 담습니다.
    # ------------------------------------

    final_answer_lines = []
    source_type = "Full Model Report"

    try:
        # --- [A] 감정 분류 리포트 ---
        final_answer_lines.append("--- [A] 감정 분류 결과 ---")
        sentiment_data = results.get('sentiment', {})
        if 'error' in sentiment_data:
            final_answer_lines.append(f"오류: {sentiment_data['error']}")
        else:
            final_answer_lines.append(f"발화: '{sentiment_data.get('cleaned_text', query)}'")
            labels = ", ".join(sentiment_data.get('labels', ['N/A']))
            if not labels: labels = "N/A (50% 이상 감정 없음)"
            final_answer_lines.append(f"[최종 예측 레이블] -> {labels}")
            
            # 확률 상세 (상위 2개)
            probs_a = sentiment_data.get('probabilities', [])[:2]
            for label, prob in probs_a:
                final_answer_lines.append(f"  {label}: {prob:.4f}")

        # --- [B] 문맥 분류 리포트 ---
        final_answer_lines.append("\n--- [B] 문맥 (KoBERT) 분류 결과 ---")
        context_data = results.get('context', {})
        if 'error' in context_data:
            final_answer_lines.append(f"오류: {context_data['error']}")
        else:
            pred_b = context_data.get('prediction', 'N/A')
            conf_b = context_data.get('confidence', 0) * 100
            final_answer_lines.append(f"예측 결과: {pred_b} (신뢰도: {conf_b:.2f}%)")

        # --- [C] 주제/의도/상황 리포트 ---
        final_answer_lines.append("\n--- [C] 주제/의도/상황 분류 결과 ---")
        its_data = results.get('its_classification', {})
        if 'error' in its_data:
            final_answer_lines.append(f"오류: {its_data['error']}")
        else:
            final_answer_lines.append(f"➡️ 주제 : {its_data.get('topic', 'N/A')}")
            final_answer_lines.append(f"➡️ 의도 : {its_data.get('intent', 'N/A')}")
            final_answer_lines.append(f"➡️ 상황 : {its_data.get('situation', 'N/A')}")

        # --- [D] 질의응답 검색 리포트 ---
        final_answer_lines.append("\n--- [D] 질의응답 검색 결과 (Top 1) ---")
        qa_data = results.get('qa_search', [])
        if not qa_data or 'error' in qa_data[0]:
            final_answer_lines.append("검색 결과 없음 (또는 오류)")
        else:
            first_qa = qa_data[0]
            final_answer_lines.append(f"Q: {first_qa.get('question', 'N/A')}")
            final_answer_lines.append(f"A: {first_qa.get('answer', 'N/A')}")

        # --- [E/F] 판례/법률 검색 리포트 ---
        final_answer_lines.append("\n--- [E/F] 판례/법률 검색 ---")
        legal_data = results.get('legal_search', [])
        if not legal_data:
            final_answer_lines.append("검색 결과 없음")
        else:
            first_legal = legal_data[0]
            res_type = first_legal.get('type')
            
            if res_type == 'precedent':
                final_answer_lines.append(f"판례 검색: [{first_legal.get('title', 'N/A')}]")
                final_answer_lines.append(f"요약: {first_legal.get('summary', 'N/A')}")
            elif res_type == 'law':
                final_answer_lines.append(f"법령 검색: {first_legal.get('key', 'N/A')}")
                final_answer_lines.append(f"소제목: {first_legal.get('title', 'N/A')}")
                final_answer_lines.append(f"내용: {first_legal.get('content', 'N/A')}")
            elif res_type in ['skipped', 'law_miss', 'precedent_miss']:
                final_answer_lines.append(f"검색 건너뜀 또는 실패: {first_legal.get('content', 'N/A')}")
            elif res_type == 'error':
                 final_answer_lines.append(f"오류: {first_legal.get('content', 'N/A')}")
            else:
                final_answer_lines.append("알 수 없는 검색 결과 타입")

        # 모든 라인을 하나의 문자열로 합침
        final_answer = "\n".join(final_answer_lines)

    except Exception as e:
        final_answer = f"결과 리포트 생성 중 치명적 오류 발생: {str(e)}"
        traceback.print_exc() # 서버 로그에 상세 오류 출력

    # 최종적으로 results 딕셔너리에 답변을 추가
    results['final_response'] = final_answer
    results['response_source'] = source_type # 답변이 어디서 왔는지 출처 추가

    # Spring Boot는 이 'results' JSON 전체를 받지만,
    # 'final_response' 필드만 꺼내서 사용합니다.
    return results




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
            "suggest_login":True,
        }
    
    query = request.query
    # --- [B] 문맥 (KoBERT) 분류 ---
    context_label = None # 이혼/비이혼 같은 문자열 
    context_conf = None # 신뢰도
    try:
        if simple_models.get('model_B'):
            pred_b, conf_b, prob_non_div, prob_div = predict_context_kobert(query, simple_models['model_B'], simple_models['tokenizer_B'])
            context_label = pred_b
            context_conf = conf_b
        else: print("간편 상담용 이혼 문맥 분류 모델 로딩 실패")
    except Exception as e: print("간편 상담용 문맥 분류 예측 오류 : ", e)

    # [C] 의도/주제/상황 분류 (이혼 질문일 때 활용)
    intent = topic = situation = None
    if simple_models.get('model_C_intent') and simple_models.get('model_C_topic') and simple_models.get('model_C_situation'):
        try:
            intent, topic, situation = predict_its(query, simple_models['model_C_intent'], simple_models['model_C_topic'],
                simple_models['model_C_situation']
            )
        except Exception as e :
            print("의도/주제/상황 분류 모델 예측 중 오류 발생 : ", e)
    
    # 이혼 여부에 따라 OpenAI 호출 여부 결정
    # context_label == 이혼 + 신뢰도 0.7 이상일때만 llm 사용 
    use_LLM = False
    if context_label == "이혼":
        if(context_conf is None) or (context_conf >= 0.7):
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
            "보다 구체적인 상담이 필요하시다면 변호사 상담이나, 회원가입 후 맞춤형 상담을 이용해 주세요."
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
    # redis_client.expire(redis_key, 3600) # 1시간 유지
    redis_client.expire(redis_key, 60) # 60초 = 1분 


    new_count = data["count"]
    limit_reached = new_count >= LIMIT_SIMPLE
    suggest_login = limit_reached or (new_count == LIMIT_SIMPLE - 1)

    return {
        "session_id" : session_id,
        "answer": answer,
        "count_used": new_count,
        "limit": LIMIT_SIMPLE,
        "limit_reached": limit_reached,
        "suggest_login": suggest_login,
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


















# [엔드포인트 1: STT] (제거)
# @app.post("/stt")
# async def handle_stt(file: UploadFile = File(...)):
#     ... (전체 로직 제거)

# # [엔드포인트 2: RAG 응답 생성]
# @app.post("/generate-response")
# async def handle_generate_response(request: QueryRequest):
#     query = request.query
#     results = {}

#     # --- [A] 감정 분류 ---
#     try:
#         if all_models.get('model_A'):
#             text_a, probs_a, preds_a = predict_sentiment(query, all_models['model_A'], all_models['tokenizer_A'])
#             results['sentiment'] = {
#                 "cleaned_text": text_a,
#                 "probabilities": probs_a,
#                 "labels": preds_a
#             }
#         else: results['sentiment'] = {"error": "Model A not loaded"}
#     except Exception as e: results['sentiment'] = {"error": str(e)}

#     # --- [B] 문맥 (KoBERT) 분류 ---
#     try:
#         if all_models.get('model_B'):
#             pred_b, conf_b, prob_non_div, prob_div = predict_context_kobert(query, all_models['model_B'], all_models['tokenizer_B'])
#             results['context'] = {
#                 "prediction": pred_b,
#                 "confidence": conf_b,
#                 "prob_non_divorce": prob_non_div,
#                 "prob_divorce": prob_div
#             }
#         else: results['context'] = {"error": "Model B not loaded"}
#     except Exception as e: results['context'] = {"error": str(e)}

#     # --- [C] 주제/의도/상황 분류 ---
#     pred_i, pred_t, pred_s = None, None, None
#     try:
#         if all_models.get('model_C_intent') and all_models.get('model_C_topic') and all_models.get('model_C_situation'):
#             pred_i, pred_t, pred_s = predict_its(
#                 query,
#                 all_models['model_C_intent'],
#                 all_models['model_C_topic'],
#                 all_models['model_C_situation']
#             )
#             results['its_classification'] = {
#                 "intent": pred_i,
#                 "topic": pred_t,
#                 "situation": pred_s
#             }
#         else: results['its_classification'] = {"error": "Model C not loaded"}
#     except Exception as e: results['its_classification'] = {"error": str(e)}

#     # --- [D] 질의응답 검색 ---
#     try:
#         if all_models.get('db_D'):
#             results['qa_search'] = search_qa_faiss(query, all_models['db_D'], k=3)
#         else: results['qa_search'] = [{"error": "DB D not loaded"}]
#     except Exception as e: results['qa_search'] = [{"error": str(e)}]

#     # --- [E/F] 판례/법률 검색 ---
#     try:
#         # C 모델의 결과(pred_i, pred_t)를 기반으로 검색 실행
#         results['legal_search'] = search_legal_csv(query, pred_i, pred_t, all_models)
#     except Exception as e: results['legal_search'] = [{"error": str(e)}]


#     # *** LLM 호출 단계 (사용자 요청: Colab 테스트 결과와 유사한 답변 생성) ***
#     # ------------------------------------
#     # 이 로직은 LLM을 호출하는 대신,
#     # (E/F) 법률/판례 검색 결과 또는 (D) QA 검색 결과를
#     # 우선순위에 따라 조합하여 최종 답변을 생성합니다.
#     # ------------------------------------

#     final_answer = ""
#     source_type = ""

#     # --- 1. (E/F) 법률/판례 검색 결과 확인 (최우선) ---
#     # C 모델에서 의도가 '법률.판례'로 분류되었고 (pred_i),
#     # legal_search 결과가 성공적으로 반환되었는지 확인합니다.
#     try:
#         if pred_i == '법률.판례' and results.get('legal_search'):
#             legal_results = results['legal_search']
#             if legal_results:
#                 first_result = legal_results[0]
                
#                 # 'type'을 확인하여 오류나 건너뜀이 아닌지 확인
#                 res_type = first_result.get('type')
                
#                 if res_type == 'precedent':
#                     # 판례가 검색된 경우
#                     source_type = "판례 검색"
#                     final_answer = (
#                         f"[{first_result.get('title', 'N/A')}]\n\n"
#                         f"요약: {first_result.get('summary', 'N/A')}\n\n"
#                         f"(총 {len(legal_results)}건의 관련 판례가 검색되었습니다.)"
#                     )
#                 elif res_type == 'law':
#                     # 법령이 검색된 경우 (Colab 출력과 유사하게)
#                     source_type = "법령 검색"
#                     law_key = first_result.get('key', 'N/A')
#                     law_title = first_result.get('title', 'N/A')
#                     law_content = first_result.get('content', 'N/A')
#                     final_answer = (
#                         f"법령 Key: {law_key}\n"
#                         f"소제목: {law_title}\n\n"
#                         f"법률 내용: {law_content}"
#                     )
                    
#     except Exception as e:
#         print(f"Error processing E/F results: {e}")

#     # --- 2. (D) 질의응답(QA) 검색 결과 확인 (차순위) ---
#     # (E/F)에서 답변을 찾지 못한 경우, QA 검색 결과를 사용합니다.
#     try:
#         if not final_answer and results.get('qa_search'):
#             qa_results = results['qa_search']
#             if qa_results and 'answer' in qa_results[0]:
#                 first_qa = qa_results[0]
#                 source_type = "질의응답 DB"
#                 final_answer = (
#                     f"Q: {first_qa.get('question', 'N/A')}\n\n"
#                     f"A: {first_qa.get('answer', 'N/A')}"
#                 )
#     except Exception as e:
#         print(f"Error processing D results: {e}")

#     # --- 3. (C) 키워드 기반 Fallback ---
#     # (E/F)와 (D) 모두에서 답변을 못 찾은 경우, 키워드 요약
#     if not final_answer:
#         source_type = "키워드 분석"
#         keywords = []
        
#         # [C] 모델 결과 활용
#         if pred_t and pred_t != 'N/A (전처리 결과 없음)' and pred_t != '단순 이혼 질문':
#             keywords.append(pred_t)
#         if pred_s and pred_s != 'N/A (전처리 결과 없음)' and pred_s != '해당 없음':
#             keywords.append(pred_s)
#         try:
#             # [A] 모델 결과 활용
#             if results['sentiment'] and results['sentiment'].get('labels'):
#                 keywords.extend(results['sentiment']['labels'])
#         except Exception: pass
        
#         if not keywords:
#             final_answer = "말씀하신 내용을 이해하기 어렵습니다. 조금 더 구체적으로 말씀해 주시겠어요?"
#         else:
#             keyword_str = ", ".join(list(dict.fromkeys(keywords))) # 중복 제거
#             final_answer = f"'{keyword_str}'(으)로 이해했습니다. 이와 관련하여 어떤 점이 궁금하신가요?"

#     # 최종적으로 results 딕셔너리에 답변을 추가
#     results['final_response'] = final_answer
#     results['response_source'] = source_type # 답변이 어디서 왔는지 출처 추가

#     return results

# --- 12. 서버 실행 (로컬 테스트용) ---
# if __name__ == "__main__":
#     print("--- FastAPI 서버를 http://127.0.0.1:8000 에서 시작합니다 ---")
#     uvicorn.run(app, host="127.0.0.1", port=8000)