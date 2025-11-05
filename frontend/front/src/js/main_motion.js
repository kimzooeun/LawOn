document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll(".section-hidden");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // 화면에 보이면 보여주기
          entry.target.classList.add("section-visible");
        } else {
          // 화면에서 사라지면 다시 숨기기
          entry.target.classList.remove("section-visible");
        }
      });
    },
    {
      threshold: 0.2, // 20% 정도 보이면 트리거
    }
  );

  sections.forEach(section => observer.observe(section));
});
