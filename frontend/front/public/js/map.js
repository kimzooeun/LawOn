// southKoreaHigh.svg 연동
(function () {
  // 여기서 실제 지점 정보 매핑
  const regions = {
    "KR-11": [{
      // 서울
      badge: "서울",
      name: "정다은 변호사",
      addr: "서울시 성동구 한빛로 138번길 41",
      specialty:"  면접교섭 조정 전문",
      tel: "062-700-7194",
    },
    {
      // 서울
      badge: "서울",
      name: "윤지후 변호사",
      addr: "서울시 중구 한빛로 107번길 14",
      specialty:"  면접교섭 조정 전문",
      tel: "051-400-2809",
    },
  ],
    "KR-28": [{
      // 인천
      badge: "인천",
      name: "김하린 변호사",
      addr: "인천시 동구 한빛로 129번길 4",
      specialty:"  친권 변경 전문",
      tel: "064-967-4249",
    },
    {
      // 인천
      badge: "인천",
      name: "김도윤 변호사",
      addr: "인천시 성동구 문화로 195번길 26",
      specialty:"  상속·세금 연계 이혼 전문",
      tel: "051-868-5166",
    },
    {
      // 인천
      badge: "인천",
      name: "백현우 변호사",
      addr: "인천시 서구 중앙로 188번길 50",
      specialty:"  협의이혼 절차 전문",
      tel: "032-195-4587",
    },
  ],
    "KR-41": [{
      // 경기
      badge: "경기",
      name: "권현서 변호사",
      addr: "경기시 수성구 무궁화로 120번길 10",
      specialty:"  외도 · 상간자 소송 전문",
      tel: "052-641-4109",
    },
    {
      // 경기
      badge: "경기",
      name: "이수빈 변호사",
      addr: "경기시 수성구 중앙로 183번길 41",
      specialty:"  사실혼 관계 해소 전문",
      tel: "033-346-8974",
    },
    {
      // 경기
      badge: "경기",
      name: "한나래 변호사",
      addr: "경기시 남구 무궁화로 135번길 4",
      specialty:"  양육권 분쟁 전문",
      tel: "042-538-3311",
    },
  ],
    "KR-42":[{
      // 강원
      badge: "강원",
      name: "김태현 변호사",
      addr: "강원시 북구 중앙로 158번길 50",
      specialty:"  혼인취소 소송 전문",
      tel: "052-373-4718",
    },
    {
      badge: "강원",
      name: "장태윤 변호사",
      addr: "강원시 서구 무궁화로 174번길 44",
      specialty:"  외도 · 상간자 소송 전문",
      tel: "052-533-1121",
    },
    {
      badge: "강원",
      name: "박하늘 변호사",
      addr: "강원시 성동구 행복로 37번길 27",
      specialty:"  위자료 청구 전문",
      tel: "042-871-5907",
    },
    {
      badge: "강원",
      name: "백지후 변호사",
      addr: "강원시 성동구 중앙로 132번길 33",
      specialty:"  재산분할 전문",
      tel: "063-632-2960",
    },
    {
      badge: "강원",
      name: "권예림 변호사",
      addr: "강원시 동구 한빛로 126번길 17",
      specialty:"  국제이혼 전문",
      tel: "062-880-9655",
    },
  ],
    "KR-43": [{
      // 충북
      badge: "충북",
      name: "김서윤 변호사",
      addr: "충북시 중구 무궁화로 120번길 4",
      specialty:"  외도 · 상간자 소송 전문",
      tel: "033-479-7445",
    },
    {
      // 충북
      badge: "충북",
      name: "이수민 변호사",
      addr: "충북시 동구 무궁화로 42번길 21",
      specialty:"  혼인파탄 이혼 전문",
      tel: "064-831-2443",
    },
    {
      // 충북
      badge: "충북",
      name: "임수정 변호사",
      addr: "충북시 성동구 평화로 96번길 19",
      specialty:"  재판이혼 전문",
      tel: "031-396-7570",
    },
    {
      // 충북
      badge: "충북",
      name: "윤세은 변호사",
      addr: "충북시 성동구 행복로 198번길 14",
      specialty:"  상속·세금 연계 이혼 전문 ",
      tel: "042-922-9774",
    },
  ],
    "KR-44": [{
      // 충남
      badge: "충남",
      name: "조현우 변호사",
      addr: "충남시 수성구 행복로 196번길 9",
      specialty:"  이혼조정 전략가",
      tel: "055-939-5113",
    },
  ],
    "KR-30": [{
      // 대전
      badge: "대전",
      name: "임서연 변호사",
      addr: "대전시 북구 행복로 61번길 2",
      specialty:"  재산분할 전문",
      tel: "02-661-3936",
    },
  ],
    "KR-27": [{
      // 대구
      badge: "대구",
      name: "박지수 변호사",
      addr: "대구시 동구 한빛로 28번길 13",
      specialty:"  사실혼 관계 해소 전문",
      tel: "064-578-6705",
    },
    {
      // 대구
      badge: "대구",
      name: "장우석 변호사",
      addr: "대구시 남구 행복로 59번길 30",
      specialty:"  양육비 청구 전문",
      tel: "02-503-9300",
    },
    {
      // 대구
      badge: "대구",
      name: "하예준 변호사",
      addr: "대구시 남구 행복로 148번길 6",
      specialty:"  재산분할 전문",
      tel: "043-428-7147",
    },
  ],
    "KR-47":  [{
      // 경북
      badge: "경북",
      name: "조은재 변호사",
      addr: "경북시 동구 행복로 121번길 38",
      specialty:"  외도 · 상간자 소송 전문",
      tel: "041-911-9050",
    },
    {
      // 경북
      badge: "경북",
      name: "서가온 변호사",
      addr: "경북시 서구 무궁화로 24번길 41",
      specialty:"  이혼조정 전략가",
      tel: "062-701-6931",
    },
    {
      // 경북
      badge: "경북",
      name: "박도현 변호사",
      addr: "경북시 수성구 중앙로 181번길 36",
      specialty:"  이혼조정 전략가",
      tel: "055-314-2439",
    },
    {
      // 경북
      badge: "경북",
      name: "한예은 변호사",
      addr: "경북시 남구 문화로 11번길 1",
      specialty:"  양육권 분쟁 전문",
      tel: "041-799-6459",
    },
  ],
    "KR-26": [{
      // 부산
      badge: "부산",
      name: "이준호 변호사",
      addr: "부산시 수성구 시청로 192번길 14",
      specialty:"  사실혼 관계 해소 전문",
      tel: "042-505-6034",
    },
    {
      // 부산
      badge: "부산",
      name: "최서준 변호사",
      addr: "부산시 북구 행복로 82번길 8",
      specialty:"  양육비 청구 전문",
      tel: "063-415-5737",
    },
    {
      // 부산
      badge: "부산",
      name: "윤하율 변호사",
      addr: "부산시 동구 자유로 175번길 37",
      specialty:"  상속·세금 연계 이혼 전문",
      tel: "063-617-2755",
    },
  ],
    "KR-31": [{
      // 울산
      badge: "울산",
      name: "박서연 변호사",
      addr: "울산시 중구 행복로 198번길 3",
      specialty:"  국제이혼 전문",
      tel: "054-169-7847",
    },
    {
      // 울산
      badge: "울산",
      name: "오예진 변호사",
      addr: "울산시 성동구 평화로 161번길 32",
      specialty:"  양육비 청구 전문",
      tel: "041-754-5296",
    },
    {
      // 울산
      badge: "울산",
      name: "안도원 변호사",
      addr: "울산시 수성구 자유로 183번길 16",
      specialty:"  양육비 청구 전문",
      tel: "052-466-5209",
    },
  ],
    "KR-48":  [{
      // 경남
      badge: "경남",
      name: "김보라 변호사",
      addr: "경남시 중구 시청로 152번길 29",
      specialty:"  상속·세금 연계 이혼 전문",
      tel: "042-405-8547",
    },
    {
      badge: "경남",
      name: "백승민 변호사",
      addr: "경남시 북구 시청로 197번길 2",
      specialty:"  이혼조정 전략가",
      tel: "063-932-6152",
    },
  ],
    "KR-29": [{
      // 광주
      badge: "광주",
      name: "임경민 변호사",
      addr: "광주시 남구 자유로 74번길 27",
      specialty:"  혼인파탄 이혼 전문",
      tel: "041-989-9245",
    },
  ],
    "KR-45": [{
      // 전북
      badge: "전북",
      name: "정도현 변호사",
      addr: "전북시 동구 한빛로 51번길 28",
      specialty:"  면접교섭 조정 전문",
      tel: "032-447-4994",
    },
    {
      // 전북
      badge: "전북",
      name: "이정관 변호사",
      addr: "전북시 동구 무궁화로 42번길 43",
      specialty:"  재산분할 전문",
      tel: "053-342-2343",
    },
    {
      // 전북
      badge: "전북",
      name: "이우진 변호사",
      addr: "전북시 중구 행복로 43번길 37",
      specialty:"  상속·세금 연계 이혼 전문",
      tel: "041-188-29823",
    },
  ],
    "KR-46": [{
      // 전남
      badge: "전남",
      name: "이서진 변호사",
      addr: "전남시 수성구 행복로 164번길 44",
      specialty:"  협의이혼 절차 전문",
      tel: "062-778-9620",
    },
    {
      badge: "전남",
      name: "조민성 변호사",
      addr: "전남시 수성구 행복로 154번길 29",
      specialty:"  협의이혼 절차 전문",
      tel: "043-238-4670",
    },
    {
      badge: "전남",
      name: "오서영 변호사",
      addr: "전남시 성동구 행복로 56번길 29",
      specialty:"  혼인파탄 이혼 전문",
      tel: "033-396-4553",
    },
    {
      badge: "전남",
      name: "최민재 변호사",
      addr: "전남시 남구 한빛로 150번길 18",
      specialty:"  양육권 분쟁 전문",
      tel: "033-231-6480",
    },
    {
      badge: "전남",
      name: "홍민기 변호사",
      addr: "전남시 수성구 시청로 122번길 1",
      specialty:"  면접교섭 조정 전문",
      tel: "02-694-7698",
    },
  ],
    "KR-49": [{
      // 제주
      badge: "제주",
      name: "정민호 변호사",
      addr: "제주시 서구 자유로 189번길 20",
      specialty:"  상속·세금 연계 이혼 전문",
      tel: "063-465-8869",
    },],
    "KR-50":[{
      // 세종
      badge: "세종",
      name: "최민석 변호사",
      addr: "세종시 성동구 평화로 105번길 14",
      specialty:"  사실혼 관계 해소 전문",
      tel: "052-503-8935",
    },
    {
      // 세종
      badge: "세종",
      name: "한가은 변호사",
      addr: "세종시 동구 평화로 30번길 45",
      specialty:"  양육권 분쟁 전문",
      tel: "02-392-5266",
    },
  ],
  };

  const listEl = document.getElementById("officeRegionList");

  const mapWrap = document.getElementById("koreaMap");
  const mapAreas = mapWrap ? mapWrap.querySelectorAll('svg .land[id^="KR-"]') : [];

  // 지역 활성화 함수
  function activateRegion(id) {
    const data = regions[id];
    if (!data) return;


    // 왼쪽 정보 영역 초기화
    const container = document.getElementById("officeDetail");
    container.innerHTML = "";

    // 여러명의 변호사가 있을 경우, 반복
    data.forEach((office)=>{
      const item = document.createElement("div");
      item.classList.add("office-item");
      item.innerHTML=`
      <span class="office-badge">${office.badge}</span>
      <div class="office-header">
        <h3 class="office-name">${office.name}</h3>
        <p class="office-specialty">${office.specialty}</p>
      </div>
      <p class="office-addr">${office.addr}</p>
      <p class="office-tel">${office.tel}</p>
      `;
      container.appendChild(item);
    });

    // 버튼 active 처리
    if (listEl) {
      listEl.querySelectorAll("button[data-region]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.region === id);
      });
    }

    // 지도 active 처리
    mapAreas.forEach((p) => {
      p.classList.toggle("active", p.id === id);
    });

    // region-label active 처리
    document.querySelectorAll(".region-label").forEach(label => {
      label.classList.toggle("active", label.dataset.region === id);
    });
  }

  // 지도 클릭 시
  if (mapWrap) {
    mapWrap.addEventListener("click", (e) => {
      const area = e.target.closest('.land[id^="KR-"]');
      if (!area) return;

      activateRegion(area.id);
    });
  }

  // 버튼 클릭 시
  if (listEl) {
    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-region]");
      if (!btn) return;
      activateRegion(btn.dataset.region);
    });
  }

  // 초기 설정 (서울 기본 선택 + 폰트 사이즈 적용)
  document.addEventListener("DOMContentLoaded", () => {
    // data-size 속성 기반 폰트 크기 적용
    document.querySelectorAll(".region-label").forEach(label => {
      const size = label.getAttribute('data-size');
      if (size) label.style.fontSize = `${size}px`;
    });

    // 기본 지역 활성화
    activateRegion("KR-11");
  });
})();