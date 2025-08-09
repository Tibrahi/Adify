// Sample advertisement data
const advertisements = [
    {
        id: 1,
        title: "Premium Smartphone",
        description: "Latest model with amazing features",
        price: "$999",
        image: "https://via.placeholder.com/300x200",
        category: "Electronics"
    },
    {
        id: 2,
        title: "Designer Watch",
        description: "Luxury timepiece for the modern professional",
        price: "$299",
        image: "https://via.placeholder.com/300x200",
        category: "Fashion"
    },
    {
        id: 3,
        title: "Smart Home System",
        description: "Control your home with voice commands",
        price: "$499",
        image: "https://via.placeholder.com/300x200",
        category: "Home & Living"
    },
    {
        id: 4,
        title: "Electric Vehicle",
        description: "Eco-friendly transportation solution",
        price: "$45,000",
        image: "https://via.placeholder.com/300x200",
        category: "Automotive"
    }
];

// DOM Elements
const adsContainer = document.getElementById('adsContainer');
const searchInput = document.querySelector('.search-container input');
const searchButton = document.querySelector('.search-container button');
const categoryCards = document.querySelectorAll('.category-card');

// Function to create advertisement cards
function createAdCard(ad) {
    const card = document.createElement('div');
    card.className = 'ad-card';
    card.innerHTML = `
        <img src="${ad.image}" alt="${ad.title}">
        <div class="ad-content">
            <h3>${ad.title}</h3>
            <p>${ad.description}</p>
            <div class="ad-footer">
                <span class="price">${ad.price}</span>
                <button class="view-details">View Details</button>
            </div>
        </div>
    `;
    return card;
}

// Function to display advertisements
function displayAds(ads) {
    adsContainer.innerHTML = '';
    ads.forEach(ad => {
        const card = createAdCard(ad);
        adsContainer.appendChild(card);
    });
}

// Function to filter advertisements
function filterAds(query) {
    query = query.toLowerCase();
    return advertisements.filter(ad => 
        ad.title.toLowerCase().includes(query) ||
        ad.description.toLowerCase().includes(query) ||
        ad.category.toLowerCase().includes(query)
    );
}

// Function to filter by category
function filterByCategory(category) {
    return advertisements.filter(ad => ad.category === category);
}

// Event Listeners
searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    const filteredAds = filterAds(query);
    displayAds(filteredAds);
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        const filteredAds = filterAds(query);
        displayAds(filteredAds);
    }
});

// Add click event listeners to category cards
categoryCards.forEach(card => {
    card.addEventListener('click', () => {
        const category = card.querySelector('h3').textContent;
        const filteredAds = filterByCategory(category);
        displayAds(filteredAds);
    });
});

// Add smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Add hover effect to ad cards
document.addEventListener('mouseover', (e) => {
    if (e.target.closest('.ad-card')) {
        e.target.closest('.ad-card').style.transform = 'translateY(-5px)';
        e.target.closest('.ad-card').style.transition = 'transform 0.3s ease';
    }
});

document.addEventListener('mouseout', (e) => {
    if (e.target.closest('.ad-card')) {
        e.target.closest('.ad-card').style.transform = 'translateY(0)';
    }
});

// Initialize the page with all advertisements
displayAds(advertisements);

// Add styles for ad cards
const style = document.createElement('style');
style.textContent = `
    .ad-card {
        background: white;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease;
    }

    .ad-card img {
        width: 100%;
        height: 200px;
        object-fit: cover;
    }

    .ad-content {
        padding: 1rem;
    }

    .ad-content h3 {
        margin-bottom: 0.5rem;
        color: #1e293b;
    }

    .ad-content p {
        color: #64748b;
        margin-bottom: 1rem;
    }

    .ad-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .price {
        font-weight: bold;
        color: #2563eb;
    }

    .view-details {
        padding: 0.5rem 1rem;
        background-color: #2563eb;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    .view-details:hover {
        background-color: #1d4ed8;
    }
`;
document.head.appendChild(style); 