// // ===================================
// // 7. 토닥토닥 [변호사 페이지 로직]
// // (기존 detail.js에서 분리)
// // ===================================

// // ===== 1) 데이터 스키마 =====
// const DATA = [
//   {
//     region: "서울·수도권",
//     items: [
//       // ---- 법률 5 ----
//       {
//         type: "law",
//         name: "예시 법무법인 1",
//         tags: ["가사", "이혼", "상속"],
//         phone: "02-000-0001",
//         address: "서울 서초구 서초대로 000",
//         url: "#",
//         note: "가사/이혼 전문 상담 운영",
//       },
//       {
//         type: "law",
//         name: "예시 로펌 2",
//         tags: ["가사", "재산분할"],
//         phone: "02-000-0002",
//         address: "서울 강남구 테헤란로 000",
//         url: "#",
//         note: "재산분할/친권 분쟁 경험",
//       },
//       {
//         type: "law",
//         name: "예시 로펌 3",
//         tags: ["상속", "유류분"],
//         phone: "02-000-0003",
//         address: "서울 종로구 종로 000",
//         url: "#",
//         note: "상속/유류분 소송 다수",
//       },
//       {
//         type: "law",
//         name: "예시 법률사무소 4",
//         tags: ["가사", "친권·양육"],
//         phone: "031-000-0004",
//         address: "경기 성남시 분당구 000",
//         url: "#",
//         note: "양육·면접교섭 합의 지원",
//       },
//       {
//         type: "law",
//         name: "예시 로펌 5",
//         tags: ["국제이혼", "재판상이혼"],
//         phone: "031-000-0005",
//         address: "경기 수원시 영통구 000",
//         url: "#",
//         note: "국제사건·국제사법 경험",
//       },
//       // ---- 심리 5 ----
//       {
//         type: "mind",
//         name: "예시 심리상담센터 A",
//         tags: ["부부", "가족", "개인"],
//         phone: "02-111-1111",
//         address: "서울 중구 세종대로 000",
//         url: "#",
//         note: "부부·가족상담 프로그램",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 B",
//         tags: ["이혼후 회복", "애도"],
//         phone: "02-111-1112",
//         address: "서울 용산구 한강대로 000",
//         url: "#",
//         note: "이별/이혼 회복 그룹",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 C",
//         tags: ["청소년", "정서"],
//         phone: "02-111-1113",
//         address: "경기 고양시 일산서구 000",
//         url: "#",
//         note: "청소년 정서/행동",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 D",
//         tags: ["불안", "우울"],
//         phone: "031-111-1114",
//         address: "경기 의정부시 000",
//         url: "#",
//         note: "성인 불안/우울",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 E",
//         tags: ["트라우마", "PTSD"],
//         phone: "031-111-1115",
//         address: "인천 미추홀구 000",
//         url: "#",
//         note: "트라우마 전문",
//       },
//     ],
//   },
//   {
//     region: "부산·영남권",
//     items: [
//       {
//         type: "law",
//         name: "예시 로펌 부산 1",
//         tags: ["가사", "이혼"],
//         phone: "051-000-0001",
//         address: "부산 연제구 법원로 000",
//         url: "#",
//         note: "가사 사건 대응",
//       },
//       {
//         type: "law",
//         name: "예시 로펌 부산 2",
//         tags: ["재산분할", "위자료"],
//         phone: "051-000-0002",
//         address: "부산 해운대구 000",
//         url: "#",
//         note: "재산분할/위자료",
//       },
//       {
//         type: "law",
//         name: "예시 로펌 대구 3",
//         tags: ["친권", "면접교섭"],
//         phone: "053-000-0003",
//         address: "대구 수성구 000",
//         url: "#",
//         note: "친권·양육",
//       },
//       {
//         type: "law",
//         name: "예시 법률사무소 4",
//         tags: ["상속", "유류분"],
//         phone: "055-000-0004",
//         address: "경남 창원시 000",
//         url: "#",
//         note: "상속 분쟁",
//       },
//       {
//         type: "law",
//         name: "예시 로펌 5",
//         tags: ["국제이혼"],
//         phone: "054-000-0005",
//         address: "경북 포항시 000",
//         url: "#",
//         note: "국제/해외 거주",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 F",
//         tags: ["부부", "가족"],
//         phone: "051-111-1111",
//         address: "부산 수영구 000",
//         url: "#",
//         note: "부부상담",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 G",
//         tags: ["개인", "우울"],
//         phone: "051-111-1112",
//         address: "부산 남구 000",
//         url: "#",
//         note: "개인상담",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 H",
//         tags: ["청소년", "학부모"],
//         phone: "053-111-1113",
//         address: "대구 중구 000",
//         url: "#",
//         note: "청소년/부모 교육",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 I",
//         tags: ["불안", "공황"],
//         phone: "055-111-1114",
//         address: "경남 김해시 000",
//         url: "#",
//         note: "불안/공황",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 J",
//         tags: ["트라우마"],
//         phone: "054-111-1115",
//         address: "경북 구미시 000",
//         url: "#",
//         note: "트라우마",
//       },
//     ],
//   },
//   {
//     region: "대전·충청권",
//     items: [
//       {
//         type: "law",
//         name: "예시 로펌 대전 1",
//         tags: ["가사", "이혼"],
//         phone: "042-000-0001",
//         address: "대전 서구 둔산로 000",
//         url: "#",
//         note: "가사 사건",
//       },
//       {
//         type: "law",
//         name: "예시 로펌 대전 2",
//         tags: ["재산분할"],
//         phone: "042-000-0002",
//         address: "대전 유성구 000",
//         url: "#",
//         note: "재산분할",
//       },
//       {
//         type: "law",
//         name: "예시 법률사무소 3",
//         tags: ["친권", "양육"],
//         phone: "043-000-0003",
//         address: "충북 청주시 000",
//         url: "#",
//         note: "친권·양육",
//       },
//       {
//         type: "law",
//         name: "예시 로펌 4",
//         tags: ["상속"],
//         phone: "041-000-0004",
//         address: "충남 천안시 000",
//         url: "#",
//         note: "상속",
//       },
//       {
//         type: "law",
//         name: "예시 로펌 5",
//         tags: ["국제사건"],
//         phone: "044-000-0005",
//         address: "세종특별자치시 000",
//         url: "#",
//         note: "국제·국내 연계",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 K",
//         tags: ["가족", "부부"],
//         phone: "042-111-1111",
//         address: "대전 중구 000",
//         url: "#",
//         note: "가족/부부상담",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 L",
//         tags: ["우울", "스트레스"],
//         phone: "043-111-1112",
//         address: "청주 상당구 000",
//         url: "#",
//         note: "성인상담",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 M",
//         tags: ["청소년"],
//         phone: "041-111-1113",
//         address: "아산시 000",
//         url: "#",
//         note: "청소년",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 N",
//         tags: ["불안", "공황"],
//         phone: "041-111-1114",
//         address: "천안시 000",
//         url: "#",
//         note: "불안/공황",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 O",
//         tags: ["트라우마"],
//         phone: "044-111-1115",
//         address: "세종 000",
//         url: "#",
//         note: "트라우마",
//       },
//     ],
//   },
//   {
//     region: "광주·전라·제주권",
//     items: [
//       {
//         type: "law",
//         name: "예시 로펌 광주 1",
//         tags: ["가사", "이혼"],
//         phone: "062-000-0001",
//         address: "광주 동구 000",
//         url: "#",
//         note: "가사 사건",
//       },
//       {
//         type: "law",
//         name: "예시 로펌 전주 2",
//         tags: ["재산분할"],
//         phone: "063-000-0002",
//         address: "전북 전주시 000",
//         url: "#",
//         note: "재산분할",
//       },
//       {
//         type: "law",
//         name: "예시 로펌 순천 3",
//         tags: ["친권", "양육"],
//         phone: "061-000-0003",
//         address: "전남 순천시 000",
//         url: "#",
//         note: "친권·양육",
//       },
//       {
//         type: "law",
//         name: "예시 로펌 제주 4",
//         tags: ["국제이혼"],
//         phone: "064-000-0004",
//         address: "제주 제주시 000",
//         url: "#",
//         note: "국제이혼",
//       },
//       {
//         type: "law",
//         name: "예시 법률사무소 5",
//         tags: ["상속"],
//         phone: "064-000-0005",
//         address: "제주 서귀포시 000",
//         url: "#",
//         note: "상속",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 P",
//         tags: ["부부", "가족"],
//         phone: "062-111-1111",
//         address: "광주 북구 000",
//         url: "#",
//         note: "부부/가족",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 Q",
//         tags: ["우울", "불안"],
//         phone: "061-111-1112",
//         address: "전남 목포시 000",
//         url: "#",
//         note: "성인상담",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 R",
//         tags: ["청소년"],
//         phone: "063-111-1113",
//         address: "전북 군산시 000",
//         url: "#",
//         note: "청소년",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 S",
//         tags: ["트라우마"],
//         phone: "064-111-1114",
//         address: "제주 제주시 000",
//         url: "#",
//         note: "트라우마",
//       },
//       {
//         type: "mind",
//         name: "예시 상담센터 T",
//         tags: ["애도", "이별"],
//         phone: "064-111-1115",
//         address: "제주 서귀포시 000",
//         url: "#",
//         note: "상실/애도",
//       },
//     ],
//   },
// ];

// // ===== 2) 렌더링 =====
// // const app = document.getElementById("app");
// // const sectionTpl = document.getElementById("section-tpl");
// // const cardTpl = document.getElementById("card-tpl");

// // [수정] aaa1.js의 'state'와 충돌나지 않도록 'lawyerState'로 변경
// const lawyerState = {
//   query: "",
//   type: "all", // all | law | mind
//   region: "ALL",
// };

// function makeTag(text) {
//   const s = document.createElement("span");
//   s.className = "tag";
//   s.textContent = text;
//   return s;
// }

// function card(item) {
//   // [수정] cardTpl이 함수 내부에 존재하는지 확인
//   const cardTpl = document.getElementById("card-tpl");
//   if (!cardTpl) {
//     console.error("card-tpl 템플릿이 없습니다.");
//     return document.createElement("div"); // 빈 요소 반환
//   }

//   const $ = cardTpl.content.firstElementChild.cloneNode(true);
//   const icon = $.querySelector(".card__icon");
//   const title = $.querySelector(".card__title");
//   const meta = $.querySelector(".card__meta");
//   const desc = $.querySelector(".desc");
//   const actions = $.querySelector(".actions");

//   icon.classList.add(item.type === "law" ? "law" : "mind");
//   icon.textContent = item.type === "law" ? "법" : "심";

//   title.textContent = item.name;
//   meta.innerHTML = "";
//   meta.appendChild(
//     makeTag(item.type === "law" ? "변호사 사무실" : "심리·고민 상담")
//   );
//   if (item.phone) {
//     meta.appendChild(makeTag(item.phone));
//   }
//   if (item.address) {
//     meta.appendChild(makeTag(item.address));
//   }
//   if (Array.isArray(item.tags))
//     item.tags.forEach((t) => meta.appendChild(makeTag("#" + t)));

//   desc.textContent = item.note || "";

//   // actions
//   const aSite = document.createElement("a");
//   aSite.className = "btn small line";
//   aSite.href = item.url || "#";
//   aSite.target = "_blank";
//   aSite.rel = "noopener";
//   aSite.textContent = "사이트";

//   const aCall = document.createElement("a");
//   aCall.className = "btn small line";
//   aCall.href = item.phone ? `tel:${item.phone.replaceAll(/[^0-9]/g, "")}` : "#";
//   aCall.textContent = "전화";

//   const aMap = document.createElement("a");
//   aMap.className = "btn small line";
//   aMap.target = "_blank";
//   aMap.rel = "noopener";
//   aMap.href = item.address
//     ? `https://map.naver.com/p/search/${encodeURIComponent(item.address)}`
//     : "#";
//   aMap.textContent = "길찾기";

//   const aCopy = document.createElement("button");
//   aCopy.className = "btn small";
//   aCopy.textContent = "주소복사";
//   aCopy.addEventListener("click", async () => {
//     try {
//       // [수정] execCommand는 오래된 방식. navigator.clipboard 사용
//       await navigator.clipboard.writeText(item.address || "");
//       aCopy.textContent = "복사됨!";
//       setTimeout(() => (aCopy.textContent = "주소복사"), 1200);
//     } catch (e) {
//       console.error("클립보드 복사 실패:", e);
//       // [수정] alert 대신 showToast (aaa1.js에 정의됨)
//       if (typeof showToast === "function") {
//         showToast("클립보드 복사 실패", "error");
//       }
//     }
//   });

//   actions.append(aSite, aCall, aMap, aCopy);
//   return $;
// }

// function render() {
//   // [수정] 템플릿 요소들을 이 함수 안에서 다시 찾습니다.
//   const app = document.getElementById("app");
//   const sectionTpl = document.getElementById("section-tpl");

//   if (!app || !sectionTpl) {
//     console.error("app 또는 section-tpl 템플릿을 찾을 수 없습니다.");
//     return;
//   }

//   app.innerHTML = "";
//   const regions =
//     // [수정] 'state' -> 'lawyerState'
//     lawyerState.region === "ALL"
//       ? DATA
//       : DATA.filter((r) => r.region === lawyerState.region);

//   regions.forEach((block) => {
//     const sec = sectionTpl.content.firstElementChild.cloneNode(true);
//     sec.querySelector("h2").textContent = block.region;

//     // 유형 토글
//     const pills = sec.querySelector("[data-pills]");
//     ["all", "law", "mind"].forEach((t) => {
//       const p = document.createElement("button");
//       p.type = "button";
//       // [수정] 'state' -> 'lawyerState'
//       p.className = "pill" + (lawyerState.type === t ? " active" : "");
//       p.textContent =
//         t === "all" ? "전체" : t === "law" ? "변호사" : "심리·상담";
//       p.addEventListener("click", () => {
//         // [수정] 'state' -> 'lawyerState'
//         lawyerState.type = t;
//         render();
//       });
//       pills.appendChild(p);
//     });

//     const grid = sec.querySelector("[data-grid]");
//     const list = block.items.filter((it) => {
//       // [수정] 'state' -> 'lawyerState'
//       const matchType =
//         lawyerState.type === "all" || it.type === lawyerState.type;
//       // [수정] 'state' -> 'lawyerState'
//       const q = lawyerState.query.trim().toLowerCase();
//       const hay = [it.name, it.address, (it.tags || []).join(","), it.note]
//         .filter(Boolean)
//         .join(" ")
//         .toLowerCase();
//       const matchQ = !q || hay.includes(q);
//       return matchType && matchQ;
//     });

//     sec.querySelector(".count").textContent = `${list.length}개 표시`;

//     if (list.length === 0) {
//       const empty = document.createElement("div");
//       empty.className = "empty";
//       empty.textContent = "조건에 맞는 결과가 없습니다.";
//       grid.replaceWith(empty);
//     } else {
//       list.forEach((it) => grid.appendChild(card(it)));
//     }

//     app.appendChild(sec);
//   });

//   mountTabs();
// }

// // ===== 3) 상단 탭 (권역) =====
// function mountTabs() {
//   let tabs = document.getElementById("tabs");
//   if (!tabs) {
//     tabs = document.createElement("div");
//     tabs.id = "tabs";
//     tabs.className = "page tabs";

//     // [수정] document.body가 아닌, app 요소의 부모(mpx-grid)에 삽입
//     const appEl = document.getElementById("app");
//     if (appEl && appEl.parentElement) {
//       appEl.parentElement.insertBefore(tabs, appEl);
//     } else {
//       // (예외 처리)
//       console.error("app 요소를 찾을 수 없어 탭을 body에 붙입니다.");
//       document.body.insertBefore(tabs, appEl);
//     }
//   }
//   tabs.innerHTML = "";

//   const make = (label, val) => {
//     const b = document.createElement("button");
//     b.type = "button";
//     // [수정] 'state' -> 'lawyerState'
//     b.className = "tab" + (lawyerState.region === val ? " active" : "");
//     b.textContent = label;
//     b.addEventListener("click", () => {
//       // [수정] 'state' -> 'lawyerState'
//       lawyerState.region = val;
//       render();
//       window.scrollTo({ top: 0, behavior: "smooth" });
//     });
//     return b;
//   };

//   tabs.appendChild(make("전체", "ALL"));
//   DATA.forEach((r) => tabs.appendChild(make(r.region, r.region)));
// }

// // ===== 4) CSV 내보내기 =====
// function toCSV(rows) {
//   const header = [
//     "region",
//     "type",
//     "name",
//     "phone",
//     "address",
//     "tags",
//     "url",
//     "note",
//   ];
//   const lines = [header.join(",")];
//   rows.forEach((r) => {
//     const vals = header.map((k) => {
//       const v = Array.isArray(r[k]) ? r[k].join("|") : r[k] ?? "";
//       return '"' + String(v).replaceAll('"', '""') + '"';
//     });
//     lines.push(vals.join(","));
//   });
//   return lines.join("\n");
// }
// function exportCSV() {
//   const all = [];
//   const regions =
//     // [수정] 'state' -> 'lawyerState'
//     lawyerState.region === "ALL"
//       ? DATA
//       : DATA.filter((r) => r.region === lawyerState.region);
//   regions.forEach((r) => {
//     r.items.forEach((it) => {
//       // [수정] 'state' -> 'lawyerState'
//       const q = lawyerState.query.trim().toLowerCase();
//       // [수정] 'state' -> 'lawyerState'
//       const okType = lawyerState.type === "all" || it.type === lawyerState.type;
//       const hay = [it.name, it.address, (it.tags || []).join(","), it.note]
//         .filter(Boolean)
//         .join(" ")
//         .toLowerCase();
//       const okQ = !q || hay.includes(q);
//       if (okType && okQ) {
//         all.push({ region: r.region, ...it });
//       }
//     });
//   });
//   const blob = new Blob([toCSV(all)], { type: "text/csv;charset=utf-8;" });
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement("a");
//   a.href = url;
//   a.download = "directory_export.csv";
//   a.click();
//   URL.revokeObjectURL(url);
// }

// // =======================================================
// // ▼▼▼ [핵심 수정] DOMContentLoaded 래퍼 제거 및 함수화 ▼▼▼
// // =======================================================

// // ===== 5) 이벤트 바인딩 (초기화 함수) =====
// function initLawyerPageListeners() {
//   document.getElementById("q")?.addEventListener("input", (e) => {
//     // [수정] 'state' -> 'lawyerState'
//     lawyerState.query = e.target.value;
//     render();
//   });
//   document.getElementById("type")?.addEventListener("change", (e) => {
//     // [수정] 'state' -> 'lawyerState'
//     lawyerState.type = e.target.value;
//     render();
//   });
//   document.getElementById("resetBtn")?.addEventListener("click", () => {
//     // [수정] 'state' -> 'lawyerState'
//     lawyerState.query = "";
//     lawyerState.type = "all";
//     lawyerState.region = "ALL";
//     document.getElementById("q").value = "";
//     document.getElementById("type").value = "all";
//     render();
//   });
//   document.getElementById("exportBtn")?.addEventListener("click", exportCSV);
// }

// // =======================================================
// // ▲▲▲ [핵심 수정] DOMContentLoaded 래퍼 제거 및 함수화 ▲▲▲
// // =======================================================

// ===================================
// 7. 토닥토닥 [변호사 페이지 로직] (수정)
// ===================================

// ===== 1) 데이터 스키마 (수정: 'mind' 타입을 'law'로 모두 변경) =====
const DATA = [
  {
    region: "서울·수도권",
    items: [
      {
        type: "law", // [수정]
        name: "예시 법무법인 1",
        tags: ["가사", "이혼", "상속"],
        phone: "02-000-0001",
        address: "서울 서초구 서초대로 000",
        url: "#",
        note: "가사/이혼 전문 상담 운영",
      },
      {
        type: "law", // [수정]
        name: "예시 로펌 2",
        tags: ["가사", "재산분할"],
        phone: "02-000-0002",
        address: "서울 강남구 테헤란로 000",
        url: "#",
        note: "재산분할/친권 분쟁 경험",
      },
      {
        type: "law", // [수정]
        name: "예시 로펌 3",
        tags: ["상속", "유류분"],
        phone: "02-000-0003",
        address: "서울 종로구 종로 000",
        url: "#",
        note: "상속/유류분 소송 다수",
      },
      {
        type: "law", // [수정]
        name: "예시 법률사무소 4",
        tags: ["가사", "친권·양육"],
        phone: "031-000-0004",
        address: "경기 성남시 분당구 000",
        url: "#",
        note: "양육·면접교섭 합의 지원",
      },
      {
        type: "law", // [수정]
        name: "예시 로펌 5",
        tags: ["국제이혼", "재판상이혼"],
        phone: "031-000-0005",
        address: "경기 수원시 영통구 000",
        url: "#",
        note: "국제사건·국제사법 경험",
      },
      // ---- [수정] 심리 5 -> 법률 5로 변경 ----
      {
        type: "law", // [수정]
        name: "예시 심리상담센터 A",
        tags: ["부부", "가족", "개인"],
        phone: "02-111-1111",
        address: "서울 중구 세종대로 000",
        url: "#",
        note: "부부·가족상담 프로그램",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 B",
        tags: ["이혼후 회복", "애도"],
        phone: "02-111-1112",
        address: "서울 용산구 한강대로 000",
        url: "#",
        note: "이별/이혼 회복 그룹",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 C",
        tags: ["청소년", "정서"],
        phone: "02-111-1113",
        address: "경기 고양시 일산서구 000",
        url: "#",
        note: "청소년 정서/행동",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 D",
        tags: ["불안", "우울"],
        phone: "031-111-1114",
        address: "경기 의정부시 000",
        url: "#",
        note: "성인 불안/우울",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 E",
        tags: ["트라우마", "PTSD"],
        phone: "031-111-1115",
        address: "인천 미추홀구 000",
        url: "#",
        note: "트라우마 전문",
      },
    ],
  },
  {
    region: "부산·영남권",
    items: [
      {
        type: "law", // [수정]
        name: "예시 로펌 부산 1",
        tags: ["가사", "이혼"],
        phone: "051-000-0001",
        address: "부산 연제구 법원로 000",
        url: "#",
        note: "가사 사건 대응",
      },
      {
        type: "law", // [수정]
        name: "예시 로펌 부산 2",
        tags: ["재산분할", "위자료"],
        phone: "051-000-0002",
        address: "부산 해운대구 000",
        url: "#",
        note: "재산분할/위자료",
      },
      {
        type: "law", // [수정]
        name: "예시 로펌 대구 3",
        tags: ["친권", "면접교섭"],
        phone: "053-000-0003",
        address: "대구 수성구 000",
        url: "#",
        note: "친권·양육",
      },
      {
        type: "law", // [수정]
        name: "예시 법률사무소 4",
        tags: ["상속", "유류분"],
        phone: "055-000-0004",
        address: "경남 창원시 000",
        url: "#",
        note: "상속 분쟁",
      },
      {
        type: "law", // [수정]
        name: "예시 로펌 5",
        tags: ["국제이혼"],
        phone: "054-000-0005",
        address: "경북 포항시 000",
        url: "#",
        note: "국제/해외 거주",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 F",
        tags: ["부부", "가족"],
        phone: "051-111-1111",
        address: "부산 수영구 000",
        url: "#",
        note: "부부상담",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 G",
        tags: ["개인", "우울"],
        phone: "051-111-1112",
        address: "부산 남구 000",
        url: "#",
        note: "개인상담",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 H",
        tags: ["청소년", "학부모"],
        phone: "053-111-1113",
        address: "대구 중구 000",
        url: "#",
        note: "청소년/부모 교육",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 I",
        tags: ["불안", "공황"],
        phone: "055-111-1114",
        address: "경남 김해시 000",
        url: "#",
        note: "불안/공황",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 J",
        tags: ["트라우마"],
        phone: "054-111-1115",
        address: "경북 구미시 000",
        url: "#",
        note: "트라우마",
      },
    ],
  },
  {
    region: "대전·충청권",
    items: [
      {
        type: "law", // [수정]
        name: "예시 로펌 대전 1",
        tags: ["가사", "이혼"],
        phone: "042-000-0001",
        address: "대전 서구 둔산로 000",
        url: "#",
        note: "가사 사건",
      },
      {
        type: "law", // [수정]
        name: "예시 로펌 대전 2",
        tags: ["재산분할"],
        phone: "042-000-0002",
        address: "대전 유성구 000",
        url: "#",
        note: "재산분할",
      },
      {
        type: "law", // [수정]
        name: "예시 법률사무소 3",
        tags: ["친권", "양육"],
        phone: "043-000-0003",
        address: "충북 청주시 000",
        url: "#",
        note: "친권·양육",
      },
      {
        type: "law", // [수정]
        name: "예시 로펌 4",
        tags: ["상속"],
        phone: "041-000-0004",
        address: "충남 천안시 000",
        url: "#",
        note: "상속",
      },
      {
        type: "law", // [수정]
        name: "예시 로펌 5",
        tags: ["국제사건"],
        phone: "044-000-0005",
        address: "세종특별자치시 000",
        url: "#",
        note: "국제·국내 연계",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 K",
        tags: ["가족", "부부"],
        phone: "042-111-1111",
        address: "대전 중구 000",
        url: "#",
        note: "가족/부부상담",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 L",
        tags: ["우울", "스트레스"],
        phone: "043-111-1112",
        address: "청주 상당구 000",
        url: "#",
        note: "성인상담",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 M",
        tags: ["청소년"],
        phone: "041-111-1113",
        address: "아산시 000",
        url: "#",
        note: "청소년",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 N",
        tags: ["불안", "공황"],
        phone: "041-111-1114",
        address: "천안시 000",
        url: "#",
        note: "불안/공황",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 O",
        tags: ["트라우마"],
        phone: "044-111-1115",
        address: "세종 000",
        url: "#",
        note: "트라우마",
      },
    ],
  },
  {
    region: "광주·전라·제주권",
    items: [
      {
        type: "law", // [수정]
        name: "예시 로펌 광주 1",
        tags: ["가사", "이혼"],
        phone: "062-000-0001",
        address: "광주 동구 000",
        url: "#",
        note: "가사 사건",
      },
      {
        type: "law", // [수정]
        name: "예시 로펌 전주 2",
        tags: ["재산분할"],
        phone: "063-000-0002",
        address: "전북 전주시 000",
        url: "#",
        note: "재산분할",
      },
      {
        type: "law", // [수정]
        name: "예시 로펌 순천 3",
        tags: ["친권", "양육"],
        phone: "061-000-0003",
        address: "전남 순천시 000",
        url: "#",
        note: "친권·양육",
      },
      {
        type: "law", // [수정]
        name: "예시 로펌 제주 4",
        tags: ["국제이혼"],
        phone: "064-000-0004",
        address: "제주 제주시 000",
        url: "#",
        note: "국제이혼",
      },
      {
        type: "law", // [수정]
        name: "예시 법률사무소 5",
        tags: ["상속"],
        phone: "064-000-0005",
        address: "제주 서귀포시 000",
        url: "#",
        note: "상속",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 P",
        tags: ["부부", "가족"],
        phone: "062-111-1111",
        address: "광주 북구 000",
        url: "#",
        note: "부부/가족",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 Q",
        tags: ["우울", "불안"],
        phone: "061-111-1112",
        address: "전남 목포시 000",
        url: "#",
        note: "성인상담",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 R",
        tags: ["청소년"],
        phone: "063-111-1113",
        address: "전북 군산시 000",
        url: "#",
        note: "청소년",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 S",
        tags: ["트라우마"],
        phone: "064-111-1114",
        address: "제주 제주시 000",
        url: "#",
        note: "트라우마",
      },
      {
        type: "law", // [수정]
        name: "예시 상담센터 T",
        tags: ["애도", "이별"],
        phone: "064-111-1115",
        address: "제주 서귀포시 000",
        url: "#",
        note: "상실/애도",
      },
    ],
  },
];

// ===== 2) 렌더링 =====
const lawyerState = {
  query: "",
  type: "all", // [삭제] 이 속성은 이제 사용되지 않습니다.
  region: "ALL", // [수정] 이 속성이 상단 드롭다운을 제어합니다.
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

  // [수정] 모든 아이콘을 'law' (법)으로 고정
  icon.classList.add("law");
  icon.textContent = "법";

  title.textContent = item.name;
  meta.innerHTML = "";
  // [수정] 모든 태그를 '변호사 사무실'로 고정
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

  // [수정] 드롭다운에서 선택한 지역('lawyerState.region')에 따라 DATA 필터링
  const regions =
    lawyerState.region === "ALL"
      ? DATA
      : DATA.filter((r) => r.region === lawyerState.region);

  regions.forEach((block) => {
    const sec = sectionTpl.content.firstElementChild.cloneNode(true);
    sec.querySelector("h2").textContent = block.region;

    // [삭제] '유형 토글' (pills) 생성 로직 전체 삭제
    // const pills = sec.querySelector("[data-pills]");
    // ...

    const grid = sec.querySelector("[data-grid]");
    const list = block.items.filter((it) => {
      // [삭제] 'matchType' 로직 삭제 (모든 데이터가 'law'이므로 불필요)

      const q = lawyerState.query.trim().toLowerCase();
      const hay = [it.name, it.address, (it.tags || []).join(","), it.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchQ = !q || hay.includes(q);

      // [수정] matchType 조건 삭제
      return matchQ;
    });

    sec.querySelector(".count").textContent = `${list.length}개 표시`;

    if (list.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty"; // (CSS에 .empty 스타일이 정의되어 있다고 가정)
      empty.textContent = "조건에 맞는 결과가 없습니다.";
      grid.replaceWith(empty);
    } else {
      // [수정] card(it)으로 수정
      list.forEach((it) => grid.appendChild(card(it)));
    }

    app.appendChild(sec);
  });

  // [삭제] mountTabs() 함수 호출 삭제 (지역 탭 제거)
  // mountTabs();
}

// ===== 3) 상단 탭 (권역) =====
// [삭제] mountTabs 함수 전체 삭제 (드롭다운이 이 기능을 대체)
// function mountTabs() { ... }

// ===== 4) CSV 내보내기 =====
function toCSV(rows) {
  const header = [
    "region",
    "type",
    "name",
    "phone",
    "address",
    "tags",
    "url",
    "note",
  ];
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

      // [삭제] okType 로직 삭제

      const hay = [it.name, it.address, (it.tags || []).join(","), it.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const okQ = !q || hay.includes(q);

      // [수정] okType 조건 삭제
      if (okQ) {
        all.push({ region: r.region, ...it });
      }
    });
  });
  const blob = new Blob([toCSV(all)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "directory_export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ===== 5) 이벤트 바인딩 (초기화 함수) =====
function initLawyerPageListeners() {
  document.getElementById("q")?.addEventListener("input", (e) => {
    lawyerState.query = e.target.value;
    render();
  });

  // [수정] 'select#type' 드롭다운이 'lawyerState.region' (지역)을 제어하도록 변경
  document.getElementById("type")?.addEventListener("change", (e) => {
    lawyerState.region = e.target.value;
    render();
  });

  document.getElementById("resetBtn")?.addEventListener("click", () => {
    lawyerState.query = "";
    // lawyerState.type = "all"; // (불필요)
    lawyerState.region = "ALL"; // [수정]
    document.getElementById("q").value = "";
    document.getElementById("type").value = "ALL"; // [수정]
    render();
  });

  document.getElementById("exportBtn")?.addEventListener("click", exportCSV);
}
