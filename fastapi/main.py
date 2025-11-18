import os
import re
import torch
import torch.nn as nn
import numpy as np
import pandas as pd
import joblib
import asyncio
import traceback
from typing import List

# --- 1. FastAPI 및 기본 라이브러리 임포트 (STT 관련 제거) ---
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
# import whisper # STT 모델 (제거)
# import shutil # STT 임시파일 (제거)

# --- 2. 노트북에서 가져온 라이브러리 임포트 ---
from fastapi.middleware.cors import CORSMiddleware
from transformers import BertTokenizer, BertModel, AutoTokenizer
from konlpy.tag import Okt
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.pipeline import Pipeline
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

# --- 3. 전역 설정 및 경로 ---
print("--- 1. 전역 설정 및 경로 초기화 ---")

# 중요: 모든 모델 파일은 ./models/ 폴더 안에 있어야 합니다.
BASE_PATH = "./models" 
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# 모델 경로 정의 (노트북 경로 -> 로컬 경로로 수정)
MODEL_SAVE_PATH_A = os.path.join(BASE_PATH, "klue_model_v1.bin")
MODEL_NAME_A = "klue/bert-base"
MODEL_SAVE_PATH_B = os.path.join(BASE_PATH, "kobert_divorce_end_input.pt")
MODEL_NAME_B = "monologg/kobert"
MODEL_PATH_C_INTENT = os.path.join(BASE_PATH, "intent_model_hybrid.joblib")
MODEL_PATH_C_TOPIC = os.path.join(BASE_PATH, "topic_best.joblib")
MODEL_PATH_C_SITUATION = os.path.join(BASE_PATH, "situation_model_v3_halving_best_10_31.joblib")
FAISS_INDEX_PATH_D = os.path.join(BASE_PATH, "law_faiss_index")
EMBEDDING_MODEL_D = "jhgan/ko-sroberta-multitask"
PRECEDENT_CSV_PATH_EF = os.path.join(BASE_PATH, "판례_라벨2.csv")
LAWBOOK_CSV_PATH_EF = os.path.join(BASE_PATH, "민법_소제목.csv")

# [A] 감정 분류 설정
EMOTION_LABELS = ['긍정', '분노', '불안', '슬픔', '혼란', '좌절']
NUM_LABELS_A = len(EMOTION_LABELS)
MAX_LEN_A = 128

# [C] 의도/주제/상황 설정
MINIMAL_STOPWORDS_C = list(set([
    '것', '수', '때', '등', '들', '더', '이', '그', '저', '나', '우리', '같', '또', '만', '년', '월', '일', '하다', '있다', '되다',
    '가능하다', '가능', '가다', '되다', '하다', '있다', '없다', '않다', '된다', '한다', '어떻게', '어떤', '무엇', '언제', '어디서', '왜', '누가', '얼마', '몇',
    '알고', '싶다', '궁금하다', '문의', '질문', '답변', '설명', '이해', '과정', '절차', '이후', '다음', '먼저', '그리고', '그러나', '하지만', '그래서', '제자','제호','제조',
    '없', '있', '하', '되', '않', '나', '우리', '너', '당신', '같', '또', '것', '때', '등', '때문', '정도', '사실', '생각', '경우', '문제', '방법', '상황', '내용', '결과', '사람',
    '해야', '하면', '경우', '때는', '어느', '무슨', '어디', '누구' , ' 가지다' , '가지','하나요', '위해', '이혼',
    '대한', '관련', '따르다', '인정', '성립', '발생', '주장', '되나요', '있나요', '인가요', '할까요', '되나', '있나'
]))
LEGAL_KEYWORDS_C = [
    '위자료', '재산분할', '양육권', '친권', '면접교섭', '협의이혼', '청구', '배상', '손해', '책임',
    '차용금', '반환', '취소', '원상회복', '사해행위', '채권자', '배우자', '이혼사유', '이혼', '사유', '증명', '근거', '조건', '요건','기준','요소','범위','의무','효력','적용','판단',
    '혼인', '금전거래', '청구권', '액수', '정해지', '부적법', '혼인파탄', '파탄', '분할', '양육비', '면접',
    '교섭', '협의', '조정신청', '손해배상', '부부', '배우자', '당사자', '사람', '개인', '상대방',"입증"
]
okt_C = Okt()


# --- 4. [A] 감정 분류 모델 정의 (노트북과 동일) ---
print("--- 2. [A] 감정 분류 모델 정의 ---")
class SentimentClassifier(torch.nn.Module):
    def __init__(self, n_classes):
        super(SentimentClassifier, self).__init__()
        self.bert = BertModel.from_pretrained(MODEL_NAME_A)
        self.dropout = torch.nn.Dropout(p=0.3)
        self.classifier = torch.nn.Linear(self.bert.config.hidden_size, n_classes)
    def forward(self, input_ids, attention_mask):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled_output = outputs.pooler_output
        output = self.dropout(pooled_output)
        return self.classifier(output)

def clean_text_emotion(text):
    text = re.sub(r"[^가-힣A-Za-z0-9\s.,?!]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def predict_sentiment(text, model, tokenizer):
    model.eval()
    text = clean_text_emotion(text)
    inputs = tokenizer.encode_plus(
        text, None, add_special_tokens=True, max_length=MAX_LEN_A,
        padding='max_length', return_token_type_ids=False, truncation=True,
        return_attention_mask=True, return_tensors='pt'
    )
    input_ids = inputs['input_ids'].to(device)
    attention_mask = inputs['attention_mask'].to(device)
    with torch.no_grad():
        outputs = model(input_ids=input_ids, attention_mask=attention_mask)
    probs = torch.sigmoid(outputs).cpu().numpy()[0]
    emotion_probs = list(zip(EMOTION_LABELS, [float(p) for p in probs])) # JSON 직렬화를 위해 float로 변환
    sorted_probs = sorted(emotion_probs, key=lambda item: item[1], reverse=True)
    high_prob_emotions = [label for label, prob in sorted_probs if prob >= 0.5]
    return text, sorted_probs, high_prob_emotions


# --- 5. [B] 문맥 분류 모델 정의 (노트북과 동일) ---
print("--- 3. [B] 문맥 분류 모델 정의 ---")
class KoBERTClassifier(nn.Module):
    def __init__(self, n_classes=2, dropout=0.3):
        super(KoBERTClassifier, self).__init__()
        self.bert = BertModel.from_pretrained(MODEL_NAME_B, trust_remote_code=True)
        self.dropout = nn.Dropout(dropout)
        self.classifier = nn.Linear(self.bert.config.hidden_size, n_classes)
    def forward(self, input_ids, attention_mask):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled_output = outputs.pooler_output
        output = self.dropout(pooled_output)
        return self.classifier(output)

def predict_context_kobert(text, model, tokenizer):
    model.eval()
    encoding = tokenizer.encode_plus(
        text, add_special_tokens=True, max_length=128,
        padding='max_length', truncation=True,
        return_attention_mask=True, return_tensors='pt'
    )
    input_ids = encoding['input_ids'].to(device)
    attention_mask = encoding['attention_mask'].to(device)
    with torch.no_grad():
        logits = model(input_ids, attention_mask)
        probs = torch.softmax(logits, dim=1)
        pred = torch.argmax(probs, dim=1)
    result = "이혼" if pred.item() == 1 else "비이혼"
    confidence = probs[0][pred.item()].item()
    prob_non_div = probs[0][0].item()
    prob_div = probs[0][1].item()
    return result, confidence, prob_non_div, prob_div


# --- 6. [C] 의도/주제/상황 모델 정의 (노트북과 동일) ---
print("--- 4. [C] 의도/주제/상황 모델 정의 ---")
def preprocess_text_C(text):
    protected_matches = {}
    def protect_term(match):
        original_word = match.group(0)
        if original_word not in protected_matches:
            protected_matches[original_word] = True
        return original_word
    def strip_josa(text):
        preserve_patterns = [
            r'자의\s*의무', r'의\s*법적', r'의\s*효력', r'의\s*책임', r'의\s*근거',
            r'의\s*성격', r'의\s*의미', r'의\s*개념'
        ]
        for pattern in preserve_patterns:
            if re.search(pattern, text): return text
        text = re.sub(r'(제\d+자|배우자|친권자|청구자|상대방|부부|혼인|정조의무|부양의무)(의|가|는|은|을|를|와|과)$', r'\1', text)
        return re.sub(r'([0-9가-힣]{2,})(의|가|를|은|는|과|와)$', r'\1', text)

    text = re.sub(r'(제\d+[가-힣]+)', protect_term, text)
    text = re.sub('[^ㄱ-ㅎㅏ-ㅣ가-힣0-9 ]', '', text)
    try:
        word_tokens = okt_C.pos(text, stem=True)
    except Exception as e:
        print(f"Okt POS 태깅 오류: {e} (입력: {text})")
        return ""
    meaningful_words = []
    for word, pos in word_tokens:
        if word in LEGAL_KEYWORDS_C:
            meaningful_words.append(word)
        elif pos in ['Noun', 'Verb', 'Number']:
            if pos == 'Number':
                pass
            elif pos in ['Noun', 'Verb'] and len(word) < 2:
                if word not in ['제', '조']:
                    continue
            token = strip_josa(word)
            if token not in MINIMAL_STOPWORDS_C:
                meaningful_words.append(token)
    for original_term in protected_matches.keys():
        processed_term = strip_josa(original_term)
        if processed_term not in meaningful_words:
             meaningful_words.append(processed_term)
    final_words = list(dict.fromkeys(meaningful_words))
    return ' '.join(final_words)

def detect_situation_C(text):
    text = str(text)
    if re.search(r"(외도|바람|불륜|부정행위|다른\s?(남자|여자)|상간|바람피|몰래 만남|배신|불륜상대|불성실|간통|외박|의심|첩|성매매|이성)", text): return "부정행위"
    if re.search(r"(폭력|폭행|맞았다|때리다|학대|욕|언어폭력|감정적 폭력|정서적 폭력|소리 질러|폭언|협박|위협|강요|구타|공포|무시|비하|따돌림|갑질|인격모독|병원 기록|진단서|녹음|맞은 흔적)", text): return "폭행/부당대우"
    if re.search(r"(생활비|돈|경제|수입|지출|빚|채무|도박|사기|금전|재정|경제적 부담|가정경제|돈 문제|생활이 어려워|생활이 힘들다|낭비|탕진|도박빚|파산|사업실패|용돈|빚쟁이|압류)", text): return "경제적 문제"
    if re.search(r"(집을 나가다|연락이 안|버리고 갔|떠났|유기|가출|집을 나왔|연락두절|집을 나간|행방불명|무단이탈|동거거부|부양 거부|의무 방기)", text): return "악의의 유기"
    if re.search(r"(시댁|며느리|장모|부모님|가족|가정문제|가정불화|시어머니|시아버지|친정|부모님 문제|가족 문제|고부갈등|장서갈등|형제갈등|사위|시가|처가|간섭)", text): return "가족 간 갈등"
    if re.search(r"(성격|대화가 안|소통이 안|불화|싸움|의견 차이|거리감|냉랭|감정이 식었|서로 맞지 않|다툼|성격이 달라|가치관 차이|무관심|섹스리스|잦은 다툼|차이|취미|안 맞|소통 안)", text): return "성격 차이/불화"
    return "해당 없음"

def predict_its(text, model_intent, model_topic, model_situation):
    pred_intent = model_intent.predict([text])[0]
    preprocessed_text = preprocess_text_C(text)
    if not preprocessed_text.strip():
        pred_topic = "N/A (전처리 결과 없음)"
        pred_situation_ml = "N/A (전처리 결과 없음)"
    else:
        pred_topic = model_topic.predict([preprocessed_text])[0]
        pred_situation_ml = model_situation.predict([preprocessed_text])[0]
    pred_situation_rule = detect_situation_C(text)
    if pred_situation_rule != "해당 없음":
        pred_situation = pred_situation_rule
    else:
        pred_situation = pred_situation_ml
    return pred_intent, pred_topic, pred_situation


# --- 7. [D] 질의응답 검색 모델 정의 (노트북과 동일) ---
print("--- 5. [D] 질의응답 검색 모델 정의 ---")
def search_qa_faiss(query, db, k=3):
    if db is None:
        return []
    # FAISS 결과(Document 객체)를 JSON 친화적인 dict 리스트로 변환
    results = db.similarity_search(query, k=k)
    processed_results = []
    for doc in results:
        content = doc.page_content.strip()
        question, answer = "", ""
        if '?' in content:
            try:
                parts = content.split('?', 1)
                question = parts[0].strip() + '?'
                answer = parts[1].strip()
            except Exception:
                question = "(분리 오류)"
                answer = content
        else:
            question = "(형식 불일치: '?' 없음)"
            answer = content
        processed_results.append({"question": question, "answer": answer})
    return processed_results


# --- 8. [E/F] 판례/법률 검색 로직 (JSON 반환용으로 수정) ---
print("--- 6. [E/F] 판례/법률 검색 (CSV 매칭 방식) 정의 ---")
def search_legal_csv(query, pred_i, pred_t, models):
    results = []
    df_precedent = models.get('df_precedent_labeled')
    df_law = models.get('df_law_content')

    if df_precedent is None or df_precedent.empty or df_law is None or df_law.empty:
        return [{"type": "error", "content": "판례 또는 법률 DB가 로드되지 않았습니다."}]

    # 의도가 '법률.판례'가 아니면 검색 안 함
    if pred_i != '법률.판례':
        return [{"type": "skipped", "content": f"의도가 '{pred_i}'이므로 법률/판례 검색을 건너뜁니다."}]

    search_keyword_for_ef = None
    search_mode = ""

    if not pred_t:
        search_keyword_for_ef = query
        search_mode = "주제 분류 실패"
    elif pred_t == '단순 이혼 질문':
        search_keyword_for_ef = query # 원본 query 사용
        search_mode = "법령 검색"
    else:
        search_keyword_for_ef = pred_t # 주제 키워드 사용 (예: '재산분할')
        search_mode = "판례 검색"

    # [A] "판례 검색" 모드
    if search_mode == "판례 검색":
        mask = df_precedent['라벨'].str.contains(search_keyword_for_ef, na=False)
        matched_precedents = df_precedent[mask]
        if matched_precedents.empty:
            results.append({"type": "precedent_miss", "content": f"'{search_keyword_for_ef}' 키워드와 일치하는 판례를 찾을 수 없습니다."})
        else:
            for _, row in matched_precedents.iterrows():
                ref_laws_details = []
                ref_law_str = row.get('참조법령_최종')
                if pd.notna(ref_law_str):
                    ref_law_list = [key.strip() for key in ref_law_str.split('\n') if key.strip()]
                    for law_key in ref_law_list:
                        law_detail = df_law[df_law['key'] == law_key]
                        if not law_detail.empty:
                            ref_laws_details.append({
                                "key": law_key,
                                "title": law_detail.iloc[0].get('소제목', 'N/A'),
                                "content": law_detail.iloc[0].get('content', 'N/A')
                            })
                        else:
                            ref_laws_details.append({"key": law_key, "title": "N/A", "content": "민법 DB에서 해당 법령을 찾을 수 없음"})
                
                results.append({
                    "type": "precedent",
                    "title": row.get('판시사항', 'N/A'),
                    "summary": row.get('요약문장', 'N/A'),
                    "references": ref_laws_details
                })

    # [B] "법령 검색" 모드
    elif search_mode == "법령 검색" or search_mode == "주제 분류 실패":
        m = re.search(r'(\d+)', search_keyword_for_ef)
        if m:
            jo_num = m.group(1)
            search_key = f"제{jo_num}조"
            law_detail = df_law[df_law['key'].str.contains(search_key, na=False)]
            if not law_detail.empty:
                for _, row in law_detail.iterrows():
                    results.append({
                        "type": "law",
                        "key": row.get('key'),
                        "title": row.get('소제목'),
                        "content": row.get('content')
                    })
            else:
                results.append({"type": "law_miss", "content": f"'{search_key}'에 대한 법률 내용을 DB에서 찾지 못했습니다."})
        else:
            results.append({"type": "law_miss", "content": "쿼리에서 법령 조항 번호를 추출할 수 없습니다."})
            
    return results

# --- 9. 모델 로딩 래퍼 (STT 모델 로더 제거) ---
print("--- 7. 모델 로딩 시작 ---")
def load_all_models():
    models = {}
    
    # [STT] Whisper 모델 로딩 (제거)
    # try:
    #     print("  [STT] Whisper 모델 로딩 중 (base)...")
    #     models['stt_model'] = whisper.load_model("base")
    #     print("  [STT] 완료.")
    # except Exception as e:
    #     print(f"  [STT] Whisper 모델 로딩 실패: {e}"); models['stt_model'] = None

    # [A] 감정 분류
    try:
        print("  [A] 감정 분류 모델 로딩 중...")
        models['tokenizer_A'] = BertTokenizer.from_pretrained(MODEL_NAME_A)
        model_A = SentimentClassifier(NUM_LABELS_A).to(device)
        model_A.load_state_dict(torch.load(MODEL_SAVE_PATH_A, map_location=device))
        model_A.eval()
        models['model_A'] = model_A
        print("  [A] 완료.")
    except Exception as e:
        print(f"  [A] 감정 분류 모델 로딩 실패: {e}"); models['model_A'] = None
    
    # [B] 문맥 분류
    try:
        print("  [B] 문맥 분류 모델 로딩 중...")
        models['tokenizer_B'] = AutoTokenizer.from_pretrained(MODEL_NAME_B, trust_remote_code=True)
        model_B = KoBERTClassifier(n_classes=2, dropout=0.3).to(device)
        model_B.load_state_dict(torch.load(MODEL_SAVE_PATH_B, map_location=device))
        model_B.eval()
        models['model_B'] = model_B
        print("  [B] 완료.")
    except Exception as e:
        print(f"  [B] 문맥 분류 모델 로딩 실패: {e}"); models['model_B'] = None

    # [C] 의도/주제/상황
    try:
        print("  [C] 의도/주제/상황 모델 로딩 중...")
        models['model_C_intent'] = joblib.load(MODEL_PATH_C_INTENT)
        models['model_C_topic'] = joblib.load(MODEL_PATH_C_TOPIC)
        models['model_C_situation'] = joblib.load(MODEL_PATH_C_SITUATION)
        print("  [C] 완료.")
    except Exception as e:
        print(f"  [C] 의도/주제/상황 모델 로딩 실패: {e}")
        models.update({'model_C_intent': None, 'model_C_topic': None, 'model_C_situation': None})
    
    # [D] FAISS
    try:
        print("  [D] 질의응답 (FAISS) DB 로딩 중...")
        embedding_D = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_D)
        models['db_D'] = FAISS.load_local(FAISS_INDEX_PATH_D, embedding_D, allow_dangerous_deserialization=True)
        print("  [D] 완료.")
    except Exception as e:
        print(f"  [D] 질의응답 (FAISS) DB 로딩 실패: {e}"); models['db_D'] = None

    # [E/F] CSV
    try:
        print("  [E/F] 판례/법률 (CSV) 데이터 로딩 중...")
        models['df_precedent_labeled'] = pd.read_csv(PRECEDENT_CSV_PATH_EF)
        models['df_law_content'] = pd.read_csv(LAWBOOK_CSV_PATH_EF)
        print(f"  [E/F] 판례 CSV 로드 완료. (Rows: {len(models['df_precedent_labeled'])})")
        print(f"  [E/F] 법률 CSV 로드 완료. (Rows: {len(models['df_law_content'])})")
        print("  [E/F] 완료.")
    except Exception as e:
        print(f"  [E/F] 판례/법률 CSV 로딩 실패: {e}")
        models['df_precedent_labeled'] = pd.DataFrame()
        models['df_law_content'] = pd.DataFrame()

    print("--- 8. 모든 모델 로딩 완료 ---")
    return models

# --- 10. (중요) FastAPI 앱 초기화 및 모델 로딩 ---
# FastAPI 앱이 시작될 때 모델을 딱 한 번만 로드합니다.
all_models = load_all_models()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 
    allow_credentials=True,
    allow_methods=["*"],  # 
    allow_headers=["*"],
)

# --- 11. API 엔드포인트 정의 ---

class QueryRequest(BaseModel):
    query: str

@app.get("/")
def read_root():
    return {"status": "AI RAG Server is running."} # STT 문구 제거

# [추가] Healthcheck 엔드포인트
@app.get("/health")
def health_check():
    # 간단하게 200 OK 상태와 메시지를 반환합니다.
    return {"status": "healthy"}

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
            asyncio.to_thread(predict_sentiment, query, all_models['model_A'], all_models['tokenizer_A']),
            asyncio.to_thread(predict_context_kobert, query, all_models['model_B'], all_models['tokenizer_B']),
            asyncio.to_thread(predict_its, query, all_models['model_C_intent'], all_models['model_C_topic'], all_models['model_C_situation']),
            asyncio.to_thread(search_qa_faiss, query, all_models['db_D'], k=3)
        )

        # (결과 정리)
        text_a, probs_a, preds_a = sentiment_result
        results['sentiment'] = {"cleaned_text": text_a, "probabilities": probs_a, "labels": preds_a}

        pred_b, conf_b, prob_non_div, prob_div = context_result
        results['context'] = {"prediction": pred_b, "confidence": conf_b, "prob_non_divorce": prob_non_div, "prob_divorce": prob_div}

        pred_i, pred_t, pred_s = its_result
        results['its_classification'] = {"intent": pred_i, "topic": pred_t, "situation": pred_s}

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
        # C에서 가져온 pred_i, pred_t 사용
        pred_i_val = results.get('its_classification', {}).get('intent')
        pred_t_val = results.get('its_classification', {}).get('topic')
        
        results['legal_search'] = await asyncio.to_thread(
            search_legal_csv, query, pred_i_val, pred_t_val, all_models
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
    summary_title_val = "상담 내용" # 기본값
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
