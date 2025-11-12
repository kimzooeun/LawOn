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


// 변호사 탭 전환 

const wrapper = document.querySelector('.lawyer-lists');
const tabs = document.querySelectorAll('.category-tab');
const lawyerSections = document.querySelectorAll('.lawyer-category');

tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add("active");
      lawyerSections.forEach((section, i) => {
      if (i === index) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    const activeSection = lawyerSections[index];
    wrapper.style.height = activeSection.offsetHeight + 'px';
  });
});

// 페이지 로드 시 첫 번째만 보이게
lawyerSections.forEach((section, i) => {
  section.classList.toggle('active', i === 0);
});

window.addEventListener('load', () => {
  const activeSection = document.querySelector('.lawyer-category.active');
  if (activeSection) {
    document.querySelector('.lawyer-lists').style.height =
      activeSection.offsetHeight + 'px';
  }
});

// Swiper 슬라이드 초기화
document.querySelectorAll('.mySwiper').forEach(swiperEl => {
  new Swiper(swiperEl, {
      slidesPerView: 4,
      spaceBetween: 30,
      loop: true,
      pagination: {
      el: swiperEl.querySelector('.swiper-pagination'),
      clickable: true,
      },
      autoplay: { delay: 2000, disableOnInteraction: false },
      breakpoints: {
        320: {
            slidesPerView: 1,
            spaceBetween: 15,
        },
        640: {
            slidesPerView: 2,
            spaceBetween: 20,
        },
        1024: {
            slidesPerView: 3,
            spaceBetween: 25,
        },
        1400: {
            slidesPerView: 4,
            spaceBetween: 30,
        },
      }
  });
});


