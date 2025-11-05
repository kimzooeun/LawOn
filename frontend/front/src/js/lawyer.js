// ===================================
// 7. 변호사 페이지
// ===================================

// ===== 1) 데이터 스키마 =====
const DATA = [
  {
    region: "서울·수도권",
    items: [
      {
        type: "law",
        name: "예시 법무법인 1",
        tags: ["가사", "이혼", "상속"],
        phone: "02-000-0001",
        address: "서울 서초구 서초대로 000",
        url: "http://127.0.0.1:3000/frontend/front/lawyer.html",
        note: "가사/이혼 전문 상담 운영",
      },
      {
        type: "law",
        name: "예시 로펌 2",
        tags: ["가사", "재산분할"],
        phone: "02-000-0002",
        address: "서울 강남구 테헤란로 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "재산분할/친권 분쟁 경험",
      },
      {
        type: "law",
        name: "예시 로펌 3",
        tags: ["상속", "유류분"],
        phone: "02-000-0003",
        address: "서울 종로구 종로 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "상속/유류분 소송 다수",
      },
      {
        type: "law",
        name: "예시 법률사무소 4",
        tags: ["가사", "친권·양육"],
        phone: "031-000-0004",
        address: "경기 성남시 분당구 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "양육·면접교섭 합의 지원",
      },
      {
        type: "law",
        name: "예시 로펌 5",
        tags: ["국제이혼", "재판상이혼"],
        phone: "031-000-0005",
        address: "경기 수원시 영통구 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "국제사건·국제사법 경험",
      },
      {
        type: "law",
        name: "예시 심리상담센터 A",
        tags: ["부부", "가족", "개인"],
        phone: "02-111-1111",
        address: "서울 중구 세종대로 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "부부·가족상담 프로그램",
      },
      {
        type: "law",
        name: "예시 상담센터 B",
        tags: ["이혼후 회복", "애도"],
        phone: "02-111-1112",
        address: "서울 용산구 한강대로 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "이별/이혼 회복 그룹",
      },
      {
        type: "law",
        name: "예시 상담센터 C",
        tags: ["청소년", "정서"],
        phone: "02-111-1113",
        address: "경기 고양시 일산서구 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "청소년 정서/행동",
      },
      {
        type: "law",
        name: "예시 상담센터 D",
        tags: ["불안", "우울"],
        phone: "031-111-1114",
        address: "경기 의정부시 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "성인 불안/우울",
      },
      {
        type: "law",
        name: "예시 상담센터 E",
        tags: ["트라우마", "PTSD"],
        phone: "031-111-1115",
        address: "인천 미추홀구 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "트라우마 전문",
      },
    ],
  },
  {
    region: "부산·영남권",
    items: [
      {
        type: "law",
        name: "예시 로펌 부산 1",
        tags: ["가사", "이혼"],
        phone: "051-000-0001",
        address: "부산 연제구 법원로 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "가사 사건 대응",
      },
      {
        type: "law",
        name: "예시 로펌 부산 2",
        tags: ["재산분할", "위자료"],
        phone: "051-000-0002",
        address: "부산 해운대구 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "재산분할/위자료",
      },
      {
        type: "law",
        name: "예시 로펌 대구 3",
        tags: ["친권", "면접교섭"],
        phone: "053-000-0003",
        address: "대구 수성구 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "친권·양육",
      },
      {
        type: "law",
        name: "예시 법률사무소 4",
        tags: ["상속", "유류분"],
        phone: "055-000-0004",
        address: "경남 창원시 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "상속 분쟁",
      },
      {
        type: "law",
        name: "예시 로펌 5",
        tags: ["국제이혼"],
        phone: "054-000-0005",
        address: "경북 포항시 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "국제/해외 거주",
      },
      {
        type: "law",
        name: "예시 상담센터 F",
        tags: ["부부", "가족"],
        phone: "051-111-1111",
        address: "부산 수영구 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "부부상담",
      },
      {
        type: "law",
        name: "예시 상담센터 G",
        tags: ["개인", "우울"],
        phone: "051-111-1112",
        address: "부산 남구 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "개인상담",
      },
      {
        type: "law",
        name: "예시 상담센터 H",
        tags: ["청소년", "학부모"],
        phone: "053-111-1113",
        address: "대구 중구 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "청소년/부모 교육",
      },
      {
        type: "law",
        name: "예시 상담센터 I",
        tags: ["불안", "공황"],
        phone: "055-111-1114",
        address: "경남 김해시 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "불안/공황",
      },
      {
        type: "law",
        name: "예시 상담센터 J",
        tags: ["트라우마"],
        phone: "054-111-1115",
        address: "경북 구미시 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "트라우마",
      },
    ],
  },
  {
    region: "대전·충청권",
    items: [
      {
        type: "law",
        name: "예시 로펌 대전 1",
        tags: ["가사", "이혼"],
        phone: "042-000-0001",
        address: "대전 서구 둔산로 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "가사 사건",
      },
      {
        type: "law",
        name: "예시 로펌 대전 2",
        tags: ["재산분할"],
        phone: "042-000-0002",
        address: "대전 유성구 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "재산분할",
      },
      {
        type: "law",
        name: "예시 법률사무소 3",
        tags: ["친권", "양육"],
        phone: "043-000-0003",
        address: "충북 청주시 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "친권·양육",
      },
      {
        type: "law",
        name: "예시 로펌 4",
        tags: ["상속"],
        phone: "041-000-0004",
        address: "충남 천안시 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "상속",
      },
      {
        type: "law",
        name: "예시 로펌 5",
        tags: ["국제사건"],
        phone: "044-000-0005",
        address: "세종특별자치시 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "국제·국내 연계",
      },
      {
        type: "law",
        name: "예시 상담센터 K",
        tags: ["가족", "부부"],
        phone: "042-111-1111",
        address: "대전 중구 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "가족/부부상담",
      },
      {
        type: "law",
        name: "예시 상담센터 L",
        tags: ["우울", "스트레스"],
        phone: "043-111-1112",
        address: "청주 상당구 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "성인상담",
      },
      {
        type: "law",
        name: "예시 상담센터 M",
        tags: ["청소년"],
        phone: "041-111-1113",
        address: "아산시 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "청소년",
      },
      {
        type: "law",
        name: "예시 상담센터 N",
        tags: ["불안", "공황"],
        phone: "041-111-1114",
        address: "천안시 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "불안/공황",
      },
      {
        type: "law",
        name: "예시 상담센터 O",
        tags: ["트라우마"],
        phone: "044-111-1115",
        address: "세종 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "트라우마",
      },
    ],
  },
  {
    region: "광주·전라·제주권",
    items: [
      {
        type: "law",
        name: "예시 로펌 광주 1",
        tags: ["가사", "이혼"],
        phone: "062-000-0001",
        address: "광주 동구 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "가사 사건",
      },
      {
        type: "law",
        name: "예시 로펌 전주 2",
        tags: ["재산분할"],
        phone: "063-000-0002",
        address: "전북 전주시 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "재산분할",
      },
      {
        type: "law",
        name: "예시 로펌 순천 3",
        tags: ["친권", "양육"],
        phone: "061-000-0003",
        address: "전남 순천시 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "친권·양육",
      },
      {
        type: "law",
        name: "예시 로펌 제주 4",
        tags: ["국제이혼"],
        phone: "064-000-0004",
        address: "제주 제주시 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "국제이혼",
      },
      {
        type: "law",
        name: "예시 법률사무소 5",
        tags: ["상속"],
        phone: "064-000-0005",
        address: "제주 서귀포시 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "상속",
      },
      {
        type: "law",
        name: "예시 상담센터 P",
        tags: ["부부", "가족"],
        phone: "062-111-1111",
        address: "광주 북구 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "부부/가족",
      },
      {
        type: "law",
        name: "예시 상담센터 Q",
        tags: ["우울", "불안"],
        phone: "061-111-1112",
        address: "전남 목포시 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "성인상담",
      },
      {
        type: "law",
        name: "예시 상담센터 R",
        tags: ["청소년"],
        phone: "063-111-1113",
        address: "전북 군산시 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "청소년",
      },
      {
        type: "law",
        name: "예시 상담센터 S",
        tags: ["트라우마"],
        phone: "064-111-1114",
        address: "제주 제주시 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "트라우마",
      },
      {
        type: "law",
        name: "예시 상담센터 T",
        tags: ["애도", "이별"],
        phone: "064-111-1115",
        address: "제주 서귀포시 000",
        url: "http://127.0.0.1:5500/frontend/front/lawyer.html",
        note: "상실/애도",
      },
    ],
  },
];

// ===== 2) 렌더링 =====
const lawyerState = {
  query: "",
  region: "ALL",
};

function makeTag(text) {
  const s = document.createElement("span");
  s.className = "tag";
  s.textContent = text;
  return s;
}

function card(item) {
  const cardTpl = document.getElementById("card-tpl");
  if (!cardTpl) {
    console.error("card-tpl 템플릿이 없습니다.");
    return document.createElement("div");
  }

  const $ = cardTpl.content.firstElementChild.cloneNode(true);
  const icon = $.querySelector(".card__icon");
  const title = $.querySelector(".card__title");
  const meta = $.querySelector(".card__meta");
  const desc = $.querySelector(".desc");
  const actions = $.querySelector(".actions");

  icon.classList.add("law");
  icon.textContent = "법";

  title.textContent = item.name;
  meta.innerHTML = "";
  meta.appendChild(makeTag("변호사 사무실"));
  if (item.phone) {
    meta.appendChild(makeTag(item.phone));
  }
  if (item.address) {
    meta.appendChild(makeTag(item.address));
  }
  if (Array.isArray(item.tags))
    item.tags.forEach((t) => meta.appendChild(makeTag("#" + t)));

  desc.textContent = item.note || "";

  // actions
  const aSite = document.createElement("a");
  aSite.className = "btn small line";
  aSite.href = item.url || "#";
  aSite.target = "_blank";
  aSite.rel = "noopener";
  aSite.textContent = "사이트";

  const aCall = document.createElement("a");
  aCall.className = "btn small line";
  aCall.href = item.phone ? `tel:${item.phone.replaceAll(/[^0-9]/g, "")}` : "#";
  aCall.textContent = "전화";

  const aMap = document.createElement("a");
  aMap.className = "btn small line";
  aMap.target = "_blank";
  aMap.rel = "noopener";
  aMap.href = item.address
    ? `https://map.naver.com/p/search/${encodeURIComponent(item.address)}`
    : "#";
  aMap.textContent = "길찾기";

  const aCopy = document.createElement("button");
  aCopy.className = "btn small";
  aCopy.textContent = "주소복사";
  aCopy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(item.address || "");
      aCopy.textContent = "복사됨!";
      setTimeout(() => (aCopy.textContent = "주소복사"), 1200);
    } catch (e) {
      console.error("클립보드 복사 실패:", e);
      if (typeof showToast === "function") {
        showToast("클립보드 복사 실패", "error");
      }
    }
  });

  actions.append(aSite, aCall, aMap, aCopy);
  return $;
}

function render() {
  const app = document.getElementById("app");
  const sectionTpl = document.getElementById("section-tpl");

  if (!app || !sectionTpl) {
    console.error("app 또는 section-tpl 템플릿을 찾을 수 없습니다.");
    return;
  }

  app.innerHTML = "";

  const regions =
    lawyerState.region === "ALL"
      ? DATA
      : DATA.filter((r) => r.region === lawyerState.region);

  regions.forEach((block) => {
    const sec = sectionTpl.content.firstElementChild.cloneNode(true);
    sec.querySelector("h2").textContent = block.region;

    const grid = sec.querySelector("[data-grid]");
    const list = block.items.filter((it) => {
      const q = lawyerState.query.trim().toLowerCase();
      const hay = [it.name, it.address, (it.tags || []).join(","), it.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchQ = !q || hay.includes(q);

      return matchQ;
    });

    sec.querySelector(".count").textContent = `${list.length}개 표시`;

    if (list.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "조건에 맞는 결과가 없습니다.";
      grid.replaceWith(empty);
    } else {
      list.forEach((it) => grid.appendChild(card(it)));
    }

    app.appendChild(sec);
  });
}

// ===== 3) CSV 내보내기 =====
function toCSV(rows) {
  const header = ["region", "name", "phone", "address", "url", "note"];
  const lines = [header.join(",")];
  rows.forEach((r) => {
    const vals = header.map((k) => {
      const v = Array.isArray(r[k]) ? r[k].join("|") : r[k] ?? "";
      return '"' + String(v).replaceAll('"', '""') + '"';
    });
    lines.push(vals.join(","));
  });
  return lines.join("\n");
}
function exportCSV() {
  const all = [];
  const regions =
    lawyerState.region === "ALL"
      ? DATA
      : DATA.filter((r) => r.region === lawyerState.region);

  regions.forEach((r) => {
    r.items.forEach((it) => {
      const q = lawyerState.query.trim().toLowerCase();
      const hay = [it.name, it.address, (it.tags || []).join(","), it.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const okQ = !q || hay.includes(q);

      if (okQ) {
        all.push({ region: r.region, ...it });
      }
    });
  });
  const blob = new Blob(["\uFEFF" + toCSV(all)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "directory_export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ===== 4) 이벤트 바인딩 (초기화 함수) =====
function initLawyerPageListeners() {
  document.getElementById("q")?.addEventListener("input", (e) => {
    lawyerState.query = e.target.value;
    render();
  });

  document.getElementById("type")?.addEventListener("change", (e) => {
    lawyerState.region = e.target.value;
    render();
  });

  document.getElementById("resetBtn")?.addEventListener("click", () => {
    lawyerState.query = "";
    lawyerState.region = "ALL";
    document.getElementById("q").value = "";
    document.getElementById("type").value = "ALL";
    render();
  });

  document.getElementById("exportBtn")?.addEventListener("click", exportCSV);
}
