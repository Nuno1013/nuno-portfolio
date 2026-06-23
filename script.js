 // Scroll to Explore button
 document.querySelector('.scroll-btn')?.addEventListener('click', (e) => {
   e.preventDefault();
   const target = document.querySelector('#profile');
   if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
 });
 
 const revealItems = document.querySelectorAll("[data-reveal]");
 const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 45, 220)}ms`;
  observer.observe(item);
});

const parallaxItems = document.querySelectorAll(".parallax");
const updateParallax = () => {
  const y = window.scrollY;
  parallaxItems.forEach((item) => {
    const speed = Number(item.dataset.speed || 0);
    item.style.transform = `translate3d(0, ${y * speed}px, 0)`;
  });
};

window.addEventListener("scroll", updateParallax, { passive: true });
updateParallax();

document.querySelectorAll(".flip-card").forEach((card) => {
  card.addEventListener("click", () => card.classList.toggle("is-flipped"));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      card.classList.toggle("is-flipped");
    }
  });
});
