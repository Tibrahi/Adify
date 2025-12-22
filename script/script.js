document.addEventListener('DOMContentLoaded', () => {
    
    // Data for Stars
    const stars = [
        { name: "The Weeknd", img: "https://images.unsplash.com/photo-1619983081563-430f63602796?w=400" },
        { name: "Billie Eilish", img: "https://images.unsplash.com/photo-1598387181032-a3103a2db5b3?w=400" },
        { name: "Travis Scott", img: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=400" },
        { name: "Dua Lipa", img: "https://images.unsplash.com/photo-1581456485147-bc47bd242ad5?w=400" },
        { name: "Bad Bunny", img: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400" }
    ];

    // Data for Events
    const events = [
        {
            id: 1,
            title: "After Hours Til Dawn Tour",
            star: "The Weeknd",
            date: "Dec 28, 2025",
            image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600",
            price: "From $150",
            tag: "World Tour"
        },
        {
            id: 2,
            title: "Coachella Main Stage",
            star: "Various Artists",
            date: "April 15, 2026",
            image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600",
            price: "From $499",
            tag: "Festival"
        },
        {
            id: 3,
            title: "Exclusive Fan Meetup",
            star: "Billie Eilish",
            date: "Jan 12, 2026",
            image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600",
            price: "Invite Only",
            tag: "VIP Access"
        }
    ];

    // Render Stars
    const starGrid = document.getElementById('starGrid');
    starGrid.innerHTML = stars.map(star => `
        <div class="star-circle">
            <img src="${star.img}" alt="${star.name}">
            <p class="font-bold text-sm uppercase tracking-tighter">${star.name}</p>
        </div>
    `).join('');

    // Render Events
    const eventsContainer = document.getElementById('eventsContainer');
    eventsContainer.innerHTML = events.map(event => `
        <div class="event-card group">
            <div class="relative h-64 overflow-hidden">
                <img src="${event.image}" alt="${event.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                <div class="absolute top-4 left-4 bg-pink-600 text-xs font-black px-3 py-1 rounded-full uppercase">
                    ${event.tag}
                </div>
            </div>
            <div class="p-8">
                <p class="text-pink-500 text-xs font-bold uppercase tracking-widest mb-2">${event.star}</p>
                <h3 class="text-2xl font-bold mb-4 leading-tight">${event.title}</h3>
                <div class="flex justify-between items-center border-t border-white/10 pt-6">
                    <div>
                        <p class="text-gray-500 text-xs uppercase">Date</p>
                        <p class="font-bold">${event.date}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-gray-500 text-xs uppercase">Tickets</p>
                        <p class="font-bold text-pink-500">${event.price}</p>
                    </div>
                </div>
                <button class="w-full mt-6 bg-white text-black py-3 rounded-xl font-black hover:bg-pink-600 hover:text-white transition">
                    BOOK NOW
                </button>
            </div>
        </div>
    `).join('');
});