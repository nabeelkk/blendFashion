
// Initialize components when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize countdown timer for limited offers
    initCountdown();
    
    // Initialize product image gallery
    initProductGallery();
    
    // Initialize quantity selectors
    initQuantitySelectors();
});

// Countdown Timer
function initCountdown() {
    const countdownElements = document.querySelectorAll('.countdown');
    
    if (countdownElements.length === 0) return;
    
    countdownElements.forEach(countdown => {
        // Set end date (24 hours from now for demo purposes)
        const endDate = new Date();
        endDate.setHours(endDate.getHours() + 24);
        
        // Update countdown every second
        const countdownInterval = setInterval(() => {
            const now = new Date().getTime();
            const distance = endDate - now;
            
            // Calculate time units
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            // Update DOM elements
            countdown.querySelector('.days').textContent = days.toString().padStart(2, '0');
            countdown.querySelector('.hours').textContent = hours.toString().padStart(2, '0');
            countdown.querySelector('.minutes').textContent = minutes.toString().padStart(2, '0');
            countdown.querySelector('.seconds').textContent = seconds.toString().padStart(2, '0');
            
            // If countdown is finished
            if (distance < 0) {
                clearInterval(countdownInterval);
                countdown.innerHTML = "<p>Offer has expired!</p>";
            }
        }, 1000);
    });
}

// Product Image Gallery
function initProductGallery() {
    const thumbnails = document.querySelectorAll('.thumbnail-image');
    const mainImage = document.getElementById('mainImage');
    
    if (!thumbnails.length || !mainImage) return;
    
    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            // Update main image
            mainImage.src = this.querySelector('img').src;
            
            // Update active state
            thumbnails.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Quantity Selectors
function initQuantitySelectors() {
    const quantitySelectors = document.querySelectorAll('.quantity-selector');
    
    if (!quantitySelectors.length) return;
    
    quantitySelectors.forEach(selector => {
        const decreaseBtn = selector.querySelector('button:first-child');
        const increaseBtn = selector.querySelector('button:last-child');
        const input = selector.querySelector('input');
        
        if (!decreaseBtn || !increaseBtn || !input) return;
        
        decreaseBtn.addEventListener('click', function() {
            const currentValue = parseInt(input.value);
            if (currentValue > 1) {
                input.value = currentValue - 1;
            }
        });
        
        increaseBtn.addEventListener('click', function() {

            const currentValue = parseInt(input.value);
            if(currentValue >= 5){
                return
            }
            input.value = currentValue + 1;
        });
    });
}