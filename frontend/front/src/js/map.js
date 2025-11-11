// southKoreaHigh.svg 연동
(function () {
  // 1. 여기서 실제 지점 정보 매핑
  const regions = {
    "KR-11": {
      // 서울
      badge: "서울",
      name: "토닥토닥이 서울본사",
      addr: "서울특별시 중구 을지로 100, 15F",
      tel: "1600-0000 · 010-1234-5678",
    },
    "KR-28": {
      // 인천
      badge: "인천",
      name: "인천 상담센터",
      addr: "인천 미추홀구 ○○로 11",
      tel: "032-123-4567",
    },
    "KR-41": {
      // 경기
      badge: "경기",
      name: "경기(수도권) 통합센터",
      addr: "경기도 성남시 분당구 ○○로 20",
      tel: "031-000-0000",
    },
    "KR-42": {
      // 강원
      badge: "강원",
      name: "강원 영서권 분소",
      addr: "강원도 원주시 ○○로 100",
      tel: "033-222-3333",
    },
    "KR-43": {
      // 충북
      badge: "충북",
      name: "충북 청주지점",
      addr: "충북 청주시 상당구 ○○로 55",
      tel: "043-123-9000",
    },
    "KR-44": {
      // 충남
      badge: "충남·대전",
      name: "대전·충남 통합센터",
      addr: "대전 서구 둔산로 00",
      tel: "042-111-2222",
    },
    "KR-30": {
      // 대전 (단독)
      badge: "대전",
      name: "대전 센터",
      addr: "대전 서구 탄방동 ○○빌딩",
      tel: "042-555-7777",
    },
    "KR-27": {
      // 대구
      badge: "대구",
      name: "대구 이혼전담센터",
      addr: "대구광역시 중구 중앙대로 200, 11F",
      tel: "053-123-4567",
    },
    "KR-47": {
      // 경북
      badge: "경북(대구 포함)",
      name: "대구·경북 본부",
      addr: "대구광역시 수성구 ○○로 20",
      tel: "053-777-8888",
    },
    "KR-26": {
      // 부산
      badge: "부산",
      name: "부산 해운대지점",
      addr: "부산 해운대구 우동 ○○빌딩 7F",
      tel: "051-777-1000",
    },
    "KR-31": {
      // 울산
      badge: "울산",
      name: "울산 분사무소",
      addr: "울산 남구 삼산동 ○○로 10",
      tel: "052-333-4444",
    },
    "KR-48": {
      // 경남
      badge: "부산·울산·경남",
      name: "창원 본부사무소 (한경민변호사)",
      addr: "경남 창원시 성산구 중앙로 89번길 10, 5층 502호",
      tel: "1600-8888 · 010-7114-1135",
    },
    "KR-29": {
      // 광주
      badge: "광주",
      name: "광주 상담센터",
      addr: "광주광역시 서구 ○○대로 10",
      tel: "062-111-5555",
    },
    "KR-45": {
      // 전북
      badge: "전북",
      name: "전북 전주센터",
      addr: "전북 전주시 완산구 ○○로 55",
      tel: "063-123-4567",
    },
    "KR-46": {
      // 전남
      badge: "전남",
      name: "전남(여수·순천) 분소",
      addr: "전남 순천시 ○○로 33",
      tel: "061-700-8899",
    },
    "KR-49": {
      // 제주
      badge: "제주",
      name: "제주 분사무소",
      addr: "제주시 연동 1000-1, 3F",
      tel: "064-700-1004",
    },
    "KR-50": {
      // 세종
      badge: "세종",
      name: "세종 행정도시 사무소",
      addr: "세종특별자치시 ○○로 10",
      tel: "044-123-4567",
    },
  };

  const listEl = document.getElementById("officeRegionList");
  const badgeEl = document.getElementById("officeBadge");
  const nameEl = document.getElementById("officeName");
  const addrEl = document.getElementById("officeAddr");
  const telEl = document.getElementById("officeTel");

  const mapWrap = document.getElementById("koreaMap");
  // svg 안의 path 들 (class="land")
  const mapAreas = mapWrap ? mapWrap.querySelectorAll('svg .land[id^="KR-"]'): [];

  function activateRegion(id) {
    const data = regions[id];
    if (!data) return;

    // 왼쪽 정보 바꾸기
    badgeEl.textContent = data.badge;
    nameEl.textContent = data.name;
    addrEl.textContent = data.addr;
    telEl.textContent = data.tel;

    // 버튼 active
    if (listEl) {
      listEl.querySelectorAll("button[data-region]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.region === id);
      });
    }

    // 지도 active
    mapAreas.forEach((p) => {
      p.classList.toggle("active", p.id === id);
    });
  }

  // 왼쪽 버튼 클릭
  if (listEl) {
    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-region]");
      if (!btn) return;
      activateRegion(btn.dataset.region);
    });
  }

  // 지도 클릭
  if (mapWrap) {
    mapWrap.addEventListener("click", (e) => {
      const area = e.target.closest('.land[id^="KR-"]');
      if (!area) return;
      activateRegion(area.id);
    });
  }

  // 초기 상태
  activateRegion("KR-11");
})();
