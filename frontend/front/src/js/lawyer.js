import { showToast } from "./utils.js";

// 상태 관리
const lawyerState = {
  query: "",
  region: "ALL",
  data: [] // 서버에서 받아온 데이터를 여기에 저장합니다.
};

// 지역 분류 헬퍼 함수
function classifyRegion(address) {
  if (!address) return "기타";
  const addr = address.trim();
  if (addr.startsWith("서울") || addr.startsWith("경기") || addr.startsWith("인천")) return "서울·수도권";
  if (addr.startsWith("부산") || addr.startsWith("대구") || addr.startsWith("울산") || addr.startsWith("경남") || addr.startsWith("경북")) return "부산·영남권";
  if (addr.startsWith("대전") || addr.startsWith("세종") || addr.startsWith("충남") || addr.startsWith("충북")) return "대전·충청권";
  if (addr.startsWith("광주") || addr.startsWith("전남") || addr.startsWith("전북") || addr.startsWith("제주")) return "광주·전라·제주권";
  return "기타";
}

// DB 데이터를 프론트엔드 형식으로 변환 및 그룹화
function processLawyerData(dbList) {
  const grouped = {
    "서울·수도권": [],
    "부산·영남권": [],
    "대전·충청권": [],
    "광주·전라·제주권": [],
    "기타": []
  };

  dbList.forEach(item => {
    // DB 컬럼 -> 프론트엔드 객체 매핑
    const lawyer = {
      id: item.id,
      name: item.name, // 변호사 이름
      officeName: item.office, // 소속 (법무법인 등)
      tags: item.detail_specialty ? [item.detail_specialty] : [], // 전문분야를 태그로 변환
      phone: item.contact, // 연락처
      address: item.office_location, // 주소
      url: item.image_url || "#", 
      note: item.description // 설명
    };

    const region = classifyRegion(lawyer.address);
    if (grouped[region]) {
      grouped[region].push(lawyer);
    } else {
      grouped["기타"].push(lawyer);
    }
  });

  // DATA 배열 형식으로 변환
  return Object.keys(grouped)
    .filter(key => grouped[key].length > 0)
    .map(key => ({
      region: key,
      items: grouped[key]
    }));
}

// 서버에서 변호사 목록 가져오기
async function fetchLawyers() {
  try {
    const response = await fetch("/api/lawyers");
    if (!response.ok) throw new Error("데이터 불러오기 실패");

    const dbList = await response.json();
    lawyerState.data = processLawyerData(dbList); // 데이터 가공 후 상태 저장
    render(); // 화면 그리기
  } catch (error) {
    console.error("변호사 목록 로딩 에러:", error);
    showToast("변호사 정보를 불러오지 못했습니다.", "error");
  }
}

function makeTag(text) {
  const s = document.createElement("span");
  s.className = "tag";
  s.textContent = text;
  return s;
}

// ★ 카드 생성 함수 (여기가 수정됨) ★
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

  title.textContent = `${item.name} (${item.officeName || '변호사'})`;
  
  meta.innerHTML = "";
  if (item.officeName) meta.appendChild(makeTag(item.officeName));
  if (item.phone) meta.appendChild(makeTag(item.phone));
  if (item.address) meta.appendChild(makeTag(item.address));
  if (Array.isArray(item.tags))
    item.tags.forEach((t) => meta.appendChild(makeTag("#" + t)));

  desc.textContent = item.note || "";

  // actions 버튼들
  const aSite = document.createElement("a");
  aSite.className = "btn small line";

  // ▼ [수정 부분] 사이트 버튼 링크 생성 로직 ▼
  const targetHtml = "lawfirm_view.html"; // 이동할 HTML 파일명 확인하세요!
  
  // 데이터 인코딩 (URL에 특수문자나 한글이 들어갈 때 깨지지 않도록 함)
  const officeParam = encodeURIComponent(item.officeName || "법률사무소");
  const phoneParam = encodeURIComponent(item.phone || "");

  // DB에 유효한 URL이 있으면 그걸 쓰고, 없으면 우리가 만든 상세페이지로 데이터와 함께 이동
  if (item.url && item.url !== 'NULL' && item.url.startsWith('http')) {
      aSite.href = item.url;
  } else {
      // 예: lawfirm_view.html?office=김앤장&phone=010-1234-5678
      aSite.href = `${targetHtml}?office=${officeParam}&phone=${phoneParam}`;
  }
  
  aSite.target = "_blank";
  aSite.rel = "noopener";
  aSite.textContent = "사이트";
  // ▲ [수정 끝] ▲

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

export function render() {
  const app = document.getElementById("app");
  const sectionTpl = document.getElementById("section-tpl");

  if (!app || !sectionTpl) return;

  app.innerHTML = "";

  const regions =
    lawyerState.region === "ALL"
      ? lawyerState.data
      : lawyerState.data.filter((r) => r.region === lawyerState.region);

  regions.forEach((block) => {
    const sec = sectionTpl.content.firstElementChild.cloneNode(true);
    sec.querySelector("h2").textContent = block.region;

    const grid = sec.querySelector("[data-grid]");
    
    const list = block.items.filter((it) => {
      const q = lawyerState.query.trim().toLowerCase();
      const hay = [it.name, it.officeName, it.address, (it.tags || []).join(","), it.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return !q || hay.includes(q);
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
    
    if(list.length > 0 || lawyerState.query === "") {
        app.appendChild(sec);
    }
  });
}

// CSV 내보내기 로직
function toCSV(rows) {
  const header = ["region", "name", "office", "phone", "address", "note"];
  const lines = [header.join(",")];
  rows.forEach((r) => {
    const vals = header.map((k) => {
        let val = r[k];
        if (k === 'office') val = r.officeName; 
        const v = Array.isArray(val) ? val.join("|") : val ?? "";
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
      ? lawyerState.data
      : lawyerState.data.filter((r) => r.region === lawyerState.region);

  regions.forEach((r) => {
    r.items.forEach((it) => {
      const q = lawyerState.query.trim().toLowerCase();
      const hay = [it.name, it.officeName, it.address, (it.tags || []).join(","), it.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!q || hay.includes(q)) {
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
  a.download = "lawyers_list.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// 초기화 함수
export function initLawyerPageListeners() {
  fetchLawyers(); // 데이터 로드

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
    const qEl = document.getElementById("q");
    const tEl = document.getElementById("type");
    if(qEl) qEl.value = "";
    if(tEl) tEl.value = "ALL";
    render();
  });

  document.getElementById("exportBtn")?.addEventListener("click", exportCSV);
}