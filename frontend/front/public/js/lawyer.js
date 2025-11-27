import { showToast } from "./utils.js";

// 상태 관리
const lawyerState = {
  query: "",
  region: "ALL",
  data: [], // 서버에서 받아온 데이터를 여기에 저장합니다.
};

// 지역 분류 헬퍼 함수
// 수정: startsWith -> includes로 변경 (주소 앞에 우편번호가 있어도 인식되도록)
function classifyRegion(address) {
  if (!address) return "기타";
  const addr = address.trim();

  if (addr.includes("서울") || addr.includes("경기") || addr.includes("인천"))
    return "서울·수도권";
  if (
    addr.includes("부산") ||
    addr.includes("대구") ||
    addr.includes("울산") ||
    addr.includes("경남") ||
    addr.includes("경북")
  )
    return "부산·영남권";
  if (
    addr.includes("대전") ||
    addr.includes("세종") ||
    addr.includes("충남") ||
    addr.includes("충북")
  )
    return "대전·충청권";
  if (
    addr.includes("광주") ||
    addr.includes("전남") ||
    addr.includes("전북") ||
    addr.includes("제주")
  )
    return "광주·전라·제주권";

  return "기타";
}

// DB 데이터를 프론트엔드 형식으로 변환 및 그룹화
function processLawyerData(dbList) {
  const grouped = {
    "서울·수도권": [],
    "부산·영남권": [],
    "대전·충청권": [],
    "광주·전라·제주권": [],
    기타: [],
  };

  dbList.forEach((item) => {
    // 1. 데이터 매핑 (Java CamelCase -> JS 변수)
    // Java Entity: officeLocation, detailSpecialty
    const rawAddress =
      item.officeLocation || item.office_location || item.address || "";

    const rawOfficeName =
      item.office || item.officeName || item.office_name || "";

    const rawTag = item.detailSpecialty || item.detail_specialty || "";

    const imageUrl = item.imageUrl || item.image_url || "";

    // 2. 변호사 객체 생성
    const lawyer = {
      id: item.id,
      name: item.name,
      gender: item.gender || "", // [추가] 성별 데이터 저장
      officeName: rawOfficeName,
      tags: rawTag
        ? rawTag
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      phone: item.contact,
      address: rawAddress,
      url: imageUrl,
      note: item.description,
    };

    // 3. 지역 분류 (반드시 객체 생성 후에 실행)
    const region = classifyRegion(lawyer.address);

    // 4. 그룹 담기
    if (grouped[region]) {
      grouped[region].push(lawyer);
    } else {
      // 주소는 있는데 분류가 안 된 경우 '기타'로
      grouped["기타"].push(lawyer);
    }
  });

  // 5. 배열로 변환하여 반환
  return Object.keys(grouped)
    .filter((key) => grouped[key].length > 0)
    .map((key) => ({
      region: key,
      items: grouped[key],
    }));
}

// 서버에서 변호사 목록 가져오기
async function fetchLawyers() {
  try {
    const response = await fetch("/api/lawyers");
    if (!response.ok) throw new Error("데이터 불러오기 실패");

    const dbList = await response.json();
    // console.log("서버 데이터 확인:", dbList); // 디버깅용 로그 (필요시 주석 해제)

    console.log(dbList[0]);
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

function card(item) {
  const cardTpl = document.getElementById("card-tpl");
  if (!cardTpl) {
    console.error("card-tpl 템플릿이 없습니다.");
    return document.createElement("div");
  }

  const $ = cardTpl.content.firstElementChild.cloneNode(true);
  const icon = $.querySelector(".card__icon");
  const title = $.querySelector(".card__title");
  const meta = $.querySelector(".card__meta"); // 태그 영역
  const desc = $.querySelector(".desc"); // 설명 영역
  const actions = $.querySelector(".actions");

  // [수정 1] 이미지 영역(icon) 수직 중앙 정렬을 위한 스타일 강제 적용
  icon.innerHTML = "";
  icon.style.display = "flex";
  icon.style.alignItems = "center"; // 세로 중앙
  icon.style.justifyContent = "center"; // 가로 중앙

  if (item.url && item.url !== "#" && item.url.startsWith("https")) {
    const img = document.createElement("img");
    img.src = item.url;
    img.alt = `${item.name} 변호사`;
    img.className = "lawyer-photo";
    // 이미지가 영역을 꽉 채우지 않고 가운데 오도록 스타일 조정
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100%";
    img.style.objectFit = "cover";
    icon.appendChild(img);
  } else {
    icon.classList.add("law");
    icon.textContent = "법";
  }

  // --- 제목 ---
  const firmName = item.officeName || "변호사";
  title.innerHTML = `${item.name} <span style="font-size:0.75em; color:#999; font-weight:400;">${firmName}</span>`;
  title.style.marginBottom = "8px";

  // [수정 2] 위치 바꾸기: 설명글(desc)을 태그(meta)보다 먼저 보여주기
  // DOM 트리에서 desc 요소를 meta 요소 앞으로 이동시킵니다.
  if (desc && meta && desc.parentNode === meta.parentNode) {
    meta.parentNode.insertBefore(desc, meta);
  }

  // --- 설명 (위로 올라옴) ---
  desc.textContent = item.note || "";
  desc.style.marginTop = "0px";
  desc.style.marginBottom = "12px"; // 태그와의 간격
  desc.style.color = "#555";
  desc.style.fontSize = "0.95em";
  desc.style.lineHeight = "1.5";

  // --- 태그 (아래로 내려감) ---
  meta.innerHTML = "";
  if (Array.isArray(item.tags) && item.tags.length > 0) {
    const tagRow = document.createElement("div");
    tagRow.style.display = "flex";
    tagRow.style.flexWrap = "wrap";
    tagRow.style.gap = "6px";

    item.tags.forEach((t) => {
      const tagSpan = document.createElement("span");
      tagSpan.textContent = "#" + t; // 앞에 # 붙이기

      tagSpan.style.backgroundColor = "#FFF8E1";
      tagSpan.style.color = "#8D6E63";
      tagSpan.style.padding = "4px 10px";
      tagSpan.style.borderRadius = "12px";
      tagSpan.style.fontSize = "0.8em";
      tagSpan.style.fontWeight = "600";

      tagRow.appendChild(tagSpan);
    });
    meta.appendChild(tagRow);
  }

  // actions
  const aSite = document.createElement("a");
  aSite.className = "btn small line";

  const targetPage = "/lawyer/lawfirm.html";
  const officeParam = encodeURIComponent(item.officeName || "법률사무소");
  const phoneParam = encodeURIComponent(item.phone || "");

  aSite.href = `${targetPage}?office=${officeParam}&phone=${phoneParam}`;
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
      aCopy.textContent = "복사 완료";
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

  if (!app || !sectionTpl) {
    return;
  }

  app.innerHTML = "";

  // lawyerState.data를 사용 (서버에서 받아온 데이터)
  const regions =
    lawyerState.region === "ALL"
      ? lawyerState.data
      : lawyerState.data.filter((r) => r.region === lawyerState.region);

  regions.forEach((block) => {
    const sec = sectionTpl.content.firstElementChild.cloneNode(true);
    sec.querySelector("h2").textContent = block.region;

    const grid = sec.querySelector("[data-grid]");

    // 검색 필터 로직
    const list = block.items.filter((it) => {
      const q = lawyerState.query.trim().toLowerCase();
      // 검색 대상 필드 확장 (이름, 소속, 주소, 태그, 설명)
      const hay = [
        it.name,
        it.officeName,
        it.address,
        (it.tags || []).join(","),
        it.note,
      ]
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

    // 리스트가 있는 경우에만 섹션 추가 (선택사항)
    if (list.length > 0 || lawyerState.query === "") {
      app.appendChild(sec);
    }
  });
}

// CSV 내보내기 (한글 헤더 적용)
function toCSV(rows) {
  // 1) 엑셀 첫 줄에 들어갈 한글 제목
  const krHeader = ["지역", "이름", "성별", "소속", "전화번호", "주소", "비고"];

  // 2) 데이터 객체에서 꺼낼 키 (순서 일치 필수)
  const keys = [
    "region",
    "name",
    "gender",
    "officeName",
    "phone",
    "address",
    "note",
  ];

  // 헤더 추가
  const lines = [krHeader.join(",")];

  // 데이터 행 추가
  rows.forEach((r) => {
    const vals = keys.map((k) => {
      let val = r[k];

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
      const hay = [
        it.name,
        it.officeName,
        it.address,
        (it.tags || []).join(","),
        it.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const okQ = !q || hay.includes(q);

      if (okQ) {
        all.push({ region: r.region, ...it });
      }
    });
  });

  // [수정된 부분] 파일명 생성 로직 ---------------------------------------
  const siteName = "LawOn";

  // 1. 검색어 (없으면 '전체목록'으로 표시)
  const query = lawyerState.query.trim() || "전체목록";

  // 2. 지역 (ALL이면 '전체지역')
  const currentRegion =
    lawyerState.region === "ALL" ? "전체지역" : lawyerState.region;

  // 최종 파일명 예시: LawOn_이혼_서울·수도권_20250814.csv
  const fileName = `${siteName}_${query}_${currentRegion}.csv`;
  // ------------------------------------------------------------------

  const blob = new Blob(["\uFEFF" + toCSV(all)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

// 이벤트 바인딩 (초기화 함수)
export function initLawyerPageListeners() {
  // ★ 페이지 로드 시 DB 데이터 가져오기 실행
  fetchLawyers();

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
    if (qEl) qEl.value = "";
    if (tEl) tEl.value = "ALL";
    render();
  });

  document.getElementById("exportBtn")?.addEventListener("click", exportCSV);
}
