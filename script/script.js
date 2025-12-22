document.addEventListener('DOMContentLoaded', () => {
    const adsContainer = document.getElementById('adsContainer');

    // Sample Data for Featured Ads
    const ads = [
        {
            id: 1,
            title: "iPhone 15 Pro Max - Titanium",
            price: "$999",
            category: "Electronics",
            image: "https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&q=80&w=400",
            location: "New York, NY"
        },
        {
            id: 2,
            title: "Vintage Leather Jacket",
            price: "$120",
            category: "Fashion",
            image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=400",
            location: "Austin, TX"
        },
        {
            id: 3,
            title: "Modern Minimalist Sofa",
            price: "$450",
            category: "Home",
            image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=400",
            location: "Chicago, IL"
        },
        {
            id: 4,
            title: "Electric Mountain Bike",
            price: "$1,250",
            category: "Sports",
            image: "https://images.unsplash.com/photo-1571068316344-75bc76f77894?auto=format&fit=crop&q=80&w=400",
            location: "Denver, CO"
        },
        {
            id: 5,
            title: "Professional DSLR Camera",
            price: "$890",
            category: "Electronics",
            image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=400",
            location: "Seattle, WA"
        },
        {
            id: 6,
            title: "Luxury Wrist Watch",
            price: "$3,400",
            category: "Fashion",
            image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400",
            location: "Miami, FL"
        }
    ];

    // Render Ads
    function renderAds() {
        adsContainer.innerHTML = ads.map(ad => `
            <div class="ad-card bg-white rounded-3xl overflow-hidden border border-gray-100">
                <div class="relative">
                    <img src="${ad.image}" alt="${ad.title}" class="w-full h-56 object-cover">
                    <span class="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                        ${ad.category}
                    </span>
                    <button class="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-full shadow-sm hover:text-red-500 transition">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
                <div class="p-6">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-bold text-lg leading-tight hover:text-blue-600 cursor-pointer transition">${ad.title}</h3>
                    </div>
                    <p class="text-blue-600 font-extrabold text-xl mb-4">${ad.price}</p>
                    <div class="flex items-center text-gray-400 text-sm border-t pt-4">
                        <i class="fas fa-map-marker-alt mr-2"></i>
                        <span>${ad.location}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderAds();

    // Simple Navbar effect on scroll
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('nav');
        if (window.scrollY > 20) {
            nav.classList.add('shadow-md');
        } else {
            nav.classList.remove('shadow-md');
        }
    });
});