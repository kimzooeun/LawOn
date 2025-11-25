import os
import re
import joblib
import torch
import json
import torch.nn as nn
import pandas as pd

from transformers import BertTokenizer, BertModel, AutoModel,AutoTokenizer
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings


# --- 전역 설정 및 경로 ---
BASE_PATH = "./models" 
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# 모델 경로 정의 (노트북 경로 -> 로컬 경로로 수정)
MODEL_SAVE_PATH_A = os.path.join(BASE_PATH, "klue_model_v1.bin")
MODEL_NAME_A = "klue/bert-base"

MODEL_SAVE_PATH_B = os.path.join(BASE_PATH, "kobert_divorce_end_input.pt")
MODEL_NAME_B = "monologg/kobert"

# kobert된 의도/주제/상황 모델
SITUATION_MODEL_PATH = os.path.join(BASE_PATH, "best_kobert_situation_new.pt")
INTENT_MODEL_PATH    = os.path.join(BASE_PATH, "best_kobert_intent.pt")
TOPIC_MODEL_PATH     = os.path.join(BASE_PATH, "best_kobert_topic_new.pt")


# ---- 의도/주제/상황 라벨 로드 ----
with open(os.path.join(BASE_PATH, "id2situ.json"), "r", encoding="utf-8") as f:
    id2situ = json.load(f)

with open(os.path.join(BASE_PATH, "id2intent.json"), "r", encoding="utf-8") as f:
    id2intent = json.load(f)

with open(os.path.join(BASE_PATH, "id2topic.json"), "r", encoding="utf-8") as f:
    id2topic = json.load(f)

# --- 의도/주제/상황 라벨 로드 ----
SITU_LABEL_PATH   = os.path.join(BASE_PATH, "id2situ.json")
INTENT_LABEL_PATH = os.path.join(BASE_PATH, "id2intent.json")
TOPIC_LABEL_PATH  = os.path.join(BASE_PATH, "id2topic.json")

FAISS_INDEX_PATH_D = os.path.join(BASE_PATH, "law_faiss_index")
EMBEDDING_MODEL_D = "jhgan/ko-sroberta-multitask"

PRECEDENT_CSV_PATH_EF = os.path.join(BASE_PATH, "판례_라벨2.csv")
LAWBOOK_CSV_PATH_EF = os.path.join(BASE_PATH, "민법_소제목.csv")


# [A] 감정 분류 설정
EMOTION_LABELS = ['긍정', '분노', '불안', '슬픔', '혼란', '좌절']
NUM_LABELS_A = len(EMOTION_LABELS)
MAX_LEN_A = 128

# --- [A] 감정 분류 모델 정의 ---
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



# --- [B] 문맥 분류 모델 정의 ---
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



# 부정행위 키워드
AFFAIR_PATTERN = r"(제3자|상간|상간녀|상간남|외도|불륜|부정행위|간통|내연|바람|상간자|불륜상대|유부남|유부녀)"

# 부정행위면 안 어울리는 토픽들
TOPIC_FORCE_NONE = ["양육비", "재산분할", "면접교섭권", "양육권"]

# def fix_situation(raw_situation, text, topic_raw=None):
#     text = str(text)

#     # 0) 부정행위 키워드가 확실히 있는 경우 → 무조건 부정행위
#     if re.search(AFFAIR_PATTERN, text):
#         return "부정행위"

#     # 1) 토픽 기반 방어 로직
#     #   - 양육비/재산분할/양육권/면접교섭권이면 웬만하면 상황=해당 없음
#     if topic_raw in TOPIC_FORCE_NONE:
#         return "해당 없음"

#     # 2) 부정행위로 예측되었는데, 텍스트에 부정행위 관련 단어가 하나도 없으면 → 해당 없음으로 다운
#     if raw_situation == "부정행위" and not re.search(AFFAIR_PATTERN, text):
#         return "해당 없음"

#     # 3) 폭력/학대 → 부당대우
#     if re.search(r"(폭행|폭력|상습폭행|가정폭력|욕설|모욕|언어폭력|정서적 폭력|협박|위협|구타|때렸|맞았|멱살|손찌검|고함)", text):
#         return "부당대우"

#     # 4) 경제적 사유
#     if re.search(r"(생활비|돈|수입|지출|빚|채무|카드값|대출|도박|경제적|가정경제|재산 은닉)", text):
#         return "경제적 사유"

#     # 5) 악의의 유기 (집 나감, 연락두절, 별거 등)
#     if re.search(r"(집[을 ]나가|집 나간지|연락두절|연락이 안 되|연락이 안되|집에 안 들어오|별거|가출|버리고 갔|떠났)", text):
#         return "악의의 유기"

#     # 6) 가족 간 갈등 (시댁/처가/부모/친정 등)
#     if re.search(r"(시댁|시어머니|시아버지|시부모|시누이|시가|처가|장모|장인|친정|부모님|부모 간섭|가족 문제|고부갈등|장서갈등)", text):
#         return "가족 간 갈등"

#     # 7) 성격 차이 / 불화
#     if re.search(r"(성격 차이|성격이 안 맞|성격이 안맞|성격이 달라|대화가 안 되|소통이 안 되|불화|맨날 싸우|자주 싸우|다툼|의견 차이|정이 식었|무관심|냉전|대화 단절)", text):
#         return "성격 차이/불화"

#     # 8) 사실혼
#     if re.search(r"(사실혼|사실상 부부|혼인신고 안 했|혼인신고 안했|혼인신고하지 않|동거남|동거녀|법적 혼인 아님)", text):
#         return "사실혼"

#     # 9) 혼인파탄 (섹스리스 포함)
#     if re.search(r"(혼인파탄|결혼생활이 깨졌|관계가 완전히 끝|재결합 불가|이혼 외에는 방법이 없|섹스리스|성관계가 없|부부관계가 없|잠자리를 안 하|부부관계 거부|성관계 거부)", text):
#         return "혼인파탄"

#     # 10) 유책배우자 (내가 외도/폭력 등 가해자)
#     if re.search(r"(제가|내가|본인).*(외도|불륜|폭행|폭력|잘못|유책|가해자|책임)", text):
#         return "유책배우자"

#     # 11) 협의이혼
#     if re.search(r"(협의이혼|합의이혼|서로 합의해서 이혼|서로 이혼하기로|좋게 이혼|원만하게 이혼|합의서)", text):
#         return "협의이혼"

#     # 12) 혼인취소
#     if re.search(r"(혼인취소|혼인 취소|혼인 무효|사기결혼|속아서 결혼|강제로 결혼|위장 결혼|혼인 파기)", text):
#         return "혼인취소"

#     # 13) 그 외에는 모델 예측 그대로
#     return raw_situation

def fix_situation(raw_situation, text, topic_raw=None):
    text = str(text)

    # 1. Regex 검사 (우선순위 최상)
    if re.search(AFFAIR_PATTERN, text): return "부정행위"
    
    # 1) 폭력/학대 -> 부당대우
    if re.search(r"(폭행|폭력|상습폭행|가정폭력|욕설|모욕|언어폭력|정서적 폭력|협박|위협|구타|때렸|때리|때려|맞았|맞아|손찌검|멱살|고함|던지|던졌)", text): 
        return "부당대우"

    # 2) 경제적 사유
    if re.search(r"(생활비|돈|수입|지출|빚|채무|카드값|대출|도박|경제적|가정경제|재산 은닉)", text):
        return "경제적 사유"

    # 3) 악의의 유기
    if re.search(r"(집[을 ]나가|집 나간지|연락두절|연락이 안 되|연락이 안되|집에 안 들어오|별거|가출|버리고 갔|떠났)", text):
        return "악의의 유기"

    # 4) 가족 간 갈등
    if re.search(r"(시댁|시어머니|시아버지|시부모|시누이|시가|처가|장모|장인|친정|부모님|부모 간섭|가족 문제|고부갈등|장서갈등)", text):
        return "가족 간 갈등"

    # 5) 성격 차이
    if re.search(r"(성격 차이|성격이 안 맞|성격이 안맞|성격이 달라|대화가 안 되|소통이 안 되|불화|맨날 싸우|자주 싸우|다툼|의견 차이|정이 식었|무관심|냉전|대화 단절)", text):
        return "성격 차이/불화"

    # 6) 사실혼
    if re.search(r"(사실혼|사실상 부부|혼인신고 안 했|혼인신고 안했|혼인신고하지 않|동거남|동거녀|법적 혼인 아님)", text):
        return "사실혼"

    # 7) 혼인파탄 (섹스리스 포함)
    if re.search(r"(혼인파탄|결혼생활이 깨졌|관계가 완전히 끝|재결합 불가|이혼 외에는 방법이 없|섹스리스|성관계가 없|부부관계가 없|잠자리를 안 하|부부관계 거부|성관계 거부)", text):
        return "혼인파탄"

    # 8) 유책배우자
    if re.search(r"(제가|내가|본인).*(외도|불륜|폭행|폭력|잘못|유책|가해자|책임)", text):
        return "유책배우자"

    # 9) 협의이혼
    if re.search(r"(협의이혼|합의이혼|서로 합의해서 이혼|서로 이혼하기로|좋게 이혼|원만하게 이혼|합의서)", text):
        return "협의이혼"

    # 10) 혼인취소
    if re.search(r"(혼인취소|혼인 취소|혼인 무효|사기결혼|속아서 결혼|강제로 결혼|위장 결혼|혼인 파기)", text):
        return "혼인취소"

    # Regex에서 아무것도 못 찾았는데, Topic이 '양육비'라면 -> 상황은 '해당 없음'일 확률이 높음
    if topic_raw in TOPIC_FORCE_NONE:
        return "해당 없음"

    return raw_situation


# INTENT 후처리 보정   
def fix_intent(raw_intent, text):
    text = str(text)

    # 1) 제3자/부정행위 → 제재·구제수단 / 증거·입증 / 법률·판례 쪽이 자연스러움
    if re.search(r"(제3자|상간|상간녀|상간남|부정행위|외도|불륜|간통|내연)", text):
        if raw_intent not in ["제재·구제수단", "증거·입증", "법률·판례"]:
            return "제재·구제수단"
        return raw_intent

    # 2) 기간·시효
    if re.search(r"(시효|소멸시효|기간|기한$|시한|언제부터|언제까지|몇년|몇 년|만료|시효 완성|시효 중단)", text):
        return "기간·시효"

    # 3) 금액·산정
    if re.search(r"(얼마|얼마나|액수|금액|산정|비율|퍼센트|몇 대 몇|몇대몇|계산|금전적 규모)", text):
        return "금액·산정"

    # 4) 절차·방법
    if re.search(r"(절차|방법|어떻게 하|어떻게 진행|어디에 신청|신청 방법|준비해야 할|어디서부터|순서|단계|접수하|제기하|진행되나요)", text):
        return "절차·방법"

    # 5) 증거·입증
    if re.search(r"(증거|입증|입증해야|어떻게 입증|무엇으로 증명|증명해야|카톡|카카오톡|녹음|영상|사진|자료|소명)", text):
        return "증거·입증"

    # 6) 법률·판례 / 법적 근거-
    if re.search(r"(민법 제\d+조|민법 제\s*\d+조|법조문|조문|법률상|판례|대법원 판결|법적 근거|근거 규정|규정하고 있)", text):
        return "법률·판례"

    # 7) 개념·범위·기준
    if re.search(r"(의미|정의|개념|범위|기준|요건|구성요건|어디까지 인정|어디까지 포함|판단 기준)", text):
        return "개념·범위·기준"

    # 8) 가능 여부 판단
    if re.search(r"(가능한가요|가능한지|할 수 있나요|될까요|되나요|인정되나요|청구할 수 있나요|책임이 있나요|성립하나요|성립되나요)", text):
        return "가능 여부 판단"

    # 9) 제재·구제수단 (처벌/청구/제재 관련)
    if re.search(r"(손해배상|위자료 청구|배상 청구|청구하고 싶|소송 제기|고소|고발|처벌|제재|제재를 가하|징계)", text):
        if raw_intent not in ["제재·구제수단", "증거·입증"]:
            return "제재·구제수단"

    return raw_intent


def load_single_model(path: str, num_classes: int):
    model = KoBERTClassifier(n_classes=num_classes).to(device)
    model.load_state_dict(torch.load(path, map_location=device))
    model.eval()
    return model


# 공통 예측함수
def predict_single(model,text, id2label, tokenizer):
    enc = tokenizer(text, return_tensors="pt", truncation=True,
                    padding="max_length", max_length=128)
    input_ids = enc["input_ids"].to(device)
    mask = enc["attention_mask"].to(device)

    with torch.no_grad():
        logits = model(input_ids, mask)
        probs = torch.softmax(logits, dim=1)[0].cpu().numpy()

    idx = int(probs.argmax())
    conf = float(probs[idx])

    key = str(idx) if str(idx) in id2label else idx

    return id2label[key], conf


def predict_full(text, models):
    tokenizer = models["tokenizer_KOBERT"]
    situ_model =  models['model_KOBERT_situation']
    intent_model =  models['model_KOBERT_intent']
    topic_model = models['model_KOBERT_topic']

    raw_situ, conf_situ   = predict_single(situ_model, text, id2situ, tokenizer)
    raw_int,  conf_int    = predict_single(intent_model, text, id2intent, tokenizer)
    raw_topic, conf_topic = predict_single(topic_model, text, id2topic, tokenizer)

    final_situ = fix_situation(raw_situ, text, raw_topic)
    final_intent = fix_intent(raw_int, text)

    return {
        "input": text,
        "its": {
            "situation": final_situ,
            "intent": final_intent,
            "topic": raw_topic,
        },
        "raw": {
            "situation": {"raw": raw_situ, "final": final_situ, "conf": conf_situ},
            "intent": {"raw": raw_int, "final": final_intent, "conf": conf_int},
            "topic": {"raw": raw_topic, "conf": conf_topic}
        }
    }


# --- [D] 질의응답 검색 모델 정의  ---
def search_qa_faiss(query, db, k=3):
    
    # [DEBUG] 검색 시작 로그
    print(f">>>>>>>>>> 질의응답 검색 시작 <<<<<<<<<<")
    print(f"🔍 [QA Search] 검색 시작: '{query}'")
    
    if db is None:
        print("⚠️ [QA Search] DB가 로드되지 않았습니다 (None).")
        return []

    try:
        # 1. FAISS 유사도 검색 수행
        # k=3: 상위 3개 검색
        results = db.similarity_search(query, k=k)
        print(f"🔍 [QA Search] 검색된 문서 개수: {len(results)}")
        
        processed_results = []
        
        for i, doc in enumerate(results):
            content = doc.page_content.strip()
            
            # [DEBUG] 검색된 원본 내용 살짝 출력
            # print(f"  - 문서 {i+1} 원본: {content[:30]}...")

            question, answer = "", ""
            
            # 2. 텍스트 분리 로직 강화 (질문과 답변 분리)
            if '?' in content:
                try:
                    parts = content.split('?', 1) # 첫 번째 물음표 기준으로 나눔
                    question = parts[0].strip() + '?'
                    answer = parts[1].strip()
                except Exception as e:
                    print(f"⚠️ [QA Search] 분리 중 오류: {e}")
                    question = "질문 분리 실패"
                    answer = content
            else:
                # 물음표가 없는 경우 통째로 답변으로 처리
                question = "(질문 형식 아님)"
                answer = content
            
            processed_results.append({
                "question": question,
                "answer": answer
            })
            
        return processed_results

    except Exception as e:
        print(f"❌ [QA Search] 치명적 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        # 에러가 나더라도 빈 리스트 대신 에러 메시지를 담아서 보냄 (디버깅용)
        return [{"question": "검색 오류", "answer": str(e)}]

# # --- [E/F] 판례/법률 검색 로직 (JSON 반환용으로 수정) ---
# def search_legal_csv(query, pred_i, pred_t, pred_s, models):
#     # [DEBUG] 1. 검색 시작 로그
#     print(f">>>>>>>>>> 판례/법률 검색 시작 <<<<<<<<<<")
#     print(f"🔍 [Legal Search] 진입 - Query: '{query}'")
#     print(f"🔍 [Legal Search] 분류 결과 - 의도: {pred_i}, 주제: {pred_t}, 상황: {pred_s}")

#     results = []
#     df_precedent = models.get('df_precedent_labeled')
#     df_law = models.get('df_law_content')

#     if df_precedent is None or df_precedent.empty or df_law is None or df_law.empty:
#         print("⚠️ [Legal Search] 데이터프레임 로드 실패")
#         return [{"type": "error", "content": "판례 또는 법률 DB가 로드되지 않았습니다."}]

#     # 2. 의도(Intent) 체크
#     if not pred_i or ("법률" not in pred_i and "판례" not in pred_i):
#         print(f"🚫 [Legal Search] 의도 불일치({pred_i}) -> 검색 건너뜀")
#         return [{"type": "skipped", "content": f"의도가 '{pred_i}'이므로 법률/판례 검색을 건너뜁니다."}]

#     # 3. 검색 키워드 수집
#     search_keywords = []
#     if pred_t and pred_t not in ['N/A', '해당 없음', '단순 이혼 질문']:
#         search_keywords.append(pred_t)
#     if pred_s and pred_s not in ['N/A', '해당 없음', 'N/A (전처리 결과 없음)']:
#         search_keywords.append(pred_s)

#     # 키워드 정규식 생성
#     search_regex_pattern = "|".join(search_keywords) if search_keywords else ""
#     print(f"🔍 [Legal Search] 최종 검색 키워드 패턴: '{search_regex_pattern}'")

#     # ---------------------------------------------------
#     # [Step A] 판례 검색 실행
#     # ---------------------------------------------------
#     if search_keywords:
#         mask = df_precedent['라벨'].str.contains(search_regex_pattern, na=False, regex=True)
#         matched_precedents = df_precedent[mask]
        
#         total_count = len(matched_precedents)
#         print(f"🔍 [Legal Search] 판례 검색 결과: 총 {total_count}건 발견")

#         if not matched_precedents.empty:
#             # [DEBUG] 상위 5개 제목 로그 출력
#             try:
#                 print(f"🔍 [DEBUG] 검색된 판례 목록(Top 5):\n{matched_precedents['판시사항'].head(5).to_string(index=False)}")
#             except: pass

#             # 상위 3개만 추출
#             top_n = matched_precedents.head(3)
            
#             for _, row in top_n.iterrows():
#                 ref_laws_details = []
#                 ref_law_str = row.get('참조법령_최종')
                
#                 # 참조 법령 상세 조회
#                 if pd.notna(ref_law_str):
#                     ref_law_list = re.split(r'[\n,]', str(ref_law_str))
#                     for law_key in ref_law_list:
#                         law_key = law_key.strip()
#                         if not law_key: continue

#                         law_detail = df_law[df_law['key'] == law_key]
#                         if not law_detail.empty:
#                             # [안전장치] 법령 데이터 NaN 처리
#                             l_title = law_detail.iloc[0].get('소제목')
#                             l_content = law_detail.iloc[0].get('content')
                            
#                             ref_laws_details.append({
#                                 "key": str(law_key),
#                                 "title": str(l_title) if pd.notna(l_title) else "",
#                                 "content": str(l_content) if pd.notna(l_content) else ""
#                             })

#                 # [안전장치] 판례 데이터 NaN 처리 (핵심 수정 부분)
#                 p_title = row.get('판시사항')
#                 p_summary = row.get('요약문장')

#                 results.append({
#                     "type": "precedent",
#                     "title": str(p_title) if pd.notna(p_title) else "제목 없음", # NaN이면 "제목 없음" 문자열로
#                     "summary": str(p_summary) if pd.notna(p_summary) else "내용 없음", # NaN이면 "내용 없음" 문자열로
#                     "references": ref_laws_details, 
#                     "matched_keywords": search_keywords
#                 })
#         else:
#             print("⚠️ [Legal Search] 키워드는 있으나 매칭된 판례 없음")

#     # ---------------------------------------------------
#     # [Step B] 법령 직접 검색 실행
#     # ---------------------------------------------------
    
#     # 1) 조항 번호 검색
#     jo_match = re.search(r'(\d+)\s*조', query)
#     if jo_match:
#         jo_num = jo_match.group(1)
#         search_key = f"제{jo_num}조"
#         print(f">>>>>>>>>> 법령 검색 시작 <<<<<<<<<<")
#         print(f"🔍 [Legal Search] 조항 번호 감지: {search_key}")
        
#         law_detail = df_law[df_law['key'].str.contains(search_key, na=False)]
#         if not law_detail.empty:
#             for _, row in law_detail.iterrows():
#                 # [안전장치]
#                 l_key = row.get('key')
#                 l_title = row.get('소제목')
#                 l_content = row.get('content')

#                 results.append({
#                     "type": "law",
#                     "key": str(l_key) if pd.notna(l_key) else "조항 없음",
#                     "title": str(l_title) if pd.notna(l_title) else "",
#                     "content": str(l_content) if pd.notna(l_content) else ""
#                 })

#     # 2) 키워드 법령 검색
#     elif search_keywords:
#         mask_law = df_law['content'].str.contains(search_regex_pattern, na=False, regex=True) | \
#                    df_law['소제목'].str.contains(search_regex_pattern, na=False, regex=True)
#         matched_laws = df_law[mask_law]
        
#         print(f"🔍 [Legal Search] 관련 법령 직접 검색 결과: 총 {len(matched_laws)}건 발견")
        
#         if not matched_laws.empty:
#              # [DEBUG] 검색된 법령 목록 로그
#              try:
#                  print(f"🔍 [DEBUG] 검색된 법령 목록(Top 5):\n{matched_laws['소제목'].head(5).to_string(index=False)}")
#              except: pass

#              # 검색된 모든 법령 반환
#              for _, row in matched_laws.iterrows():
#                 # [안전장치]
#                 l_key = row.get('key')
#                 l_title = row.get('소제목')
#                 l_content = row.get('content')
                
#                 results.append({
#                     "type": "law",
#                     "key": str(l_key) if pd.notna(l_key) else "조항 없음",
#                     "title": str(l_title) if pd.notna(l_title) else "",
#                     "content": str(l_content) if pd.notna(l_content) else ""
#                 })

#     # 결과가 하나도 없으면
#     if not results:
#         print("⚠️ [Legal Search] 최종 결과 없음")
#         results.append({"type": "law_miss", "content": "관련된 판례나 법령을 찾지 못했습니다."})
            
#     return results

# [E/F] 판례/법률 검색 (로직 검증 완료)
# def search_legal_csv(query, pred_i, pred_t, pred_s, models):
#     print(f">>>>>>>>>> 판례/법률 검색 시작 <<<<<<<<<<")
#     print(f"🔍 [Legal Search] 분류 결과 - 의도:{pred_i}, 주제:{pred_t}, 상황:{pred_s}")
#     results = []
#     df_precedent = models.get('df_precedent_labeled')
#     df_law = models.get('df_law_content')
    
#     if df_precedent is None or df_precedent.empty: return []

#     # [검색 로직 구성]
#     search_keywords = []
    
#     # 1. 주제 키워드 추가
#     if pred_t and pred_t not in ['N/A', '해당 없음', '단순 이혼 질문']:
#         search_keywords.append(pred_t)
    
#     # 2. 상황 키워드 추가 (상황이 존재하면 반드시 검색어에 포함됨)
#     if pred_s and pred_s not in ['N/A', '해당 없음', 'N/A (전처리 결과 없음)']:
#         search_keywords.append(pred_s)
    
#     # 3. OR 연산으로 검색 (Recall 확보 후 Rerank로 정렬)
#     # 예: "재산분할|부당대우" -> 둘 중 하나라도 있는 것을 다 가져옴
#     search_regex_pattern = "|".join([re.escape(k) for k in search_keywords]) if search_keywords else ""
#     print(f"🔍 [Legal Search] 최종 검색 키워드 패턴: '{search_regex_pattern}'")

#     if search_keywords:
#         mask = df_precedent['라벨'].str.contains(search_regex_pattern, na=False, regex=True)
#         matched = df_precedent[mask]
#         print(f"🔍 [Legal Search] 1차 매칭 판례 수: {len(matched)}")

#         # 상위 20개 정도만 가져와서 Rerank에 넘김 (너무 많으면 느려짐)
#         for _, row in matched.head(20).iterrows():
#             ref_laws = []
#             if pd.notna(row.get('참조법령_최종')):
#                 for key in re.split(r'[\n,]', str(row['참조법령_최종'])):
#                     k = key.strip()
#                     if not k: continue
#                     ld = df_law[df_law['key'] == k]
#                     if not ld.empty:
#                         ref_laws.append({"key": k, "title": str(ld.iloc[0]['소제목']), "content": str(ld.iloc[0]['content'])})
#             results.append({
#                 "type": "precedent", 
#                 "title": str(row.get('판시사항', '제목 없음')), 
#                 "summary": str(row.get('요약문장', '내용 없음')),
#                 "references": ref_laws, 
#                 "label_in_csv": str(row.get('라벨', ''))
#             })

#     # 법률 직접 검색
#     jo_match = re.search(r'(\d+)\s*조', query)
#     if jo_match:
#         key = f"제{jo_match.group(1)}조"
#         matched_laws = df_law[df_law['key'].str.contains(key, na=False)]
#     elif search_keywords:
#         matched_laws = df_law[df_law['content'].str.contains(search_regex_pattern, na=False, regex=True)].head(5)
#     else:
#         matched_laws = pd.DataFrame()

#     for _, row in matched_laws.iterrows():
#         results.append({
#             "type": "law", 
#             "key": row.get('key'), 
#             "title": row.get('소제목'), 
#             "content": row.get('content')
#         })

#     if not results: results.append({"type": "law_miss", "content": "결과 없음"})
#     return results

# [E/F] 판례/법률 검색 (로직 수정됨: 상황 존재 시 AND 검색)
# def search_legal_csv(query, pred_i, pred_t, pred_s, models):
#     print(f">>>>>>>>>> 판례/법률 검색 시작 <<<<<<<<<<")
#     print(f"🔍 [Legal Search] 분류 결과 - 의도:{pred_i}, 주제:{pred_t}, 상황:{pred_s}")
#     results = []
#     df_precedent = models.get('df_precedent_labeled')
#     df_law = models.get('df_law_content')
    
#     if df_precedent is None or df_precedent.empty: return []

#     # 1. 키워드 유효성 체크
#     is_valid_situ = pred_s and pred_s not in ['N/A', '해당 없음', 'N/A (전처리 결과 없음)']
#     is_valid_topic = pred_t and pred_t not in ['N/A', '해당 없음', '단순 이혼 질문']

#     mask = None

#     # [핵심 변경] 검색 로직 분기
#     if is_valid_situ and is_valid_topic:
#         # 1) 상황 O, 주제 O -> [AND 검색] (둘 다 포함된 것만)
#         print(f"🔍 [Legal Search] 모드: 상황('{pred_s}') AND 주제('{pred_t}') 교집합 검색")
#         mask = df_precedent['라벨'].str.contains(re.escape(pred_s), na=False) & \
#                df_precedent['라벨'].str.contains(re.escape(pred_t), na=False)
        
#     elif is_valid_situ:
#         # 2) 상황 O, 주제 X -> [상황] 검색
#         print(f"🔍 [Legal Search] 모드: 상황('{pred_s}') 단독 검색")
#         mask = df_precedent['라벨'].str.contains(re.escape(pred_s), na=False)
        
#     elif is_valid_topic:
#         # 3) 상황 X, 주제 O -> [주제] 검색
#         print(f"🔍 [Legal Search] 모드: 주제('{pred_t}') 단독 검색")
#         mask = df_precedent['라벨'].str.contains(re.escape(pred_t), na=False)
        
#     else:
#         print("🔍 [Legal Search] 유효한 검색 키워드가 없음")

#     # 판례 검색 실행
#     if mask is not None:
#         matched = df_precedent[mask]
#         print(f"🔍 [Legal Search] 매칭된 판례 수: {len(matched)}")
        
#         # 결과가 너무 적으면(0개), 사용자를 위해 OR 검색으로 자동 전환 (선택 사항)
#         # 만약 엄격한 AND만 원하시면 아래 'if len(matched) == 0' 블록을 주석 처리하세요.
#         if len(matched) == 0 and is_valid_situ and is_valid_topic:
#             print("⚠️ AND 검색 결과가 0건이라 OR 검색으로 전환하여 재시도합니다.")
#             regex_or = f"{re.escape(pred_s)}|{re.escape(pred_t)}"
#             mask_or = df_precedent['라벨'].str.contains(regex_or, na=False, regex=True)
#             matched = df_precedent[mask_or]
#             print(f"🔍 [Legal Search] OR 재검색 매칭 수: {len(matched)}")

#         # 상위 20개 추출 후 처리
#         for _, row in matched.head(20).iterrows():
#             ref_laws = []
#             if pd.notna(row.get('참조법령_최종')):
#                 for key in re.split(r'[\n,]', str(row['참조법령_최종'])):
#                     k = key.strip()
#                     if not k: continue
#                     ld = df_law[df_law['key'] == k]
#                     if not ld.empty:
#                         ref_laws.append({"key": k, "title": str(ld.iloc[0]['소제목']), "content": str(ld.iloc[0]['content'])})
#             results.append({
#                 "type": "precedent", 
#                 "title": str(row.get('판시사항', '제목 없음')), 
#                 "summary": str(row.get('요약문장', '내용 없음')),
#                 "references": ref_laws, 
#                 "label_in_csv": str(row.get('라벨', ''))
#             })

#     # 법률 직접 검색 (기존 로직 유지)
#     jo_match = re.search(r'(\d+)\s*조', query)
#     if jo_match:
#         key = f"제{jo_match.group(1)}조"
#         matched_laws = df_law[df_law['key'].str.contains(key, na=False)]
#     elif is_valid_topic: # 법률은 주제 위주로 검색
#         matched_laws = df_law[df_law['content'].str.contains(re.escape(pred_t), na=False)].head(5)
#     else:
#         matched_laws = pd.DataFrame()

#     for _, row in matched_laws.iterrows():
#         results.append({
#             "type": "law", 
#             "key": row.get('key'), 
#             "title": row.get('소제목'), 
#             "content": row.get('content')
#         })

#     if not results: results.append({"type": "law_miss", "content": "결과 없음"})
#     return results

# [E/F] 판례/법률 검색
def search_legal_csv(query, pred_i, pred_t, pred_s, models):
    print(f">>>>>>>>>> 판례/법률 검색 시작 <<<<<<<<<<")
    print(f"🔍 [Legal Search] 분류 결과 - 의도:{pred_i}, 주제:{pred_t}, 상황:{pred_s}")
    results = []
    df_precedent = models.get('df_precedent_labeled')
    df_law = models.get('df_law_content')
    
    if df_precedent is None or df_precedent.empty: return []

    is_valid_situ = pred_s and pred_s not in ['N/A', '해당 없음', 'N/A (전처리 결과 없음)']
    is_valid_topic = pred_t and pred_t not in ['N/A', '해당 없음', '단순 이혼 질문']

    mask = None
    if is_valid_situ and is_valid_topic:
        print(f"🔍 [Legal Search] 모드: 상황('{pred_s}') AND 주제('{pred_t}') 교집합 검색")
        mask = df_precedent['라벨'].str.contains(re.escape(pred_s), na=False) & \
               df_precedent['라벨'].str.contains(re.escape(pred_t), na=False)
    elif is_valid_situ:
        print(f"🔍 [Legal Search] 모드: 상황('{pred_s}') 단독 검색")
        mask = df_precedent['라벨'].str.contains(re.escape(pred_s), na=False)
    elif is_valid_topic:
        print(f"🔍 [Legal Search] 모드: 주제('{pred_t}') 단독 검색")
        mask = df_precedent['라벨'].str.contains(re.escape(pred_t), na=False)
    else:
        print("🔍 [Legal Search] 유효한 검색 키워드가 없음")

    if mask is not None:
        matched = df_precedent[mask]
        print(f"🔍 [Legal Search] 매칭된 판례 수: {len(matched)}")
        
        if len(matched) == 0 and is_valid_situ and is_valid_topic:
            print("⚠️ AND 검색 결과가 0건이라 OR 검색으로 전환하여 재시도합니다.")
            regex_or = f"{re.escape(pred_s)}|{re.escape(pred_t)}"
            mask_or = df_precedent['라벨'].str.contains(regex_or, na=False, regex=True)
            matched = df_precedent[mask_or]
            print(f"🔍 [Legal Search] OR 재검색 매칭 수: {len(matched)}")

        for _, row in matched.head(20).iterrows():
            ref_laws = []
            if pd.notna(row.get('참조법령_최종')):
                for key in re.split(r'[\n,]', str(row['참조법령_최종'])):
                    k = key.strip()
                    if not k: continue
                    ld = df_law[df_law['key'] == k]
                    if not ld.empty:
                        ref_laws.append({"key": k, "title": str(ld.iloc[0]['소제목']), "content": str(ld.iloc[0]['content'])})
            results.append({
                "type": "precedent", 
                "title": str(row.get('판시사항', '제목 없음')), 
                "summary": str(row.get('요약문장', '내용 없음')),
                "references": ref_laws, 
                "label_in_csv": str(row.get('라벨', ''))
            })

    # [수정] 법률 검색 - 판례 참조 법령과 별개로 키워드 검색 수행
    matched_laws = pd.DataFrame()
    jo_match = re.search(r'(\d+)\s*조', query)
    
    if jo_match:
        key = f"제{jo_match.group(1)}조"
        matched_laws = df_law[df_law['key'].str.contains(key, na=False)]
    elif is_valid_topic:
        matched_laws = df_law[df_law['content'].str.contains(re.escape(pred_t), na=False)].head(5)

    for _, row in matched_laws.iterrows():
        results.append({
            "type": "law", 
            "key": row.get('key'), 
            "title": row.get('소제목'), 
            "content": row.get('content')
        })

    if not results: results.append({"type": "law_miss", "content": "결과 없음"})
    return results


# --- 모델 로딩 래퍼 (STT 모델 로더 제거) ---
print("--- 모델 로딩 시작 ---")
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

    # 새 KOBERT 의도/주제/상황 
    try:
        print(" KOBERT 업데이트 의도/주제/상황 모델 로딩 중...")
        models['tokenizer_KOBERT'] = AutoTokenizer.from_pretrained(MODEL_NAME_B, trust_remote_code=True)

        num_situ = len(id2situ)
        num_intent = len(id2intent)
        num_topic = len(id2topic)

        models['model_KOBERT_situation'] = load_single_model(SITUATION_MODEL_PATH, num_situ)
        models['model_KOBERT_intent'] = load_single_model(INTENT_MODEL_PATH, num_intent)
        models['model_KOBERT_topic'] = load_single_model(TOPIC_MODEL_PATH, num_topic)
        print("  [KOBERT 업데이트 된 의도/주제/상황 모델] 로딩 완료.")
    except Exception as e:
        print(f"  [KOBERT 업데이트 된 의도/주제/상황 모델] 로딩 실패: {e}")
        models['model_KOBERT_situation'] = None
        models['model_KOBERT_intent'] = None
        models['model_KOBERT_topic'] = None


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



def load_simple_models():
    models = {}
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

    # 새 KOBERT 의도/주제/상황 
    try:
        print(" KOBERT 업데이트 의도/주제/상황 모델 로딩 중...")
        models['tokenizer_KOBERT'] = AutoTokenizer.from_pretrained(MODEL_NAME_B, trust_remote_code=True)

        num_situ = len(id2situ)
        num_intent = len(id2intent)
        num_topic = len(id2topic)

        models['model_KOBERT_situation'] = load_single_model(SITUATION_MODEL_PATH, num_situ)
        models['model_KOBERT_intent'] = load_single_model(INTENT_MODEL_PATH, num_intent)
        models['model_KOBERT_topic'] = load_single_model(TOPIC_MODEL_PATH, num_topic)
        print("  [KOBERT 업데이트 된 의도/주제/상황 모델] 로딩 완료.")
    except Exception as e:
        print(f"  [KOBERT 업데이트 된 의도/주제/상황 모델] 로딩 실패: {e}")
        models['model_KOBERT_situation'] = None
        models['model_KOBERT_intent'] = None
        models['model_KOBERT_topic'] = None

    
    print("--- 8. 모든 모델 로딩 완료 ---")
    return models

