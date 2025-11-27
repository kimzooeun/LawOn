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
      tags: rawTag ? [rawTag] : [],
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
  const meta = $.querySelector(".card__meta");
  const desc = $.querySelector(".desc");
  const actions = $.querySelector(".actions");

  icon.innerHTML = ""; // 초기화

  if (item.url && item.url !== "#" && item.url.startsWith("https")) {
    // 변호사 사진 있는 경우
    const img = document.createElement("img");
    img.src = item.url;
    img.alt = `${item.name} 변호사 사진`;
    img.className = "lawyer-photo";
    icon.appendChild(img);
  } else {
    // 기존 아이콘 fallback
    icon.classList.add("law");
    icon.textContent = "법";
  }

  // 2. 제목 (이름 + 소속) - 대괄호[] 대신 소괄호() 사용 추천
  // 소속은 조금 연하게(span) 처리해서 이름 강조
  const firmName = item.officeName || "변호사";
  title.innerHTML = `${item.name} <span style="font-size:0.8em; color:#666; font-weight:normal;">(${firmName})</span>`;

  // 3. 메타 정보 구성
  meta.innerHTML = "";

  // (1) 주소 (전화번호 텍스트는 삭제 -> 버튼으로 대체)
  if (item.address) {
    const row = document.createElement("div");
    // 아이콘 추가로 시각적 포인트
    row.innerHTML = `<span style="margin-right:4px;">📍</span>${item.address}`;

    // 스타일: 회색조, 약간 작게
    row.style.fontSize = "0.9em";
    row.style.color = "#777";
    row.style.marginBottom = "8px";
    row.style.display = "flex";
    row.style.alignItems = "center";

    meta.appendChild(row);
  }

  // (2) 태그 (뱃지 스타일)
  if (Array.isArray(item.tags) && item.tags.length > 0) {
    const tagRow = document.createElement("div");
    tagRow.style.display = "flex";
    tagRow.style.flexWrap = "wrap";
    tagRow.style.gap = "6px";

    item.tags.forEach((t) => {
      // 태그 스타일 직접 적용 (CSS 클래스가 있다면 classList.add로 대체 가능)
      const tagSpan = document.createElement("span");
      tagSpan.textContent = "#" + t;
      tagSpan.style.backgroundColor = "#f3f4f6"; // 연한 회색 배경
      tagSpan.style.color = "#4b5563"; // 진한 회색 글자
      tagSpan.style.padding = "2px 8px";
      tagSpan.style.borderRadius = "12px"; // 둥글게
      tagSpan.style.fontSize = "0.85em";
      tagSpan.style.fontWeight = "500";

      tagRow.appendChild(tagSpan);
    });
    meta.appendChild(tagRow);
  }

  // 4. 설명 (한 줄 요약)
  // 설명이 너무 길면 잘리도록 처리해도 좋음
  desc.textContent = item.note || "";
  desc.style.marginTop = "10px";
  desc.style.color = "#444";

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
