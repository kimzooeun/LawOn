import os
import re
import json
import uuid
import redis
import base64
import traceback
import asyncio

# stt - tts 추가
import numpy as np
import tempfile
import subprocess
import io
from typing import List,Optional
from openai import OpenAI
from fastapi import FastAPI, HTTPException, UploadFile, File 
import models_load         
from fastapi.responses import StreamingResponse  
from pydantic import BaseModel

# --- 노트북에서 가져온 라이브러리 임포트 ---
from fastapi.middleware.cors import CORSMiddleware

frontend_url = os.getenv("FRONTEND_URL")
origins = [frontend_url]

# --- FastAPI 앱 초기화 및 모델 로딩 ---
all_models = models_load.load_all_models()
simple_models = models_load.load_simple_models()

client = OpenAI() # API Key는 환경변수에서 자동 로드

# Redis 클라이언트 설정
redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
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

# 간편 상담 제한
LIMIT_SIMPLE = 5

# --- [DTO 정의] ---
class QueryRequest(BaseModel):
    query: str
    session_id: str  # 세션 유지를 위해 필수
    prev_summary: Optional[str] = None # Spring에서 보내준 요약본 받기

class SimpleChatRequest(BaseModel):
    session_id: Optional[str] = None
    query: str

class EndSessionRequest(BaseModel):
    session_id: str

class TTSRequest(BaseModel):
    text: str

class ReportRequest(BaseModel):
    session_id: str
    prev_summary: Optional[str] = None

class AudioPayload(BaseModel):
    audio_base64: str   # 브라우저에서 넘기는 base64 문자열
    mime_type: Optional[str] = None      # "audio/webm" 같은 MIME 타입

# [엔드포인트 추가] 최종 리포트 생성
@app.post("/generate-report")
async def generate_session_report(request: ReportRequest):
    session_id = request.session_id
    
    # 1. Redis에서 데이터 조회
    session_data = get_session_data(session_id)
    
    # 2. Redis에 데이터가 없으면(1시간 경과 등), Spring이 준 요약본 사용
    current_summary = session_data["summary"]
    if not current_summary and request.prev_summary:
        current_summary = request.prev_summary
        
    if not current_summary:
        return {"final_report": "상담 내용이 충분하지 않아 요약할 수 없습니다."}

    # 3. GPT-4o-mini를 이용해 [법률 상담 기초 조사서] 포맷으로 변환 (함수 이미 있음)
    final_report = await asyncio.to_thread(generate_final_report, current_summary)
    
    # 4. Redis 데이터 정리 (선택 사항: 종료했으니 TTL을 줄이거나 삭제)
    # redis_client.delete(f"rag:session:{session_id}") 
    
    return {"final_report": final_report}

# ===================================================================================================
# [Helper Functions] test24.py에서 가져온 로직 함수들
# ===================================================================================================

def call_gpt_aux(system_prompt, user_text):
    """보조 작업을 위한 가벼운 GPT 호출"""
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text},
            ],
            temperature=0.3
        )
        return completion.choices[0].message.content
    except Exception as e:
        print(f"GPT Aux Error: {e}")
        return ""

# 상담 제목 생성
def generate_title(first_query):
    sys_prompt = """
    사용자의 질문을 보고 '법률 상담 리스트'에 표시할 15자 이내의 제목을 지으세요.
    - 명사형으로 끝맺음 (예: ~문의, ~절차, ~여부)
    - 인용부호(')나 불필요한 수식어 제외
    - 예시: '재산분할 및 위자료 청구', '상간자 소송 증거 수집'
    """
    title = call_gpt_aux(sys_prompt, first_query)
    return title.replace("'", "").replace('"', "").strip()

# 대화 요약 업데이트 (법률 특화 강화 버전)
def update_conversation_summary(prev_summary, query, answer):
    sys_prompt = """
    당신은 '이혼 전문 법률 서기'입니다. 상담 내용을 누적하여 기록하세요.
    단순한 대화 요약이 아니라, **법적 쟁점이 되는 구체적 사실관계(Fact)** 위주로 정리해야 합니다.
    
    [작성 포맷 및 원칙]
    1. **[기본 정보]**: 혼인 기간, 자녀 수(나이), 재산 규모, 유책 사유(폭행, 외도 등)
    2. **[확보된 증거]**: (매우 중요) 사용자가 언급한 증거물(녹음, 진단서, 카톡, 영상, 증언 등)을 빠짐없이 나열하세요.
    3. **[상담 진행 상황]**: 
       - Q: 사용자의 핵심 질문
       - A: AI가 제공한 주요 법리/판례 요약
    4. **[Action Plan]**: 사용자가 앞으로 하기로 한 행동(예: 진술서 받기, 경찰 신고 등)
    
    *주의*: 감정적인 호소보다는 '누가, 언제, 무엇을 했는지' 객관적 사실 위주로 기록하세요.
    """
    user_text = f"""
    [이전 요약본]:
    {prev_summary if prev_summary else "(없음)"}
    
    [이번 턴 대화]:
    Q: {query}
    A: {answer}
    """
    return call_gpt_aux(sys_prompt, user_text)

# 최종 상담 리포트 (팩트 정리 & 면책 조항 강화)
def generate_final_report(full_summary):
    sys_prompt = """
    당신은 법률 상담 내용을 정리하는 **'객관적 기록 서기'**입니다.
    사용자와의 대화 내용(요약본)을 바탕으로 변호사 상담용 기초 자료를 작성하세요.

    [CRITICAL RULES: 절대 원칙]
    1. **NO HALLUCINATION (거짓 작성 금지)**: 사용자가 말하지 않은 내용은 절대 창작하지 마세요. 
       - 예: 자녀 나이를 말 안 했으면 "7세"라고 적지 말고, **"정보 없음"**이라고 적으세요.
    2. **Fact-Based**: 감정적인 호소보다는 '누가, 언제, 무엇을 했는지' 사실 관계 위주로 정리하세요.
    3. **Legal Disclaimer**: 하단에 지정된 면책 조항을 반드시 포함하세요.

    [리포트 작성 양식 (Markdown)]
    # [법률 상담 기초 조사서]

    ## 1. 사건 개요
    - **상황 키워드**: (예: 배우자 폭행, 외도 등)
    - **혼인 및 자녀 현황**: (대화에서 언급된 내용만 기재, 없으면 '정보 없음')
    - **핵심 요구사항**: (사용자가 AI에게 물어본 것들)

    ## 2. 주요 사실 관계 (User Statements)
    *사용자의 진술을 토대로 정리된 내용입니다.*
    - (대화 내용 중 '핵심 사실' 섹션에 있는 내용을 육하원칙으로 정리)

    ## 3. 증거 자료 현황
    - **확보된 증거**: (사용자가 "있다"고 말한 것만 기재)
    - **준비 예정/필요 증거**: (AI가 제안했거나 사용자가 준비하겠다고 한 것)

    ## 4. 관련 법률 정보 (AI 검색 결과)
    *AI가 데이터베이스에서 검색한 참고용 정보입니다.*
    - **관련 법령**: (대화 중 인용된 법령)
    - **관련 판례**: (대화 중 인용된 판례 요지)

    ---
    ### [⚠️ 중요: 문서 활용 시 유의사항]
    **1. 사실 확인 필수**: 본 문서는 AI와의 채팅 내용을 기반으로 자동 생성되었습니다. 내용에 오류나 누락이 있을 수 있으므로, **반드시 본인이 사실 관계(날짜, 금액 등)가 맞는지 직접 확인**하셔야 합니다.
    **2. 법적 효력 없음**: 이 문서는 변호사 상담을 돕기 위한 **참고용 기초 자료**일 뿐이며, 그 자체로 법적 효력을 갖거나 변호사의 법률 의견서를 대체할 수 없습니다.
    **3. 전문가 상담 권장**: 구체적인 소송 전략과 법적 판단은 반드시 변호사와 직접 상담하시기 바랍니다.
    """
    return call_gpt_aux(sys_prompt, full_summary)

# [1-1] 검색 필요 여부 판단 (Router)
def check_search_necessity(user_query):
    sys_prompt = """
    당신은 '검색 필요성 판별기'입니다.
    사용자의 발화가 아래 경우에 해당하면 반드시 **TRUE**를 출력하세요.
    
    1. 법률 정보, 절차, 비용, 서류 등을 묻는 경우
    2. **"가능할까?", "얼마나 될까?", "이길 수 있어?" 등 '예측/판단/정도'를 묻는 경우**
    3. 혼잣말 같아도 "억울해(법적으로 되나?)"라는 뉘앙스가 포함된 경우
    
    단순한 인사("안녕"), 짧은 감사("고마워"), 의미 없는 감탄사("아하")만 **FALSE**입니다.
    """
    result = call_gpt_aux(sys_prompt, user_query)
    return "TRUE" in result.upper()

# [1-2] 검색어 재작성 함수
def rewrite_query_if_needed(user_query, history_buffer, current_s, current_t):
    history_text = "\n".join([f"Q: {q}\nA: {a}" for q, a in history_buffer[-3:]])
    context_parts = []
    if current_s not in ['해당 없음', '정보 없음']: context_parts.append(f"상황: {current_s}")
    if current_t not in ['해당 없음', '정보 없음']: context_parts.append(f"주제: {current_t}")
    context_str = ", ".join(context_parts) if context_parts else "정보 없음"

    sys_prompt = f"""
    당신은 '검색 키워드 추출기'입니다. 상담사가 아닙니다.
    사용자의 질문을 **데이터베이스 검색용 단일 문장**으로 변환하세요.
    
    [강력한 제약 사항]
    1. **절대 답변하거나 설명하지 마세요.**
    2. 인사말, 위로의 말, 불필요한 서술어를 모두 제거하세요.
    3. 오직 '검색할 질문 내용'만 한 문장으로 출력하세요.
    
    [예시]
    - 입력: "그거 나누려면 어떻게 해?" (직전 대화: 재산분할)
    - 출력: 재산분할 절차 및 방법
    
    [누적된 상황]: {context_str}
    """
    user_input = f"""
    [이전 대화]:
    {history_text}
    
    [현재 질문]: {user_query}
    """
    return call_gpt_aux(sys_prompt, user_input)

# 검색 결과 재정렬 함수
def rerank_results(user_query, results, pred_s=None, pred_t=None):
    if not results: return []
    query_keywords = [w for w in user_query.replace("?", "").split() if len(w) > 1]
    scored_results = []
    for item in results:
        if not item: continue
        score = 0
        full_text = f"{item.get('title', '')} {item.get('summary', '')} {item.get('content', '')}"
        for r in item.get('references', []):
            full_text += f" {r.get('title', '')} {r.get('content', '')}"
        label_in_csv = item.get('label_in_csv', '')
        if pred_s and pred_s not in ['해당 없음', '정보 없음'] and pred_s in label_in_csv:
            score += 10
        if pred_t and pred_t not in ['해당 없음', '정보 없음'] and pred_t in label_in_csv:
            score += 5
        for keyword in query_keywords:
            if keyword in full_text:
                score += 2
        scored_results.append((score, item))
    scored_results.sort(key=lambda x: x[0], reverse=True)
    return [item for score, item in scored_results[:5]]

# ===================================================================================================
# [Redis Logic] 세션 데이터 관리
# ===================================================================================================

def get_session_data(session_id: str):
    key = f"rag:session:{session_id}"
    data_str = redis_client.get(key)
    if data_str:
        return json.loads(data_str)
    return {
        "history": [],              # 대화 내역 (누적) [{"role":.., "content":..}]
        "summary": "",              # 대화 요약 (누적 업데이트)
        "title": None,              # 상담 제목 (최초 1회)
        "final_report": None,       # 최종 리포트 (종료 시)
        "current_context": {        # 모델 분석 결과 (턴마다 덮어쓰기)
            "sentiment": {},
            "context_prediction": {},
            "its": {"intent": None, "topic": None, "situation": None}
        },
        "last_rag_data": {          # 검색 결과 (턴마다 덮어쓰기)
            "qa": [],
            "precedent": [],
            "law": []
        }
    }

def save_session_data(session_id: str, data: dict):
    key = f"rag:session:{session_id}"
    redis_client.set(key, json.dumps(data))
    redis_client.expire(key, 3600)  # 1시간 TTL

# ===================================================================================================
# [API Endpoints]
# ===================================================================================================

@app.get("/")
def read_root():
    return {"status": "AI RAG Server is running (Enhanced Version)."}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# -----------------------------------------------------------------------------
# [메인 로직] RAG 응답 생성 (test24.py 로직 적용)
# -----------------------------------------------------------------------------
@app.post("/generate-response")
async def handle_generate_response(request: QueryRequest):
    query = request.query
    session_id = request.session_id
    
    # 1. Redis 세션 로드
    session_data = get_session_data(session_id)

    # ⭐ [핵심 로직] Redis 기억이 날아갔는데(history 비어있음), DB 요약본(prev_summary)이 있다면?
    # => "아, 이거 1시간 지나서 다시 오신 분이구나. 요약본으로 기억 복구하자!"
    if not session_data["history"] and request.prev_summary:
        print(f"♻️ 세션 만료됨. DB 요약본으로 기억 복원: {session_id}")
        session_data["summary"] = request.prev_summary

    history = session_data["history"]
    turn_count = len([x for x in history if x['role'] == 'user']) + 1

    # 상담 제목 생성 (첫 턴인 경우)
    if turn_count == 1 and not session_data["title"]:
        session_data["title"] = await asyncio.to_thread(generate_title, query)

    # -----------------------------------------
    # [Step 1] 기본 모델 분석 (병렬 실행)
    # -----------------------------------------
    try:
        (sentiment_res, context_res, its_res) = await asyncio.gather(
            asyncio.to_thread(models_load.predict_sentiment, query, all_models['model_A'], all_models['tokenizer_A']),
            asyncio.to_thread(models_load.predict_context_kobert, query, all_models['model_B'], all_models['tokenizer_B']),
            asyncio.to_thread(models_load.predict_full, query, all_models)
        )
        
        # 결과 파싱 및 Redis 덮어쓰기 데이터 준비
        text_a, probs_a, preds_a = sentiment_res
        
        # 감정 레이블 포맷팅
        emotion_labels = ", ".join([f"{l}({p:.2f})" for l, p in probs_a[:2]]) if probs_a else "평온/중립"
        session_data["current_context"]["sentiment"] = {
            "cleaned_text": text_a,
            "labels": preds_a,
            "probabilities": probs_a[:2], # 상위 2개만 저장
            "formatted": emotion_labels
        }

        pred_b, conf_b, prob_non, prob_div = context_res
        session_data["current_context"]["context_prediction"] = {
            "label": pred_b,
            "confidence": conf_b,
            "is_divorce": (pred_b == "이혼")
        }

        its_final = its_res.get("its", {})
        # 기존 값 유지 로직 (Sticky Logic) - test24.py 참조
        prev_its = session_data["current_context"]["its"]
        
        new_i = its_final.get("intent")
        new_t = its_final.get("topic")
        new_s = its_final.get("situation")
        
        def is_valid(val): return val and val not in ["해당 없음", "기타", "정보 없음", "N/A", None]
        
        final_i = new_i if is_valid(new_i) else (prev_its.get("intent") or "해당 없음")
        final_t = new_t if is_valid(new_t) else (prev_its.get("topic") or "해당 없음")
        final_s = new_s if is_valid(new_s) else (prev_its.get("situation") or "해당 없음")
        
        session_data["current_context"]["its"] = {
            "intent": final_i,
            "topic": final_t,
            "situation": final_s
        }

    except Exception as e:
        print(f"Model Execution Error: {e}")
        traceback.print_exc()
        # 에러 시 기존 값 유지 혹은 기본값
        final_i, final_t, final_s = "해당 없음", "해당 없음", "해당 없음"

    # [Step 2] 검색 전략 
    is_search_needed = True
    if turn_count > 1:
        is_search_needed = await asyncio.to_thread(check_search_necessity, query)
    
    search_query = query
    if is_search_needed and turn_count > 1:
        search_query = await asyncio.to_thread(
            rewrite_query_if_needed, query, history, final_s, final_t
        )
    
    qa_results = []
    precedent_list = []
    law_list = []

    if is_search_needed:
        try:
            # QA 검색과 법률 검색 병렬
            qa_results = await asyncio.to_thread(models_load.search_qa_faiss, search_query, all_models['db_D'], k=3)
            
            # 법률/판례 검색 (CSV)
            legal_raw = await asyncio.to_thread(
                models_load.search_legal_csv, search_query, final_i, final_t, final_s, all_models
            )
            # Reranking
            legal_top5 = rerank_results(search_query, legal_raw, final_s, final_t)
            
            # 분류 (판례 vs 법령)
            precedent_list = [item for item in legal_top5 if item.get('type') == 'precedent']
            law_list_raw = [item for item in legal_top5 if item.get('type') == 'law']
            
            # 판례 참조 법령 추출하여 law_list에 추가
            existing_keys = set(item.get('key') for item in law_list_raw)
            for prec in precedent_list:
                for ref in prec.get('references', []):
                    ref_key = ref.get('key')
                    if ref_key and ref_key not in existing_keys:
                        law_list_raw.append({
                            "type": "law",
                            "key": ref_key,
                            "title": ref.get('title'),
                            "content": ref.get('content')
                        })
                        existing_keys.add(ref_key)
            law_list = law_list_raw

            # Redis에 검색 결과 덮어쓰기
            session_data["last_rag_data"] = {
                "qa": qa_results,
                "precedent": precedent_list,
                "law": law_list
            }
            
        except Exception as e:
            print(f"Search Process Error: {e}")
            traceback.print_exc()

    # [3] LLM 프롬프트 조립 
    # 1. RAG 데이터 텍스트화 (Rag Context)
    rag_context_str = ""
    if qa_results:
        rag_context_str += "\n### [D] 질의응답 (유사 질문) ###\n"
        for i, item in enumerate(qa_results):
            if 'error' in item: continue
            rag_context_str += f"{i+1}. Q: {item.get('question')}\n   A: {item.get('answer')}\n"
    if precedent_list:
        rag_context_str += "\n### [E] 관련 판례 ###\n"
        for item in precedent_list:
            prec_text = f"\n[판례] {item.get('title')}\n요약: {item.get('summary')}"
            rag_context_str += f"{prec_text}\n"
    if law_list:
        rag_context_str += "\n### [F] 관련 법령 ###\n"
        for item in law_list:
            law_text = f"\n[법령] {item.get('key')} ({item.get('title')})\n내용: {item.get('content')}"
            rag_context_str += f"{law_text}\n"

    if not rag_context_str: 
        rag_context_str = "※ 검색 결과 없음. (일반적인 공감과 절차 안내만 수행할 것)"

    # 2. 전략 수립 로직
    # (1) 변수 추출
    # 직전 AI 답변 (앵무새 방지용)
    last_ai_msg = ""
    if history and history[-1]['role'] == 'assistant':
        last_ai_msg = history[-1]['content']
        
    # 감정 점수 추출
    probs_a = session_data["current_context"]["sentiment"].get("probabilities", [])
    detected_emotion = session_data["current_context"]["sentiment"].get("formatted", "평온/중립")

    # (2) 키워드/상황 감지
    shocking_keywords = ["때렸어", "맞았어", "피", "응급실", "경찰", "목격", "위협", "칼", "살해", "죽어", "폭행"]
    is_shocking = any(k in query for k in shocking_keywords)
    
    lawyer_keywords = ["변호사", "추천", "선임", "전문가", "상담 예약", "소송 비용", "연결", "만나고 싶어"]
    is_lawyer_request = any(k in query for k in lawyer_keywords) and \
                        ("추천" in query or "선임" in query or "연결" in query or "상담" in query or "필요" in query)

    # [1] 공감 레벨 설정용 (기존 유지)
    # 용도: 말투, 위로의 강도 결정 (0.8 이상)
    high_emotion = False
    if probs_a:
        top_label, top_score = probs_a[0]
        if top_score >= 0.8 and top_label in ["분노", "슬픔", "불안", "상처"]:
            high_emotion = True

    # [2] 안전 경고 트리거용 (신규 추가)
    # 용도: 112/1366 경고문 출력 여부 결정 (0.9 이상 & 슬픔/불안 한정)
    critical_emotion = False
    if probs_a:
        top_label, top_score = probs_a[0]
        if top_score >= 0.9 and top_label in ["슬픔", "불안"]:
            critical_emotion = True

    # (3) 시나리오 분기 (Empathy & CTA)
    empathy_instruction = ""
    cta_instruction = ""
    special_scenario_instruction = "" 

    # [CASE A: 변호사 추천]
    if is_lawyer_request:
        special_scenario_instruction = f"""
        [Special Scenario: Lawyer Recommendation Triggered]
        - **상황**: 사용자가 변호사 추천이나 전문가 연결을 요청했습니다.
        - **행동**: 다른 법률 설명보다 우선하여, 아래 내용을 안내하세요.
        - **필수 포함 멘트**:
            1. "만약 변호사의 도움이 필요하시다면, 저희 플랫폼에는 검증된 전문 변호사님들이 등록되어 있습니다."
            2. "고객님의 현재 상황('{final_s}')과 주제('{final_t}')에 가장 적합한 분을 지역별로 추천해 드릴 수 있습니다."
            3. "다른 변호사 사무실을 방문하실 계획이라면, 지금까지 저와 나누신 대화를 정리한 [상담 내용 요약]을 가져가실 수 있습니다."
            4. "이 리포트는 상담 참고용 자료이며, 내용은 본인이 직접 확인하셔야 합니다."
            5. "상담 요약을 받고 싶으시다면 [상담 요약하기] 버튼을 눌러주세요."
        """
        # 변호사 추천 시에는 공감과 CTA를 간소화
        empathy_instruction = "[지침: 변호사 연결을 원하므로, 간결하고 신뢰감 있는 태도로 응대하세요.]"
        cta_instruction = "[지침: 리포트 생성 버튼을 누르도록 유도하는 것이 목표입니다.]"

    # [CASE B: 일반 상담]
    else:
        # 공감 레벨링
        if turn_count == 1 or is_shocking or high_emotion:
            empathy_instruction = f"""
            [지침 1: 깊은 위로와 지지 (Level 3)]
            - 행동: **"그동안 얼마나 무섭고 막막하셨을까요...", "상상하기 힘든 고통을 혼자 견디셨군요"** 처럼 깊이 공감하세요.
            - 금지: 건조한 "놀라셨겠습니다" 금지.
            """
        elif "아이" in query or "돈" in query or "걱정" in query or "불안" in detected_emotion:
            empathy_instruction = f"""
            [지침 1: 구체적 맞장구 (Level 2)]
            - 행동: **"아이 문제라 더 마음이 쓰이시겠습니다", "당장 생활비가 막막하신 상황이군요"** 처럼 걱정을 거울처럼 비춰주세요.
            """
        else:
            empathy_instruction = f"""
            [지침 1: 신속한 연결 (Level 1)]
            - 행동: 이미 위로했거나 정보 교환 중입니다. **"다행입니다", "준비하신 자료는 매우 중요합니다"** 처럼 짧게 호응하고 본론으로 가세요.
            """
        
        # 일반 CTA
        cta_instruction = f"""
        [지침 2: 심화 질문 (Deep-Dive CTA)]
        - 행동: 주제('{final_t}')와 관련하여 사용자가 방금 제시한 정보(New Info)를 구체화하는 질문을 하세요.
        - 예: "선생님이 증언해 준대" -> "그 증언을 서면(진술서)으로 받아두실 수 있나요?"
        """

    # (5) 의도별 스타일 가이드
    intent_guidelines = {
        "법률.판례": """[모드: RAG 법률 해설] [5. 법률 근거 자료]의 판례/법령만 인용하세요. 없는 내용은 지어내지 마세요.""",
        "절차.방법": """[모드: 실무 가이드] "하세요(Do)" 대신 "**~가 실무상 주로 활용됩니다(Descriptive)**"라고 설명하세요.""",
        "증거.입증": """[모드: 증거 전략] 증거의 법적 효력 요건(날짜, 식별 등)을 설명하고, 불법 녹음 주의를 주세요.""",
        "가능 여부 판단": """[모드: 경향성 안내] 확답("이깁니다") 대신 "**법원은 ~한 경우 긍정적으로 판단하는 경향이 있습니다**"라고 하세요.""",
        "금액.산정": """[모드: 산정 기준] 금액 확답 대신 산정 기준표나 기여도 판단 기준을 설명하세요.""",
        "기타": """[모드: 상담 리드] 문맥에 맞춰 유연하게 다음 절차를 안내하세요."""
    }
    style_guide = intent_guidelines.get(final_i, intent_guidelines["기타"])

    # 3. 시스템 프롬프트 최종 조립
    system_prompt = f"""
    ### [Role]
    당신은 '법률 지식과 따뜻한 인간미를 겸비한 이혼 전문 AI 조력자'입니다. 

    ### [Context Information]
    - **사용자 상황**: {final_s} 
    - **감정 상태**: {detected_emotion} 
    - **현재 의도**: {final_i}

    ### [Strategy 1: Reaction & Empathy]
    {empathy_instruction}

    ### [Strategy 2: Lead the Conversation]
    {cta_instruction}

    {special_scenario_instruction} 
    
    ### [Strategy 3: Legal Guidance Style]
    {style_guide}

    ### [CRITICAL RULES: Anti-Parrot]
    1. **Check Previous Answer**: 아래 제공될 `[3. 🚫 직전 답변]`을 반드시 확인하세요.
    2. **Don't Repeat Introductions**: 직전 답변에서 썼던 도입부나 안전 경고 멘트를 **절대 다시 쓰지 마세요.**
    3. **Source of Truth**: 법률 정보는 **[5. 법률 근거 자료]**에서만 가져오세요.
    """
    
    # 4. 사용자 메시지 조립
    recent_history_str = "\n".join([f"User: {m['content']}" if m['role']=='user' else f"AI: {m['content']}" for m in history[-3:]])

    user_msg_content = f"""
    ### [1. 현재 상담 현황]
    - 사용자 질문: "{query}" (재작성: "{search_query}")
    
    ### [2. 대화 내역]
    {recent_history_str if recent_history_str else "(없음)"}
    
    ### [3. 🚫 직전 답변 (반복 금지 타겟)]
    "{last_ai_msg}"
    **경고: 위 텍스트에 있는 문장, 특히 서두의 위로 멘트나 질문 내용을 토씨 하나 틀리지 않고 반복하면 감점입니다.**

    ### [4. 전체 요약]
    {session_data["summary"]}

    ### [5. 법률 근거 자료 (RAG Data: The ONLY Source of Truth)]
    아래 제공된 [질의응답], [판례], [법령] 내용을 기반으로 답변하세요.
    ---
    {rag_context_str}
    ---

    ### [작성 지시 사항]
    1. 사용자가 방금 말한 새로운 단어(예: 선생님, 카톡, 영상 등)를 포함하여 답변하세요.
    2. 위 [3. 🚫 직전 답변]과 겹치지 않는 새로운 표현을 사용하세요.
    3. 법적 정보는 안전하게(Descriptive) 전달하세요.
    """

    # LLM 호출
    try:
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg_content},
            ],
            temperature=0.1
        )
        ai_answer = completion.choices[0].message.content

        # ------------------------------------------------------------------
        # [수정] 위기 등급 판별 로직 (우선순위: DANGER > HIGH > MEDIUM)
        # ------------------------------------------------------------------
        alert_severity = None  # 기본값 없음
        
        # 1. 자살/살해 암시 (가장 위험 -> DANGER)
        suicide_keywords = ["죽고 싶", "자살", "살해", "죽어버", "같이 죽", "살고 싶지 않아", "죽여버"]
        if any(k in query for k in suicide_keywords):
            alert_severity = "DANGER"

        # 2. 우울/불안 감정 0.9 이상 (심각 -> HIGH)
        # (이미 DANGER가 설정되었다면 건너뜀)
        elif alert_severity is None and critical_emotion: 
            alert_severity = "HIGH"

        # 3. 폭력/부당대우 상황 키워드 (주의 -> MEDIUM)
        # (이미 DANGER나 HIGH가 설정되었다면 건너뜀)
        elif alert_severity is None and ("폭력" in final_s or "부당대우" in final_s or is_shocking):
            alert_severity = "MEDIUM"


        # [경고문 강제 추가 로직]
        # alert_severity가 하나라도 설정되었다면 경고문 부착
        if alert_severity:
            safety_msg = "\n\n※ 긴급한 위험이 있다면 112나 1366에 도움을 요청하세요."
            if "112" not in ai_answer and "1366" not in ai_answer:
                ai_answer += safety_msg

        # 면책 조항 추가 (LLM이 빼먹었을 경우 강제 추가)
        DISCLAIMER_MSG = "\n\n※본 답변은 참고용이며, 법적 조언이 아닙니다. 필요한 경우 전문가 상담을 권합니다."
        if "본 답변은 참고용이며," not in ai_answer:
            ai_answer += DISCLAIMER_MSG

    except Exception as e:
        ai_answer = "죄송합니다. 답변 생성 중 오류가 발생했습니다."
        print(f"LLM Error: {e}")

    # -----------------------------------------
    # [Step 4] 데이터 업데이트 및 저장
    # -----------------------------------------
    
    # 1. History 누적
    session_data["history"].append({"role": "user", "content": query})
    session_data["history"].append({"role": "assistant", "content": ai_answer})
    
    # 2. 요약 업데이트 (비동기 처리 추천하지만 여기선 await)
    new_summary = await asyncio.to_thread(update_conversation_summary, session_data["summary"], query, ai_answer)
    session_data["summary"] = new_summary
    
    # 3. Redis 저장
    save_session_data(session_id, session_data)

    # -----------------------------------------
    # [Step 5] 응답 반환 (Back-End 규격 맞춤)
    # -----------------------------------------
    
    chatbotResponse = {
        "content": ai_answer,
        "sender": "CHATBOT"
    }
    
    sessionUpdates = {
        "summaryTitle": session_data["title"], 
        "summary": session_data["summary"] # 매 턴마다 업데이트된 요약 전달
    }
    
    # KeywordAnalysis용 데이터 구성
    keywordAnalysis = {
        "isDivorce": session_data["current_context"]["context_prediction"].get("is_divorce"),
        "emotionLabel": session_data["current_context"]["sentiment"].get("formatted"),
        "topic": final_t,
        "intent": final_i,
        "situation": final_s,
        "retrievedData": session_data["last_rag_data"], # 검색 결과 원본
        "alertSeverity": alert_severity
    }

    return {
        "keywordAnalysis": keywordAnalysis,
        "chatbotResponse": chatbotResponse,
        "sessionUpdates": sessionUpdates
    }

# [엔드포인트 4: 간편 상담 이력 조회]
@app.get("/fastapi/simple-chat/history")
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


# base64 -> Whisper 변환 (Multipart 필요 없음)
async def run_stt_from_bytes(raw_bytes: bytes):
    tmp_in_path = None
    tmp_out_path = None

    try:
        # 1) webm 임시 파일 생성
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
            tmp_in.write(raw_bytes)
            tmp_in_path = tmp_in.name

        # 2) 변환 wav 파일 경로
        tmp_out_path = tmp_in_path + ".wav"

        # 3) ffmpeg 변환
        cmd = [
            "ffmpeg", "-y",
            "-i", tmp_in_path,
            "-ar", "16000",
            "-ac", "1",
            tmp_out_path
        ]
        process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        if process.returncode != 0:
            raise Exception(process.stderr.decode("utf-8"))

        # 4) wav 읽기
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
        if tmp_in_path and os.path.exists(tmp_in_path):
            os.remove(tmp_in_path)
        if tmp_out_path and os.path.exists(tmp_out_path):
            os.remove(tmp_out_path)



@app.post("/fastapi/stt-json")
async def stt_json(payload: AudioPayload):
    try:
        # base64 → bytes
        audio_bytes = base64.b64decode(payload.audio_base64)

        # Whisper 처리
        text = await run_stt_from_bytes(audio_bytes)

        return {"text": text}

    except Exception as e:
        print("STT JSON 오류:", e)
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/fastapi/stt")
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

@app.post("/fastapi/tts")
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
