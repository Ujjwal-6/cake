import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDdzcDlvRk55YZMT-k-TmzInejXdwGOw8w",
    authDomain: "cakewebsite-bbd77.firebaseapp.com",
    databaseURL: "https://cakewebsite-bbd77-default-rtdb.firebaseio.com",
    projectId: "cakewebsite-bbd77",
    storageBucket: "cakewebsite-bbd77.firebasestorage.app",
    messagingSenderId: "519208124036",
    appId: "1:519208124036:web:21ec022d6856a16baf0cd1",
    measurementId: "G-FQHJ2575KD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Handle Authentication
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("User authenticated with UID:", user.uid);
    } else {
        try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else {
                await signInAnonymously(auth);
            }
        } catch (error) {
            console.error("Authentication failed:", error);
            showMessage("Authentication failed. Please refresh the page.");
        }
    }
});

// --- Admin Session Management ---
let isAdminLoggedIn = false;
let adminSessionTimeout = null;
let adminWarningTimeout = null;
let countdownInterval = null;
const ADMIN_SESSION_DURATION = 10 * 60 * 1000; // 10 minutes
const WARNING_TIME = 30 * 1000; // 30 seconds before expiry

// --- DOM Elements ---
const productGrid = document.getElementById('product-grid');
const adminProductList = document.getElementById('admin-product-list');
const addProductForm = document.getElementById('add-product-form');
const adminSection = document.getElementById('admin');
const adminLink = document.getElementById('admin-link');
const adminLinkMobile = document.getElementById('admin-link-mobile');
const viewMoreBtn = document.getElementById('view-more-btn');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
const logoutAdminBtn = document.getElementById('logout-admin');

// Modal Elements
const messageModal = document.getElementById('message-modal');
const modalMessage = document.getElementById('modal-message');
const modalCloseBtn = document.getElementById('modal-close-btn');
const passwordModal = document.getElementById('password-modal');
const passwordForm = document.getElementById('password-form');
const passwordInput = document.getElementById('password-input');
const passwordCancelBtn = document.getElementById('password-cancel-btn');
const confirmModal = document.getElementById('confirm-modal');
const confirmMessage = document.getElementById('confirm-message');
const confirmOkBtn = document.getElementById('confirm-ok-btn');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
const sessionWarningModal = document.getElementById('session-warning-modal');
const extendSessionBtn = document.getElementById('extend-session-btn');
const logoutSessionBtn = document.getElementById('logout-session-btn');
const countdownElement = document.getElementById('countdown');

// Navigation Elements
const navLinks = document.querySelectorAll('.nav-link');

let allProducts = [];
let displayedProducts = 6;
let deleteCallback = null;

// --- Admin Session Functions ---
function startAdminSession() {
    isAdminLoggedIn = true;
    document.body.classList.add('admin-active');
    
    // Clear any existing timeouts
    clearTimeout(adminSessionTimeout);
    clearTimeout(adminWarningTimeout);
    
    // Set warning timeout (show warning 30 seconds before expiry)
    adminWarningTimeout = setTimeout(() => {
        showSessionWarning();
    }, ADMIN_SESSION_DURATION - WARNING_TIME);
    
    // Set session timeout
    adminSessionTimeout = setTimeout(() => {
        endAdminSession();
    }, ADMIN_SESSION_DURATION);
}

function extendAdminSession() {
    if (isAdminLoggedIn) {
        startAdminSession(); // Restart the session
        hideSessionWarning();
    }
}

function endAdminSession() {
    isAdminLoggedIn = false;
    document.body.classList.remove('admin-active');
    adminSection.style.display = 'none';
    
    // Clear timeouts
    clearTimeout(adminSessionTimeout);
    clearTimeout(adminWarningTimeout);
    clearInterval(countdownInterval);
    
    // Hide warning modal if open
    hideSessionWarning();
    
    // Clear URL hash if on admin
    if (window.location.hash === '#admin') {
        window.history.pushState("", document.title, window.location.pathname + window.location.search);
    }
    
    clearAdminForm();
    showMessage('Admin session expired. Please log in again.');
}

function showSessionWarning() {
    if (!isAdminLoggedIn) return;
    
    let countdown = 30;
    countdownElement.textContent = countdown;
    sessionWarningModal.classList.remove('hidden');
    sessionWarningModal.classList.add('flex');
    
    countdownInterval = setInterval(() => {
        countdown--;
        countdownElement.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            hideSessionWarning();
        }
    }, 1000);
}

function hideSessionWarning() {
    sessionWarningModal.classList.add('hidden');
    sessionWarningModal.classList.remove('flex');
    clearInterval(countdownInterval);
}

// --- Navigation Management ---
function handleNavigation(targetSection) {
    // If navigating away from admin section, hide it (unless user is admin)
    if (targetSection !== 'admin' && adminSection.style.display === 'block') {
        if (isAdminLoggedIn) {
            adminSection.style.display = 'none';
            // Keep admin logged in but hide the panel
        } else {
            adminSection.style.display = 'none';
        }
    }
}

// --- UI Functions ---
function showMessage(message) {
    modalMessage.textContent = message;
    messageModal.classList.remove('hidden');
    messageModal.classList.add('flex');
}

function createProductCard(product, isAdmin = false) {
    const card = document.createElement('div');
    card.className = isAdmin ? 'bg-white p-4 rounded-lg shadow-md flex flex-col justify-between' : 'product-card bg-white rounded-lg shadow-lg overflow-hidden';

    card.innerHTML = `
        <div>
            <img src="${product.imageUrl}" alt="${product.name}" class="w-full h-64 object-cover" onerror="this.onerror=null;this.src='https://placehold.co/600x400/FFF8F0/E11D48?text=Cake+O\\'Clock';">
            <div class="p-6">
                <h3 class="text-2xl font-bold mb-2" style="font-family: 'Playfair Display', serif;">${product.name}</h3>
                <p class="text-gray-600">${product.description}</p>
            </div>
        </div>
        ${isAdmin ? `<button data-id="${product.id}" class="delete-btn mt-4 bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors w-full">Delete</button>` : ''}
    `;

    if (isAdmin) {
        card.querySelector('.delete-btn').addEventListener('click', (e) => {
            if (!isAdminLoggedIn) {
                showMessage('Admin session expired. Please log in again.');
                return;
            }
            const id = e.target.dataset.id;
            confirmDeletion(async () => {
                await deleteProduct(id);
            });
        });
    }
    return card;
}

function renderProducts() {
    productGrid.innerHTML = '';
    const productsToDisplay = allProducts.slice(0, displayedProducts);
    productsToDisplay.forEach(product => {
        productGrid.appendChild(createProductCard(product));
    });

    if (displayedProducts >= allProducts.length) {
        viewMoreBtn.style.display = 'none';
    } else {
        viewMoreBtn.style.display = 'inline-block';
    }
}

function renderAdminProducts() {
    adminProductList.innerHTML = '';
    allProducts.forEach(product => {
        adminProductList.appendChild(createProductCard(product, true));
    });
}

function clearAdminForm() {
    addProductForm.reset();
    document.getElementById('cakeName').value = '';
    document.getElementById('cakeDescription').value = '';
    document.getElementById('cakeImage').value = '';
}

// --- Firestore Functions ---
const productsCollection = collection(db, "products");

async function addProduct(name, description, imageUrl) {
    if (!isAdminLoggedIn) {
        showMessage('Admin session expired. Please log in again.');
        return;
    }
    
    try {
        await addDoc(productsCollection, { name, description, imageUrl });
        showMessage('Product added successfully!');
        addProductForm.reset();
        extendAdminSession(); // Extend session on activity
    } catch (e) {
        console.error("Error adding document: ", e);
        showMessage('Error adding product. Please try again.');
    }
}

async function deleteProduct(id) {
    if (!isAdminLoggedIn) {
        showMessage('Admin session expired. Please log in again.');
        return;
    }
    
    try {
        await deleteDoc(doc(db, "products", id));
        showMessage('Product deleted successfully!');
        extendAdminSession(); // Extend session on activity
    } catch (e) {
        console.error("Error deleting document: ", e);
        showMessage('Error deleting product. Please try again.');
    }
}

// Listen for real-time updates
onSnapshot(productsCollection, (snapshot) => {
    allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderProducts();
    if (adminSection.style.display === 'block' && isAdminLoggedIn) {
        renderAdminProducts();
    }
}, (error) => {
    console.error("Error listening to product updates:", error);
    showMessage("Could not load products. Check connection or configuration.");
});

// --- Admin & Modal Logic ---
function handleAdminAccess() {
    if (isAdminLoggedIn) {
        // Admin is already logged in, show/hide panel
        const isAdminVisible = adminSection.style.display === 'block';
        if (isAdminVisible) {
            adminSection.style.display = 'none';
            window.history.pushState("", document.title, window.location.pathname + window.location.search);
        } else {
            adminSection.style.display = 'block';
            renderAdminProducts();
            window.location.hash = '#admin';
            adminSection.scrollIntoView({ behavior: 'smooth' });
        }
    } else {
        // Show password modal
        passwordModal.classList.remove('hidden');
        passwordModal.classList.add('flex');
        passwordInput.focus();
    }
}

// Confirmation Modal Logic
function confirmDeletion(callback) {
    deleteCallback = callback;
    confirmMessage.textContent = 'Are you sure you want to delete this product?';
    confirmModal.classList.remove('hidden');
    confirmModal.classList.add('flex');
}

// --- Event Listeners ---
// DOM Content Load Event
document.addEventListener('DOMContentLoaded', () => {
    // Modal close button
    modalCloseBtn.addEventListener('click', () => {
        messageModal.classList.add('hidden');
        messageModal.classList.remove('flex');
    });

    // Add product form
    addProductForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('cakeName').value;
        const description = document.getElementById('cakeDescription').value;
        const imageUrl = document.getElementById('cakeImage').value;
        addProduct(name, description, imageUrl);
    });

    // View more button
    viewMoreBtn.addEventListener('click', () => {
        displayedProducts += 6;
        renderProducts();
    });

    // Mobile menu button
    mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    // Navigation link handlers
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                const section = href.substring(1);
                handleNavigation(section);
            }
            
            // Close mobile menu
            if (link.closest('#mobile-menu')) {
                mobileMenu.classList.add('hidden');
            }
        });
    });

    // Admin logout handler
    logoutAdminBtn.addEventListener('click', () => {
        endAdminSession();
    });

    // Session warning handlers
    extendSessionBtn.addEventListener('click', () => {
        extendAdminSession();
    });

    logoutSessionBtn.addEventListener('click', () => {
        endAdminSession();
    });

    // Password form submission
    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        passwordModal.classList.add('hidden');
        passwordModal.classList.remove('flex');
        
        if (passwordInput.value === 'cake123') {
            startAdminSession();
            adminSection.style.display = 'block';
            renderAdminProducts();
            window.location.hash = '#admin';
            adminSection.scrollIntoView({ behavior: 'smooth' });
            showMessage('Welcome, Admin! Session will expire in 10 minutes.');
        } else {
            showMessage('Incorrect password!');
        }
        passwordInput.value = '';
    });

    // Password cancel button
    passwordCancelBtn.addEventListener('click', () => {
        passwordModal.classList.add('hidden');
        passwordModal.classList.remove('flex');
        passwordInput.value = '';
    });

    // Admin links
    adminLink.addEventListener('click', (e) => { 
        e.preventDefault(); 
        handleAdminAccess(); 
    });
    
    adminLinkMobile.addEventListener('click', (e) => { 
        e.preventDefault(); 
        mobileMenu.classList.add('hidden'); 
        handleAdminAccess(); 
    });

    // Confirmation modal buttons
    confirmOkBtn.addEventListener('click', () => {
        if (deleteCallback) {
            deleteCallback();
        }
        confirmModal.classList.add('hidden');
        confirmModal.classList.remove('flex');
        deleteCallback = null;
    });

    confirmCancelBtn.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
        confirmModal.classList.remove('flex');
        deleteCallback = null;
    });

    // Handle admin form interactions to extend session
    addProductForm.addEventListener('input', () => {
        if (isAdminLoggedIn) {
            extendAdminSession();
        }
    });

    // Handle browser navigation (back/forward buttons)
    window.addEventListener('popstate', () => {
        if (window.location.hash !== '#admin' && adminSection.style.display === 'block') {
            adminSection.style.display = 'none';
        }
    });

    // Check for #admin hash on page load
    if (window.location.hash === '#admin') {
        setTimeout(handleAdminAccess, 500);
    }

    // Handle page visibility change (user switches tabs/minimizes browser)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && isAdminLoggedIn) {
            // User switched away, could implement additional security here
            // For now, we'll just log it
            console.log('Admin user switched away from page');
        }
    });

    // Handle scroll events to hide admin panel when scrolling away
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
        if (!isAdminLoggedIn) return;
        
        const adminSectionTop = adminSection.offsetTop;
        const adminSectionHeight = adminSection.offsetHeight;
        const viewportHeight = window.innerHeight;
        const currentScrollY = window.scrollY;
        
        // If admin panel is visible and user scrolls significantly away from it
        if (adminSection.style.display === 'block') {
            const adminBottomVisible = currentScrollY + viewportHeight > adminSectionTop;
            const adminTopVisible = currentScrollY < adminSectionTop + adminSectionHeight;
            
            // If admin section is completely out of view and user is scrolling away
            if (!adminBottomVisible && !adminTopVisible && Math.abs(currentScrollY - lastScrollY) > 100) {
                // Don't hide immediately, but after a delay
                setTimeout(() => {
                    if (adminSection.style.display === 'block' && 
                        window.scrollY < adminSectionTop - viewportHeight) {
                        adminSection.style.display = 'none';
                        window.history.pushState("", document.title, window.location.pathname + window.location.search);
                    }
                }, 2000); // 2 seconds delay
            }
        }
        
        lastScrollY = currentScrollY;
    });

    // Periodically check if admin is still authenticated (every 30 seconds)
    setInterval(() => {
        if (isAdminLoggedIn) {
            // Admin is still logged in, extend session on any form interaction
            const adminInputs = adminSection.querySelectorAll('input, textarea, button');
            adminInputs.forEach(input => {
                if (input === document.activeElement) {
                    extendAdminSession();
                }
            });
        }
    }, 30000);

    // Prevent right-click context menu on admin elements (additional security)
    adminSection.addEventListener('contextmenu', (e) => {
        if (isAdminLoggedIn) {
            e.preventDefault();
            return false;
        }
    });
});