import os
import re
import json
import uuid
import redis
import traceback
import uvicorn
import asyncio

# stt tts 추가 및 튜닝 관련 임포트
import numpy as np
import soundfile as sf
import noisereduce as nr

# tts 추가
import aiofiles
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

class SimpleChatRequest(BaseModel):
    session_id: Optional[str] = None
    query: str

class EndSessionRequest(BaseModel):
    session_id: str

class TTSRequest(BaseModel):
    text: str

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

def generate_title(first_query):
    sys_prompt = """
    사용자의 질문을 보고 '법률 상담 리스트'에 표시할 15자 이내의 제목을 지으세요.
    - 명사형으로 끝맺음 (예: ~문의, ~절차, ~여부)
    - 인용부호(')나 불필요한 수식어 제외
    """
    title = call_gpt_aux(sys_prompt, first_query)
    return title.replace("'", "").replace('"', "").strip()

def update_conversation_summary(prev_summary, query, answer):
    sys_prompt = """
    당신은 '이혼 전문 법률 서기'입니다. 상담 내용을 누적하여 기록하세요.
    단순 나열이 아니라, **법적 쟁점(Fact)** 위주로 정리해야 합니다.
    
    [작성 포맷]
    1. [기본 정보]: 혼인 기간, 자녀, 재산, 유책 사유
    2. [확보된 증거]: 사용자가 언급한 증거물(녹음, 진단서 등)
    3. [상담 진행]: 핵심 질문(Q)과 AI 답변 요지(A)
    4. [Action Plan]: 향후 행동 계획
    """
    user_text = f"[이전 요약]:\n{prev_summary}\n\n[이번 대화]:\nQ: {query}\nA: {answer}"
    return call_gpt_aux(sys_prompt, user_text)

def generate_final_report(full_summary):
    sys_prompt = """
    당신은 법률 상담 내용을 정리하는 '객관적 기록 서기'입니다.
    요약본을 바탕으로 변호사 상담용 기초 조사서를 작성하세요.
    *사용자가 언급하지 않은 내용은 '정보 없음'으로 표기하고 절대 지어내지 마세요.*
    
    [양식]
    # [법률 상담 기초 조사서]
    ## 1. 사건 개요
    ## 2. 주요 사실 관계
    ## 3. 증거 자료 현황
    ## 4. 관련 법률 정보(AI 검색 기반)
    ---
    ### [⚠️ 유의사항]
    본 문서는 참고용이며 법적 효력이 없습니다.
    """
    return call_gpt_aux(sys_prompt, full_summary)

def check_search_necessity(user_query):
    sys_prompt = """
    사용자의 질문이 법률 정보, 절차, 판단, 예측을 묻는 경우 'TRUE'를 출력하세요.
    단순 인사나 짧은 감탄사는 'FALSE'입니다.
    """
    result = call_gpt_aux(sys_prompt, user_query)
    return "TRUE" in result.upper()

def rewrite_query_if_needed(user_query, history_list, current_s, current_t):
    # history_list: [{"role": "user", "content": "..."}...] 형태 가정
    recent_dialogue = ""
    if history_list:
        # 최근 2턴만 가져옴
        recent = history_list[-4:] 
        recent_dialogue = "\n".join([f"{msg['role']}: {msg['content']}" for msg in recent])

    sys_prompt = f"""
    당신은 '검색 키워드 추출기'입니다.
    이전 대화와 현재 질문을 참고하여 **데이터베이스 검색용 단일 문장**을 만드세요.
    답변하지 말고 검색어만 출력하세요.
    [상황]: {current_s}, [주제]: {current_t}
    """
    user_input = f"[이전 대화]:\n{recent_dialogue}\n\n[현재 질문]: {user_query}"
    return call_gpt_aux(sys_prompt, user_input)

def rerank_results(user_query, results, pred_s=None, pred_t=None):
    if not results: return []
    query_keywords = [w for w in user_query.replace("?", "").split() if len(w) > 1]
    scored_results = []
    
    for item in results:
        if not item: continue
        score = 0
        # 텍스트 통합
        full_text = f"{item.get('title', '')} {item.get('summary', '')} {item.get('content', '')}"
        # 레퍼런스 내용도 포함
        for r in item.get('references', []):
            full_text += f" {r.get('title', '')} {r.get('content', '')}"
            
        label_in_csv = str(item.get('label_in_csv', ''))
        
        # 가중치 계산
        if pred_s and pred_s not in ['해당 없음', '정보 없음', None] and pred_s in label_in_csv:
            score += 10
        if pred_t and pred_t not in ['해당 없음', '정보 없음', None] and pred_t in label_in_csv:
            score += 5
        
        for keyword in query_keywords:
            if keyword in full_text:
                score += 2
        
        scored_results.append((score, item))
    
    scored_results.sort(key=lambda x: x[0], reverse=True)
    # 상위 5개 반환
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

    # -----------------------------------------
    # [Step 2] 검색 전략 (test24.py 로직)
    # -----------------------------------------
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

    # -----------------------------------------
    # [Step 3] LLM 프롬프트 조립 (test24.py 로직 이식)
    # -----------------------------------------
    
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

    # 2. 전략 수립 로직 (test24.py의 핵심 로직)
    
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

    high_emotion = False
    if probs_a:
        top_label, top_score = probs_a[0] # (label, score) 튜플 형태 가정
        if top_score >= 0.8 and top_label in ["분노", "슬픔", "불안", "상처"]:
            high_emotion = True

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
          3. "다른 변호사 사무실을 방문하실 계획이라면, 지금까지 저와 나누신 대화를 정리한 **[상담 내용 요약 리포트]**를 가져가실 수 있습니다."
          4. "이 리포트는 상담 참고용 자료이며, 내용은 본인이 직접 확인하셔야 합니다."
          5. "상담 요약을 받고 싶으시다면 **상담 종료 버튼을 눌러주세요.**"
        """
        empathy_instruction = "[지침: 변호사 연결을 원하므로, 간결하고 신뢰감 있는 태도로 응대하세요.]"
        cta_instruction = "[지침: 리포트 생성 버튼(상담 종료)을 누르도록 유도하는 것이 목표입니다.]"
    
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

    # (4) 안전 경고 트리거
    safety_footer_trigger = ""
    # 폭력 관련 상황이거나 충격 키워드가 있으면 경고 문구 추가 (단, 이미 경고했는지 여부를 세션에 저장하면 좋지만, 여기선 매번 체크)
    if "폭력" in final_s or "부당대우" in final_s or is_shocking:
        safety_footer_trigger = "\n[Safety Warning]\n답변 최하단에 '※ 긴급한 위험이 있다면 112나 1366에 도움을 요청하세요.' 문구를 반드시 추가하세요."

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
    {safety_footer_trigger}
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
        
        # 면책 조항 추가 (LLM이 빼먹었을 경우 강제 추가)
        DISCLAIMER_MSG = "\n\n※ 본 답변은 법적 조언이 아닌 참고용 정보이며, 정확한 판단을 위해서는 전문가 상담이 필요합니다."
        if "본 답변은 법적 조언이 아닌" not in ai_answer:
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
        "retrievedData": session_data["last_rag_data"] # 검색 결과 원본
    }

    return {
        "keywordAnalysis": keywordAnalysis,
        "chatbotResponse": chatbotResponse,
        "sessionUpdates": sessionUpdates
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

    print("파일 이름:", audio_file.filename)
    print("파일 사이즈:", len(raw_data))
    # pysub으로 불러오기
    audio = AudioSegment.from_file(io.BytesIO(raw_data), format="webm")

    wav_buf = io.BytesIO()
    audio.set_frame_rate(16000).set_channels(1).export(
        wav_buf, 
        format="wav"
    )    
    wav_buf.seek(0)

    # 2) Whisper 호출
    transcription = client.audio.transcriptions.create(
        model="whisper-1",
        file=("audio.wav", wav_buf, "audio/wav"),
        response_format="text",
        language="ko"
    )
    return transcription

@app.post("/stt")
async def stt_endpoint(audio_file: UploadFile = File(...), sensitivity: float = 1.0, noise_reduction: bool = False, auto_gain: bool = False):
    try:
        text = await run_stt_memory(audio_file)
        return {"text": text}
    except Exception as e:
        print("STT 오류:", e)
        return {"error": str(e)}

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
