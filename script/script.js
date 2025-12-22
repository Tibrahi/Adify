document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Current Time Widget
    const timeDisplay = document.getElementById('current-time');
    const updateTime = () => {
        const now = new Date();
        timeDisplay.innerText = now.toLocaleTimeString();
    };
    setInterval(updateTime, 1000);
    updateTime();

    // 2. Swiper Carousel Initialization
    const swiper = new Swiper(".mySwiper", {
        loop: true,
        autoplay: { delay: 5000 },
        pagination: { el: ".swiper-pagination", clickable: true },
        effect: "fade",
        fadeEffect: { crossFade: true }
    });

    // 3. Rwandan "Ad" Data
    const ads = [
        {
            title: "Visit Rwanda: Gorilla Trekking",
            category: "Tourism",
            star: "Nature",
            desc: "The season of 1000 hills is here. Book your permits for Musanze now.",
            img: "https://images.unsplash.com/photo-1581281863883-2469417a1668?w=500"
        },
        {
            title: "BK Arena: Live Sessions",
            category: "Concert",
            star: "Bruce Melodie",
            desc: "The biggest star in Rwanda live on stage this Saturday. Don't miss out!",
            img: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500"
        },
        {
            title: "Kigali Fashion Week",
            category: "Fashion",
            star: "Moshions",
            desc: "Exclusive runway reveals of the newest cultural designs in Rwanda.",
            img: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=500"
        }
    ];

    // 4. Inject Ads
    const container = document.getElementById('adContainer');
    container.innerHTML = ads.map(ad => `
        <div class="ad-card text-slate-900 shadow-xl group">
            <div class="h-60 overflow-hidden relative">
                <img src="${ad.img}" class="w-full h-full object-cover group-hover:scale-110 transition duration-700">
                <div class="absolute top-4 left-4 bg-emerald-600 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase">
                    ${ad.category}
                </div>
            </div>
            <div class="p-8">
                <p class="text-emerald-600 font-black text-xs uppercase tracking-widest mb-2">${ad.star}</p>
                <h3 class="text-2xl font-black mb-4">${ad.title}</h3>
                <p class="text-slate-500 text-sm mb-6">${ad.desc}</p>
                <button class="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold group-hover:bg-emerald-600 transition">
                    View Alert
                </button>
            </div>
        </div>
    `).join('');
});