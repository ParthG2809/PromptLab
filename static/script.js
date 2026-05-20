document.addEventListener("DOMContentLoaded", () => {
    // Utility Functions
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    const getCookie = (name) => {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    };

    // Theme Management
    window.themeManager = {
        init: () => {
            const savedTheme = localStorage.getItem('promptlab-theme') || 'dark';
            document.documentElement.setAttribute('data-theme', savedTheme);
            themeManager.updateIcons(savedTheme);
            
            const toggleBtn = document.getElementById('themeToggle');
            if (toggleBtn) {
                toggleBtn.onclick = () => {
                    const currentTheme = document.documentElement.getAttribute('data-theme');
                    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                    document.documentElement.setAttribute('data-theme', newTheme);
                    localStorage.setItem('promptlab-theme', newTheme);
                    themeManager.updateIcons(newTheme);
                };
            }
        },
        updateIcons: (theme) => {
            const sun = document.getElementById('sunIcon');
            const moon = document.getElementById('moonIcon');
            if (sun && moon) {
                if (theme === 'light') {
                    sun.classList.remove('hidden');
                    moon.classList.add('hidden');
                } else {
                    sun.classList.add('hidden');
                    moon.classList.remove('hidden');
                }
            }
        }
    };
    themeManager.init();

    window.toastManager = {
        container: document.getElementById("toastContainer"),
        show: (message, type = 'info') => {
            const toast = document.createElement('div');
            const color = type === 'success' ? 'text-green-400 border-green-500/30 bg-green-500/5' :
                type === 'error' ? 'text-red-400 border-red-500/30 bg-red-500/5' :
                    'text-blue-400 border-blue-500/30 bg-blue-500/5';

            toast.className = `flex items-center gap-3 px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-500 translate-y-[-20px] opacity-0 pointer-events-auto ${color}`;
            toast.innerHTML = `
                <div class="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                <span class="text-[10px] font-black uppercase tracking-[0.2em]">${message}</span>
            `;

            toastManager.container.appendChild(toast);

            // Animation In
            requestAnimationFrame(() => {
                toast.classList.remove('translate-y-[-20px]', 'opacity-0');
            });

            // Animation Out
            setTimeout(() => {
                toast.classList.add('translate-y-[-20px]', 'opacity-0');
                setTimeout(() => toast.remove(), 500);
            }, 3000);
        }
    };

    // Navigation Management
    window.navManager = {
        init: () => {
            const menuBtn = document.getElementById('mobileMenuBtn');
            const navActions = document.getElementById('navActions');
            
            if (menuBtn && navActions) {
                menuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = navActions.classList.toggle('mobile-open');
                    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
                });

                // Close menu when clicking outside
                document.addEventListener('click', (e) => {
                    if (navActions.classList.contains('mobile-open') && 
                        !navActions.contains(e.target) && 
                        !menuBtn.contains(e.target)) {
                        navActions.classList.remove('mobile-open');
                        document.body.style.overflow = 'auto';
                    }
                });

                // Close menu when clicking a link inside it
                navActions.addEventListener('click', (e) => {
                    if (e.target.closest('button') || e.target.closest('a')) {
                        navActions.classList.remove('mobile-open');
                        document.body.style.overflow = 'auto';
                    }
                });
            }
        },
        showSection: (sectionId) => {
            const sections = ['mainGenerator', 'showcaseSection', 'feedOverlay', 'dashboardOverlay', 'profileSection', 'settingsSection'];
            sections.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
            const target = document.getElementById(sectionId);
            if (target) target.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.body.style.overflow = 'auto';
        },
        showHome: () => {
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            } else {
                navManager.showSection('mainGenerator');
            }
        }
    };
    navManager.init();

    const ART_STYLES = {
        "Photorealistic & Realistic Images": ["Portrait", "Cinematic", "Street", "Fashion", "Product", "Food", "Wildlife", "Macro", "Documentary", "Sports", "Architectural", "Real Estate", "Lifestyle", "Travel"],
        "Artistic & Fine Art Styles": ["Oil Painting", "Watercolor", "Acrylic", "Baroque", "Renaissance", "Modern Art", "Abstract Art", "Pop Art"],
        "Digital Art & Commercial Design": ["3D Render", "Concept Art", "Game Art", "Anime Style", "Manga Style", "Cyberpunk", "Sci-Fi Futuristic", "Fantasy Art", "UI/UX Design", "Matte Painting"],
        "Graphic Design & Commercial Content": ["Logo Design", "Brand Identity", "Poster Design", "Social Media Creative", "Advertising Creative", "Packaging Design", "Typography Design", "Banner Design", "Flyer Design", "Brochure Design", "Presentation Design", "Infographic Design"],
        "Abstract & Experimental": ["Abstract Art", "Glitch Art", "Fractal Art", "Generative Art", "Psychedelic Art", "Fluid Art", "Geometric Abstract", "AI Experimental", "Surreal Abstract", "Noise Art", "Data Moshing", "Mixed Media"],
        "Technical & Educational": ["Medical Illustration", "Anatomical Drawing", "Architectural Blueprint", "Isometric Design", "Infographic", "Scientific Visualization", "Engineering Diagram", "Exploded View Diagram", "Cutaway Illustration", "Technical Schematic", "Educational Diagram"]
    };

    const PROMPT_TYPES = {
        "Image Prompt": ["Portrait Art", "Landscape", "Character Design", "Concept Art", "Digital Illustration", "Photorealistic"],
        "Image to Prompt": [
            "Midjourney Prompt", "Flux Prompt", "Stable Diffusion Prompt", 
            "Cinematic Gaming Prompt", "Anime Prompt", "Realistic Photography Prompt", 
            "Product Photography Prompt", "Fantasy Art Prompt", "UI/UX Design Prompt", 
            "Character Design Prompt", "Environment Concept Prompt"
        ],
        "General / Any Query": ["Brainstorming", "Idea Generation", "Decision Making", "Comparative Analysis", "Hypothetical Scenarios", "Role-based Prompts"],
        "Coding & Technical": ["Code Generation", "Debugging", "Code Optimization", "Code Explanation", "Algorithm Design", "System Design", "API Development", "Database Queries", "Refactoring", "Test Case Generation"],
        "Creative Writing": ["Story Writing", "Short Stories", "Poetry", "Script Writing", "Dialogue Generation", "Character Creation", "World Building", "Plot Twists"],
        "Summarization Prompts": ["Text Summarization", "Book Summarization", "Article Summary", "Bullet Points", "Key Insights", "TLDR", "Meeting Notes", "Research Summary"]
    };

    const state = {
        user: null,
        usage: { remaining: 5, limitReached: false },
        usageFetched: false,
        selectedPromptType: "Image Prompt",
        selectedSubPromptType: "Photorealistic & Realistic Images",
        selectedSub: "Portrait",
        selectedFormat: "natural",
        selectedModel: "Gemini 2.0 Flash",
        imageToPromptFile: null,
        imageToPromptTempUrl: null,

        // Social State
        feed: {
            page: 1,
            sort: 'latest',
            query: '',
            hasMore: true,
            isLoading: false,
            activePromptId: null,
            expandedComments: new Set()
        },
        showcase: {
            page: 1,
            sort: 'latest',
            hasMore: true,
            isLoading: false,
            activeImageId: null,
            category: null,
            subcategory: null
        },
        globalCategories: [],
        activeSection: 'generator'
    };

    window.authManager = {
        modal: document.getElementById("authModal"),
        sections: ['login', 'register', 'otp', 'forgot', 'resetFinal'],
        timer: null,
        tempEmail: '',
        togglePassword: (id) => {
            const input = document.getElementById(id);
            const eyeIcon = document.getElementById(`${id}_eye`);
            if (input.type === 'password') {
                input.type = 'text';
                eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 1.253 0 2.426.235 3.5.655M12 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18"/>`;
            } else {
                input.type = 'password';
                eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>`;
            }
        },

        otpPurpose: 'register',

        show: (section = 'login') => {
            authManager.clearForms();
            authManager.modal.classList.replace('hidden', 'flex');
            authManager.switch(section);
        },
        clearForms: () => {
            const inputs = authManager.modal.querySelectorAll('input');
            inputs.forEach(i => i.value = '');
        },
        hide: () => authManager.modal.classList.replace('flex', 'hidden'),
        switch: (section) => {
            authManager.sections.forEach(s => {
                const el = document.getElementById(`${s}Section`);
                if (el) el.classList.toggle('hidden', s !== section);
            });
        },

        startTimer: () => {
            let timeLeft = 59;
            const timerEl = document.getElementById("otpTimer");
            const resendBtn = document.getElementById("resendOtpBtn");
            resendBtn.disabled = true;

            if (authManager.timer) clearInterval(authManager.timer);

            authManager.timer = setInterval(() => {
                timerEl.innerText = `00:${timeLeft < 10 ? '0' : ''}${timeLeft}`;
                if (timeLeft <= 0) {
                    clearInterval(authManager.timer);
                    resendBtn.disabled = false;
                }
                timeLeft--;
            }, 1000);
        },

        register: async () => {
            const username = document.getElementById("regUsername").value;
            const email = document.getElementById("regEmail").value;
            const password = document.getElementById("regPassword").value;

            if (!username || !email || !password) return toastManager.show("Please fill all fields.", "error");

            try {
                const res = await fetch('/accounts/register/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                    body: JSON.stringify({ username, email, password })
                });
                const data = await res.json();
                if (data.success) {
                    authManager.tempEmail = email;
                    authManager.otpPurpose = 'register';
                    authManager.switch('otp');
                    authManager.startTimer();
                } else toastManager.show(data.error, "error");
            } catch (err) { toastManager.show("Registration failed.", "error"); }
        },

        resendOtp: async () => {
            try {
                const res = await fetch('/accounts/resend-otp/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                    body: JSON.stringify({ email: authManager.tempEmail, purpose: authManager.otpPurpose })
                });
                const data = await res.json();
                if (data.success) {
                    toastManager.show("OTP Resent!", "success");
                    authManager.startTimer();
                } else toastManager.show(data.error, "error");
            } catch (err) { toastManager.show("Failed to resend OTP.", "error"); }
        },

        verifyOtp: async () => {
            const otp = document.getElementById("otpCode").value;
            if (otp.length !== 6) return toastManager.show("Enter 6-digit code.", "error");

            try {
                const res = await fetch('/accounts/verify-otp/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                    body: JSON.stringify({ email: authManager.tempEmail, otp, purpose: authManager.otpPurpose })
                });
                const data = await res.json();
                if (data.success) {
                    if (authManager.otpPurpose === 'register') {
                        authManager.hide();
                        authManager.checkStatus();
                    } else {
                        authManager.switch('resetFinal');
                    }
                } else toastManager.show(data.error, "error");
            } catch (err) { toastManager.show("Verification failed.", "error"); }
        },

        login: async () => {
            const identifier = document.getElementById("loginIdentifier").value;
            const password = document.getElementById("loginPassword").value;

            try {
                const res = await fetch('/accounts/login/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                    body: JSON.stringify({ identifier, password })
                });
                const data = await res.json();
                if (data.success) {
                    authManager.hide();
                    authManager.checkStatus();
                } else toastManager.show(data.error, "error");
            } catch (err) { toastManager.show("Login failed.", "error"); }
        },

        logout: async () => {
            await fetch('/accounts/logout/');
            window.location.href = '/';
        },

        forgotPassword: async () => {
            const email = document.getElementById("forgotEmail").value;
            try {
                const res = await fetch('/accounts/forgot-password/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                if (data.success) {
                    authManager.tempEmail = email;
                    authManager.otpPurpose = 'reset';
                    authManager.switch('otp');
                    authManager.startTimer();
                } else toastManager.show(data.error, "error");
            } catch (err) { toastManager.show("Failed to send reset code.", "error"); }
        },

        resetPassword: async () => {
            const password = document.getElementById("resetNewPassword").value;
            const otp = document.getElementById("otpCode").value;
            try {
                const res = await fetch('/accounts/reset-password/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                    body: JSON.stringify({ email: authManager.tempEmail, password, otp })
                });
                const data = await res.json();
                if (data.success) {
                    toastManager.show("Password updated! Please login.", "success");
                    authManager.switch('login');
                } else toastManager.show(data.error, "error");
            } catch (err) { toastManager.show("Reset failed.", "error"); }
        },

        checkStatus: async () => {
            const res = await fetch('/accounts/check-auth/');
            const data = await res.json();
            state.user = data.authenticated ? data : null;
            authManager.updateUI();
        },

        updateUI: () => {
            const guestSec = document.getElementById("guestSection");
            const authSec = document.getElementById("authSection");
            const adminLink = document.getElementById("adminLink");
            const nameDisp = document.getElementById("userNameDisplay");
            const initial = document.getElementById("userInitial");
            const centralNav = document.getElementById("centralNav");

            if (state.user) {
                guestSec.classList.add('hidden');
                authSec.classList.remove('hidden');
                if (centralNav) {
                    centralNav.classList.remove('hidden');
                    centralNav.classList.add('lg:flex');
                }
                nameDisp.innerText = state.user.username;
                
                // Update Avatar
                if (state.user.avatar) {
                    document.getElementById("userAvatar").src = state.user.avatar;
                    document.getElementById("userAvatar").classList.remove('hidden');
                    document.getElementById("userInitialContainer").classList.add('hidden');
                } else {
                    document.getElementById("userAvatar")?.classList.add('hidden');
                    document.getElementById("userInitialContainer")?.classList.remove('hidden');
                    initial.innerText = state.user.username[0].toUpperCase();
                }

                // Update Email in Dropdown
                const emailDisp = document.getElementById("userEmailDisplay");
                if (emailDisp) emailDisp.innerText = state.user.email || '';

                // Admin Access
                if (adminLink) {
                    if (state.user.is_staff) {
                        adminLink.classList.remove('hidden');
                        adminLink.classList.add('flex');
                    } else {
                        adminLink.classList.add('hidden');
                        adminLink.classList.remove('flex');
                    }
                }
            } else {
                guestSec.classList.remove('hidden');
                authSec.classList.add('hidden');
                if (centralNav) {
                    centralNav.classList.add('hidden');
                    centralNav.classList.remove('lg:flex');
                }
                if (adminLink) {
                    adminLink.classList.add('hidden');
                    adminLink.classList.remove('flex');
                }
                fetchUsage();
            }
        }
    };

    window.showcaseManager = {
        show: () => {
            navManager.showSection('showcaseSection');
            state.activeSection = 'showcase';
            // categoryManager.mountToSection('showcase'); // Removed as it is undefined
            if (state.showcase.page === 1) showcaseManager.loadImages();
        },

        hide: () => navManager.showHome(),

        loadImages: async (reset = false) => {
            if (state.showcase.isLoading) return;
            if (reset) {
                state.showcase.page = 1;
                state.showcase.hasMore = true;
                document.getElementById("imageMasonry").innerHTML = '';
            }
            if (!state.showcase.hasMore) return;

            state.showcase.isLoading = true;
            try {
                const url = new URL('/showcase/feed/', window.location.origin);
                url.searchParams.append('page', state.showcase.page);
                url.searchParams.append('sort', state.showcase.sort);
                if (state.showcase.category) url.searchParams.append('category', state.showcase.category);
                if (state.showcase.subcategory) url.searchParams.append('subcategory', state.showcase.subcategory);

                const res = await fetch(url);
                const data = await res.json();
                if (data.success) {
                    showcaseManager.renderImages(data.images);
                    state.showcase.hasMore = data.has_next;
                    document.getElementById("showcaseLoadMore").classList.toggle('hidden', !data.has_next);
                    state.showcase.page++;
                }
            } catch (err) { console.error("Gallery failed", err); }
            state.showcase.isLoading = false;
        },

        renderImages: (images) => {
            const grid = document.getElementById("imageMasonry");
            images.forEach(img => {
                const div = document.createElement('div');
                div.className = "relative group cursor-pointer break-inside-avoid animate-in fade-in duration-500 mb-6";
                div.innerHTML = `
                    <div class="relative overflow-hidden rounded-[2rem] border border-[var(--card-border)] group-hover:border-blue-500/30 transition-all">
                        <img src="${img.url}" class="w-full h-auto object-cover lazy-load" alt="${img.title}" loading="lazy" onclick="showcaseManager.showViewModal(${img.id})">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all p-6 flex flex-col justify-end pointer-events-none">
                            <h4 class="keep-white font-black uppercase text-xs tracking-widest truncate">${img.title}</h4>
                            <div class="flex items-center justify-between mt-2">
                                <span class="text-[10px] keep-zinc font-bold">@${img.creator}</span>
                                <div class="flex items-center gap-3">
                                    <div class="flex items-center gap-1">
                                        <svg class="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                        <span class="text-[10px] keep-white">${img.likes}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                grid.appendChild(div);
            });
        },

        setSort: (sort) => {
            state.showcase.sort = sort;
            document.getElementById("showcaseLatestBtn").className = sort === 'latest' ? 'px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/10 text-white transition-all' : 'px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all';
            document.getElementById("showcasePopularBtn").className = sort === 'popular' ? 'px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/10 text-white transition-all' : 'px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all';
            showcaseManager.loadImages(true);
        },

        showUploadModal: () => {
            if (!state.user) return authManager.show('login');
            document.getElementById("uploadImageModal").classList.remove('hidden');
        },

        hideUploadModal: () => {
            document.getElementById("uploadImageModal").classList.add('hidden');
            document.getElementById("uploadImageForm").reset();
            document.getElementById("imagePreview").classList.add('hidden');
        },

        showViewModal: async (id) => {
            state.showcase.activeImageId = id;
            document.getElementById("viewImageModal").classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            const fullImg = document.getElementById("fullImage");
            fullImg.src = ''; // Clear previous
            
            try {
                const res = await fetch(`/showcase/details/?image_id=${id}`);
                const data = await res.json();
                if (data.success) {
                    fullImg.src = data.url;
                    document.getElementById("imageDetailTitle").innerText = data.title;
                    document.getElementById("imageDetailUploader").innerText = `@${data.uploader}`;
                    document.getElementById("imageDetailInitial").innerText = data.uploader[0].toUpperCase();
                    document.getElementById("imageDetailModel").innerText = data.ai_model;
                    document.getElementById("imageLikes").innerText = data.likes;
                    
                    // Prompt Attribution
                    const promptLink = document.getElementById("imagePromptLink");
                    if (data.prompt_id) {
                        document.getElementById("imageDetailPromptTitle").innerText = data.prompt_title;
                        promptLink.classList.remove('hidden');
                        promptLink.onclick = async () => {
                            state.selectedPromptId = data.prompt_id;
                            await dashboardManager.showViewModal({id: data.prompt_id}); // Reuse existing prompt viewer
                        };
                    } else {
                        promptLink.classList.add('hidden');
                    }

                    const creatorTag = document.getElementById("promptCreatorTag");
                    if (data.prompt_creator) {
                        document.getElementById("promptCreatorName").innerText = `@${data.prompt_creator}`;
                        creatorTag.classList.remove('hidden');
                        // link to creator profile if implemented, or just toast for now
                    } else {
                        creatorTag.classList.add('hidden');
                    }

                    const inspiredTag = document.getElementById("inspiredByTag");
                    if (data.inspired_by) {
                        document.getElementById("inspiredByName").innerText = data.inspired_by;
                        inspiredTag.classList.remove('hidden');
                    } else {
                        inspiredTag.classList.add('hidden');
                    }
                    
                    const likeBtn = document.getElementById("imageLikeBtn");
                    likeBtn.classList.toggle('text-blue-500', data.is_liked);
                    
                    showcaseManager.loadComments(id);
                }
            } catch (err) { console.error("Details failed", err); }
        },


        hideViewModal: () => {
            document.getElementById("viewImageModal").classList.add('hidden');
            document.body.style.overflow = 'auto';
        },

        downloadImage: () => {
            const img = document.getElementById("fullImage");
            if (!img.src) return;
            
            const link = document.createElement('a');
            link.href = img.src;
            link.download = `PromptLab-Art-${state.showcase.activeImageId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },

        toggleLike: async () => {
            if (!state.user) return authManager.show('login');
            try {
                const res = await fetch('/showcase/interact/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                    body: JSON.stringify({ image_id: state.showcase.activeImageId, type: 'LIKE' })
                });
                const data = await res.json();
                if (data.success) {
                    document.getElementById("imageLikes").innerText = data.likes;
                }
            } catch (err) {}
        },

        loadComments: async (id) => {
            const res = await fetch(`/showcase/comments/?image_id=${id}`);
            const data = await res.json();
            const list = document.getElementById("imageCommentsList");
            list.innerHTML = data.comments.map(c => `
                <div class="space-y-2">
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-black text-blue-400 uppercase tracking-widest">${c.user}</span>
                        <span class="text-[8px] text-zinc-600 font-bold uppercase">${c.created}</span>
                    </div>
                    <p class="text-sm text-zinc-300 leading-relaxed">${c.content}</p>
                </div>
            `).join('') || '<p class="text-xs text-zinc-600 italic">No comments yet. Start the conversation!</p>';
        },

        addComment: async () => {
            if (!state.user) return authManager.show('login');
            const input = document.getElementById("imageCommentInput");
            if (!input.value.trim()) return;

            try {
                const res = await fetch('/showcase/comments/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                    body: JSON.stringify({ image_id: state.showcase.activeImageId, content: input.value })
                });
                const data = await res.json();
                if (data.success) {
                    input.value = '';
                    showcaseManager.loadComments(state.showcase.activeImageId);
                }
            } catch (err) {}
        },

        // Searchable Prompt Selector
        searchPrompts: debounce(async (q) => {
            const results = document.getElementById("promptSearchResults");
            if (!q.trim()) {
                results.classList.add('hidden');
                return;
            }

            try {
                const res = await fetch(`/showcase/search-prompts/?q=${encodeURIComponent(q)}`);
                const data = await res.json();
                if (data.success && data.prompts.length) {
                    results.innerHTML = data.prompts.map(p => `
                        <div onclick="showcaseManager.selectPrompt(${p.id}, '${p.title.replace(/'/g, "\\'")}')" class="p-4 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-all">
                            <div class="flex justify-between items-start mb-1">
                                <span class="text-xs font-bold text-white uppercase tracking-tight">${p.title}</span>
                                <span class="text-[8px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full">${p.category}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">By @${p.creator}</span>
                                <span class="text-[9px] text-zinc-700 italic truncate flex-1">"${p.preview}"</span>
                            </div>
                        </div>
                    `).join('');
                    results.classList.remove('hidden');
                } else {
                    results.classList.add('hidden');
                }
            } catch (err) { results.classList.add('hidden'); }
        }, 300),

        selectPrompt: (id, title) => {
            document.getElementById("imagePromptId").value = id;
            document.getElementById("selectedPromptTitle").innerText = title;
            document.getElementById("selectedPromptChip").classList.remove('hidden');
            document.getElementById("promptSearchInput").value = '';
            document.getElementById("promptSearchResults").classList.add('hidden');
            document.getElementById("promptSearchInput").closest('.relative').classList.add('hidden');
        },

        clearSelectedPrompt: () => {
            document.getElementById("imagePromptId").value = '';
            document.getElementById("selectedPromptChip").classList.add('hidden');
            document.getElementById("promptSearchInput").closest('.relative').classList.remove('hidden');
        }
    };

    // Upload Logic
    const uploadForm = document.getElementById("uploadImageForm");
    if (uploadForm) {
        uploadForm.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(uploadForm);
            formData.append('title', document.getElementById("imageTitle").value);
            formData.append('ai_model', document.getElementById("imageModel").value);
            formData.append('inspired_by', document.getElementById("inspiredBy").value);
            const promptId = document.getElementById("imagePromptId").value;
            if (promptId) formData.append('prompt_id', promptId);
            formData.append('image', document.getElementById("imageInput").files[0]);

            try {
                const res = await fetch('/showcase/upload/', {
                    method: 'POST',
                    headers: { 'X-CSRFToken': getCookie('csrftoken') },
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    toastManager.show("Art shared successfully!", "success");
                    showcaseManager.hideUploadModal();
                    showcaseManager.loadImages(true);
                } else {
                    toastManager.show(data.error || "Upload failed", "error");
                }
            } catch (err) { 
                console.error("Upload failed", err);
                toastManager.show("Connection error during upload", "error");
            }
        };
    }

    const imageInput = document.getElementById("imageInput");
    if (imageInput) {
        imageInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    const preview = document.getElementById("imagePreview");
                    preview.src = re.target.result;
                    preview.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        };
    }

    window.socialManager = {
        toggleNotifications: (e) => {
            if (e) e.stopPropagation();
            const dropdown = document.getElementById("notifDropdown");
            if (!dropdown) return;
            dropdown.classList.toggle('hidden');
            if (!dropdown.classList.contains('hidden')) socialManager.loadNotifications();
        },

        hideNotifications: () => {
            const dropdown = document.getElementById("notifDropdown");
            if (dropdown) dropdown.classList.add('hidden');
        },

        loadNotifications: async () => {
            try {
                const res = await fetch('/notifications/');
                const data = await res.json();
                if (data.success) {
                    const list = document.getElementById("notifList");
                    const count = document.getElementById("notifCount");
                    if (!list || !count) return;

                    if (data.unread_count > 0) {
                        count.innerText = data.unread_count;
                        count.classList.remove('hidden');
                    } else {
                        count.classList.add('hidden');
                    }

                    list.innerHTML = data.notifications.length ? '' : '<div class="text-center py-8 text-zinc-600 text-[10px] font-bold uppercase tracking-widest">No notifications</div>';

                    data.notifications.forEach(n => {
                        const div = document.createElement('div');
                        div.className = `p-3 rounded-xl border ${n.is_read ? 'bg-[var(--input-bg)] border-[var(--card-border)]' : 'bg-blue-500/5 border-blue-500/20'} transition-all`;
                        div.innerHTML = `
                            <p class="text-[10px] text-zinc-300"><span class="text-blue-400 font-black">${n.message}</span></p>
                            <span class="text-[8px] text-zinc-600 uppercase font-bold">${n.created_at}</span>
                        `;
                        list.appendChild(div);
                    });
                }
            } catch (err) { console.error("Notif error", err); }
        },

        markAllRead: async () => {
            await fetch('/notifications/read/', { method: 'POST' });
            socialManager.loadNotifications();
        },

        toggleLike: async (type) => {
            if (!state.user) return authManager.show('login');
            if (!state.feed.activePromptId) return;

            try {
                const res = await fetch('/prompts/interact/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt_id: state.feed.activePromptId, type })
                });
                const data = await res.json();
                if (data.success) {
                    document.getElementById("viewLikes").innerText = data.likes;
                    document.getElementById("viewDislikes").innerText = data.dislikes;

                    const likeBtn = document.getElementById("likeBtn");
                    const dislikeBtn = document.getElementById("dislikeBtn");
                    const adminLink = document.getElementById("adminLink");

                    if (data.message === "Interaction removed") {
                        likeBtn.className = 'flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-blue-500/10 border border-white/10 transition-all';
                        dislikeBtn.className = 'flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-red-500/10 border border-white/10 transition-all';
                    } else if (type === 'LIKE') {
                        likeBtn.className = 'flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-500/20 border border-blue-500/50 transition-all';
                        dislikeBtn.className = 'flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-red-500/10 border border-white/10 transition-all';
                    } else {
                        likeBtn.className = 'flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-blue-500/10 border border-white/10 transition-all';
                        dislikeBtn.className = 'flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-500/20 border border-red-500/50 transition-all';
                    }

                    toastManager.show(data.message, "success");
                    if (dashboardManager.overlay.classList.contains('hidden')) feedManager.load(true);
                } else {
                    toastManager.show(data.error || "Action failed", "error");
                }
            } catch (err) {
                console.error("Like error", err);
                toastManager.show("Connection error", "error");
            }
        },

        loadComments: async (promptId, page = 1) => {
            if (state.feed.activePromptId !== promptId) {
                state.feed.expandedComments.clear();
            }
            state.feed.activePromptId = promptId;
            if (page === 1) state.feed.commentPage = 1;

            try {
                const res = await fetch(`/prompts/comments/?prompt_id=${promptId}&page=${page}`);
                const data = await res.json();
                if (data.success) {
                    const list = document.getElementById("commentList");
                    const count = document.getElementById("commentCount");
                    if (!list || !count) return;

                    if (page === 1) list.innerHTML = '';
                    count.innerText = `${data.total_top} ${data.total_top === 1 ? 'Discussion' : 'Discussions'}`;

                    const renderNode = (c, level = 0) => {
                        const hasReplies = c.replies && c.replies.length > 0;
                        const isExpanded = state.feed.expandedComments.has(c.id);
                        const content = c.content.replace(/@(\w+)/g, '<span class="mention-tag">@$1</span>');

                        return `
                            <div class="relative ${level > 0 ? 'ml-8 mt-6 pl-6 border-l-2 border-white/[0.03]' : 'mb-8'}">
                                <div class="p-5 rounded-[2rem] bg-white/[0.03] border border-white/[0.05] space-y-3 group transition-all hover:bg-white/[0.05] hover:border-white/[0.1]">
                                    <div class="flex justify-between items-center">
                                        <div class="flex items-center gap-3">
                                            <span class="comment-username text-blue-400">${c.username}</span>
                                            ${c.is_owner ? '<span class="text-[9px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-black tracking-tighter">YOU</span>' : ''}
                                        </div>
                                        <div class="flex items-center gap-4">
                                            <span class="comment-meta uppercase font-bold text-zinc-600">${c.created_at}</span>
                                            <div class="hidden group-hover:flex items-center gap-3">
                                                <button onclick="socialManager.showReplyInput(${c.id}, '${c.username}')" class="text-[9px] font-black uppercase text-blue-400 hover:text-blue-300 tracking-widest">Reply</button>
                                                ${c.is_owner ? `
                                                    <button onclick="socialManager.editComment(${c.id}, \`${c.content.replace(/`/g, '\\`').replace(/'/g, "\\'")}\`)" class="text-[9px] font-black uppercase text-zinc-500 hover:text-white tracking-widest">Edit</button>
                                                    <button onclick="socialManager.deleteComment(${c.id})" class="text-[9px] font-black uppercase text-red-500/70 hover:text-red-400 tracking-widest">Delete</button>
                                                ` : `
                                                    <button onclick="socialManager.showReportModal('COMMENT', ${c.id})" class="text-[9px] font-black uppercase text-red-500/50 hover:text-red-400 tracking-widest">Report</button>
                                                `}
                                            </div>
                                        </div>
                                    </div>
                                    <p class="comment-content">${content}</p>
                                    
                                    <div class="flex items-center gap-4 pt-2">
                                        <button onclick="socialManager.interactComment(${c.id}, 'LIKE')" class="flex items-center gap-1.5 transition-all group/btn">
                                            <svg class="w-3.5 h-3.5 ${c.user_type === 'LIKE' ? 'text-blue-500 fill-blue-500' : 'text-zinc-600 group-hover/btn:text-blue-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 10h4.708C19.743 10 20.5 10.842 20.5 11.954c0 1.012-.603 1.947-1.49 2.362l-4.34 2.028a4.113 4.113 0 01-1.67.356H10a1 1 0 01-1-1V11l4-8c.5-1 1.5-1 2 0l-1 5z"/></svg>
                                            <span class="text-[10px] font-black ${c.user_type === 'LIKE' ? 'text-blue-400' : 'text-zinc-600 group-hover/btn:text-blue-400'}">${c.likes}</span>
                                        </button>
                                        <button onclick="socialManager.interactComment(${c.id}, 'DISLIKE')" class="flex items-center gap-1.5 transition-all group/btn">
                                            <svg class="w-3.5 h-3.5 ${c.user_type === 'DISLIKE' ? 'text-red-500 fill-red-500' : 'text-zinc-600 group-hover/btn:text-red-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 14H5.292C4.257 14 3.5 13.158 3.5 12.046c0-1.012.603-1.947-1.49-2.362l4.34-2.028c.507-.237 1.079-.356 1.67-.356H14a1 1 0 011 1v6l-4 8c-.5 1-1.5 1-2 0l1-5z"/></svg>
                                            <span class="text-[10px] font-black ${c.user_type === 'DISLIKE' ? 'text-red-400' : 'text-zinc-600 group-hover/btn:text-red-400'}">${c.dislikes}</span>
                                        </button>
                                    </div>

                                    <div id="reply-input-${c.id}" class="hidden mt-6 pt-6 border-t border-white/[0.05] animate-fade-in">
                                        <textarea id="reply-text-${c.id}" placeholder="Reply to ${c.username}..." class="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-zinc-300 focus:outline-none focus:border-blue-500/30 resize-none h-24 transition-all"></textarea>
                                        <div class="flex justify-end gap-3 mt-3">
                                            <button onclick="socialManager.hideReplyInput(${c.id})" class="px-4 py-2 text-[9px] font-black uppercase text-zinc-500 hover:text-white tracking-widest">Cancel</button>
                                            <button onclick="socialManager.submitReply(${c.id})" class="px-6 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 tracking-widest">Post Reply</button>
                                        </div>
                                    </div>
                                </div>
                                ${hasReplies ? `
                                    <button onclick="socialManager.toggleReplies(${c.id})" class="mt-3 ml-4 text-[9px] font-black uppercase text-zinc-500 hover:text-zinc-300 flex items-center gap-2 transition-colors tracking-widest">
                                        <svg id="arrow-${c.id}" class="w-2.5 h-2.5 transition-transform ${isExpanded ? 'rotate-180' : ''}" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                                        ${c.replies.length} ${c.replies.length === 1 ? 'Reply' : 'Replies'}
                                    </button>
                                    <div id="replies-${c.id}" class="${isExpanded ? '' : 'hidden'}">
                                        ${c.replies.map(r => renderNode(r, level + 1)).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    };

                    const oldBtn = document.getElementById("loadMoreComments");
                    if (oldBtn) oldBtn.remove();

                    if (data.comments.length === 0 && page === 1) {
                        list.innerHTML = '<div class="text-center py-8 text-zinc-600 text-[10px] font-bold uppercase tracking-widest">No discussions yet.</div>';
                    } else {
                        data.comments.forEach(c => {
                            list.insertAdjacentHTML('beforeend', renderNode(c));
                        });

                        if (data.has_more) {
                            const loadMoreHtml = `
                                <button id="loadMoreComments" onclick="socialManager.loadComments('${promptId}', ${page + 1})" class="w-full py-4 mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-blue-400 transition-all border border-dashed border-white/10 rounded-2xl hover:border-blue-500/30">
                                    Load More Discussions
                                </button>
                            `;
                            list.insertAdjacentHTML('beforeend', loadMoreHtml);
                        }
                    }
                }
            } catch (err) { console.error("Comment load failed", err); }
        },

        showReplyInput: (id, username) => {
            const input = document.getElementById(`reply-input-${id}`);
            input.classList.remove('hidden');
            const textarea = document.getElementById(`reply-text-${id}`);
            textarea.value = `@${username} `;
            textarea.focus();
        },

        hideReplyInput: (id) => {
            document.getElementById(`reply-input-${id}`).classList.add('hidden');
        },

        submitReply: async (parentId) => {
            if (!state.user) return authManager.show('login');
            const textarea = document.getElementById(`reply-text-${parentId}`);
            const content = textarea.value.trim();
            if (!content) return toastManager.show("Type something...", "error");

            try {
                const res = await fetch('/prompts/comments/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'create', prompt_id: state.feed.activePromptId, parent_id: parentId, content })
                });
                const data = await res.json();
                if (data.success) {
                    toastManager.show("Reply posted!", "success");
                    socialManager.loadComments(state.feed.activePromptId);
                } else {
                    toastManager.show(data.error || "Post failed", "error");
                }
            } catch (err) { toastManager.show("Connection error", "error"); }
        },

        toggleReplies: (id) => {
            const replies = document.getElementById(`replies-${id}`);
            const arrow = document.getElementById(`arrow-${id}`);
            const isHidden = replies.classList.contains('hidden');

            if (isHidden) {
                replies.classList.remove('hidden');
                arrow.classList.add('rotate-180');
                state.feed.expandedComments.add(id);
            } else {
                replies.classList.add('hidden');
                arrow.classList.remove('rotate-180');
                state.feed.expandedComments.delete(id);
            }
        },

        postComment: async () => {
            if (!state.user) return authManager.show('login');
            const input = document.getElementById("commentInput");
            const content = input.value.trim();
            if (!content) return toastManager.show("Type something...", "error");

            try {
                const res = await fetch('/prompts/comments/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt_id: state.feed.activePromptId, content, action: 'create' })
                });
                const data = await res.json();
                if (data.success) {
                    input.value = '';
                    toastManager.show("Comment posted!", "success");
                    socialManager.loadComments(state.feed.activePromptId);
                } else {
                    toastManager.show(data.error || "Post failed", "error");
                }
            } catch (err) {
                console.error("Comment post error", err);
                toastManager.show("Connection error", "error");
            }
        },

        showConfirm: (title, desc, onConfirm) => {
            const modal = document.getElementById("confirmModal");
            document.getElementById("confirmTitle").innerText = title;
            document.getElementById("confirmDesc").innerText = desc;
            modal.classList.replace('hidden', 'flex');

            document.getElementById("confirmActionBtn").onclick = () => {
                onConfirm();
                socialManager.hideConfirm();
            };
            document.getElementById("cancelActionBtn").onclick = socialManager.hideConfirm;
        },

        hideConfirm: () => document.getElementById("confirmModal").classList.replace('flex', 'hidden'),

        showEditModal: (content, onSave) => {
            const modal = document.getElementById("editCommentModal");
            const input = document.getElementById("editCommentInput");
            input.value = content;
            modal.classList.replace('hidden', 'flex');

            document.getElementById("saveCommentBtn").onclick = () => {
                const newContent = input.value.trim();
                if (newContent && newContent !== content) onSave(newContent);
                socialManager.hideEditModal();
            };
        },

        showReportModal: (type, id) => {
            if (!state.user) return authManager.show('login');
            const modal = document.getElementById("reportModal");
            const reason = document.getElementById("reportReason");
            const btn = document.getElementById("submitReportBtn");

            reason.value = '';
            modal.classList.replace('hidden', 'flex');

            btn.onclick = async () => {
                const text = reason.value.trim();
                if (!text) return toastManager.show("Please provide a reason.", "error");

                try {
                    const res = await fetch('/prompts/report/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ target_type: type, target_id: id, reason: text })
                    });
                    const data = await res.json();
                    if (data.success) {
                        toastManager.show(data.message, "success");
                        socialManager.hideReportModal();
                    } else {
                        toastManager.show(data.error, "error");
                    }
                } catch (err) { toastManager.show("Reporting failed.", "error"); }
            };
        },

        hideReportModal: () => {
            document.getElementById("reportModal").classList.replace('flex', 'hidden');
        },

        interactComment: async (commentId, type) => {
            if (!state.user) return authManager.show('login');
            try {
                const res = await fetch('/prompts/comments/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'interact', comment_id: commentId, type })
                });
                const data = await res.json();
                if (data.success) {
                    socialManager.loadComments(state.feed.activePromptId, state.feed.commentPage || 1);
                    toastManager.show(data.message, "success");
                } else {
                    toastManager.show(data.error || "Action failed", "error");
                }
            } catch (err) {
                console.error("Interaction error", err);
                toastManager.show("Connection error", "error");
            }
        },

        deleteComment: async (commentId) => {
            socialManager.showConfirm(
                "DELETE COMMENT?",
                "This will permanently remove your comment from the discussion.",
                async () => {
                    try {
                        const res = await fetch('/prompts/comments/', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'delete', comment_id: commentId })
                        });
                        const data = await res.json();
                        if (data.success) {
                            toastManager.show("Comment deleted", "success");
                            socialManager.loadComments(state.feed.activePromptId);
                        }
                    } catch (err) { toastManager.show("Delete failed", "error"); }
                }
            );
        },

        editComment: async (commentId, oldContent) => {
            socialManager.showEditModal(oldContent, async (newContent) => {
                try {
                    const res = await fetch('/prompts/comments/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'edit', comment_id: commentId, content: newContent })
                    });
                    const data = await res.json();
                    if (data.success) {
                        toastManager.show("Comment updated", "success");
                        socialManager.loadComments(state.feed.activePromptId);
                    }
                } catch (err) { toastManager.show("Edit failed", "error"); }
            });
        },

        incrementView: async (promptId) => {
            try {
                const res = await fetch('/prompts/view/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt_id: promptId })
                });
                const data = await res.json();
                if (data.success) {
                    const viewSpan = document.getElementById("viewViews");
                    if (viewSpan) {
                        const current = parseInt(viewSpan.innerText) || 0;
                        viewSpan.innerText = `${current + 1} VIEWS`;
                    }
                }
            } catch (err) { console.error("View count failed", err); }
        }
    };



    // Global Click Handler to close dropdowns
    document.addEventListener('click', (e) => {
        const drop = document.getElementById("notifDropdown");
        const btn = document.querySelector('button[onclick*="toggleNotifications"]');
        if (drop && !drop.contains(e.target) && btn && !btn.contains(e.target)) {
            socialManager.hideNotifications();
        }

        const promptResults = document.getElementById("promptSearchResults");
        const promptInput = document.getElementById("promptSearchInput");
        if (promptResults && !promptResults.contains(e.target) && promptInput && !promptInput.contains(e.target)) {
            promptResults.classList.add('hidden');
        }
    });



    window.feedManager = {
        overlay: document.getElementById("feedOverlay"),
        grid: document.getElementById("feedGrid"),

        show: () => {
            navManager.showSection('feedOverlay');
            state.activeSection = 'feed';
            feedManager.load(true);

            // Add scroll listener for infinite scroll
            feedManager.overlay.onscroll = () => {
                if (feedManager.overlay.scrollTop + feedManager.overlay.clientHeight >= feedManager.overlay.scrollHeight - 100) {
                    if (state.feed.hasMore && !state.feed.isLoading) feedManager.load();
                }
            };

            // Add search listener
            document.getElementById("feedSearch").oninput = debounce(() => feedManager.load(true), 500);
        },
        hide: () => navManager.showHome(),

        setSort: (type) => {
            state.feed.sort = type;
            document.getElementById("sortLatest").className = type === 'latest' ? 'px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-blue-600 text-white' : 'px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-zinc-500 hover:text-white';
            document.getElementById("sortTrending").className = type === 'trending' ? 'px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-blue-600 text-white' : 'px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-zinc-500 hover:text-white';
            feedManager.load(true);
        },

        load: async (reset = false) => {
            if (reset) {
                state.feed.page = 1;
                state.feed.hasMore = true;
                feedManager.grid.innerHTML = '';
            }
            if (!state.feed.hasMore || state.feed.isLoading) return;

            state.feed.isLoading = true;
            state.feed.query = document.getElementById("feedSearch").value;

            try {
                const url = new URL('/prompts/community/', window.location.origin);
                url.searchParams.append('q', state.feed.query);
                url.searchParams.append('sort', state.feed.sort);
                url.searchParams.append('page', state.feed.page);

                const res = await fetch(url);
                const data = await res.json();
                if (data.success) {
                    feedManager.render(data.prompts);
                    state.feed.hasMore = data.has_more;
                    state.feed.page++;
                }
            } catch (err) { console.error("Feed load failed", err); }
            finally { state.feed.isLoading = false; }
        },

        render: (prompts) => {
            if (!prompts.length && state.feed.page === 1) {
                feedManager.grid.innerHTML = '<div class="col-span-full text-center py-20 text-zinc-600 font-bold uppercase tracking-widest">No public prompts found.</div>';
                return;
            }

            prompts.forEach(p => {
                const card = document.createElement('div');
                card.className = 'bg-white rounded-[2rem] p-8 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group cursor-pointer relative overflow-hidden flex flex-col h-full';
                
                card.onclick = (e) => {
                    if (e.target.closest('button')) return;
                    dashboardManager.showViewModal(p);
                };

                card.innerHTML = `
                    <div class="flex justify-between items-center mb-6 relative z-10">
                        <span class="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] line-clamp-1 flex-1 pr-20">${p.category || 'General'}</span>
                        <div class="flex items-center gap-3 text-zinc-600">
                            <div class="flex items-center gap-1">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                <span class="text-[10px] font-black">${p.views || 0}</span>
                            </div>
                            <div class="flex items-center gap-1">
                                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                <span class="text-[10px] font-black">${p.likes || 0}</span>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col gap-3 relative z-10 mb-4">
                        <h3 class="text-2xl font-black text-black uppercase tracking-tight line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors font-display">${p.title}</h3>
                        <p class="text-xs text-zinc-500 italic line-clamp-2 leading-relaxed">
                            "${p.idea}"
                        </p>
                    </div>
                    
                    <div class="mt-auto pt-6 relative z-10">
                        <div class="pt-5 border-t border-zinc-100 flex items-center justify-between">
                            <span class="text-[10px] text-zinc-600 font-black uppercase tracking-widest">BY ${p.creator ? p.creator.toUpperCase() : 'USER'}</span>
                            <span class="text-[10px] text-zinc-600 font-black uppercase tracking-widest">${p.created_at ? p.created_at.toUpperCase() : ''}</span>
                        </div>
                    </div>
                `;
                feedManager.grid.appendChild(card);
            });
        }
    };

    window.dashboardManager = {
        overlay: document.getElementById("dashboardOverlay"),
        saveModal: document.getElementById("saveModal"),
        toggleModal: document.getElementById("toggleModal"),
        viewModal: document.getElementById("viewPromptModal"),
        grid: document.getElementById("promptsGrid"),

        show: () => {
            navManager.showSection('dashboardOverlay');
            dashboardManager.loadPrompts();
        },
        hide: () => navManager.showHome(),

        showSaveModal: () => {
            if (!state.user) return authManager.show('login');
            
            const checkbox = document.getElementById("savePrivate");
            if (checkbox) {
                if (state.selectedPromptType === "Image to Prompt") {
                    checkbox.checked = true;
                    checkbox.disabled = true;
                    checkbox.closest('.flex').classList.add('opacity-60');
                } else {
                    checkbox.disabled = false;
                    checkbox.closest('.flex').classList.remove('opacity-60');
                }
            }
            
            document.getElementById("saveTitle").value = '';
            dashboardManager.saveModal.classList.replace('hidden', 'flex');
        },
        hideSaveModal: () => dashboardManager.saveModal.classList.replace('flex', 'hidden'),

        showViewModal: async (p) => {
            if (p.id && !p.title) {
                try {
                    const res = await fetch(`/prompts/details/?id=${p.id}`);
                    const data = await res.json();
                    if (data.success) p = data.prompt;
                    else return toastManager.show("Prompt not found", "error");
                } catch (err) { return toastManager.show("Connection error", "error"); }
            }
            state.feed.activePromptId = p.id;
            document.getElementById("viewTitle").innerText = p.title;
            document.getElementById("viewMeta").innerText = `${p.category || 'General'} • ${p.created_at || 'Recently'}`;
            document.getElementById("viewCreator").innerText = p.creator || 'User';
            document.getElementById("viewIdea").innerText = `"${p.idea}"`;
            document.getElementById("viewContent").value = p.content;

            // Owner Actions logic (ONLY on Library page and for Creator)
            const ownerActions = document.getElementById("viewOwnerActions");
            const isLibraryPage = state.activeSection === 'dashboardOverlay';
            if (state.user && state.user.username === p.creator && isLibraryPage) {
                ownerActions.classList.replace('hidden', 'flex');
                document.getElementById("viewToggleBtn").onclick = () => dashboardManager.showToggleModal(p.id, p.is_private);
                document.getElementById("viewDeleteBtn").onclick = () => dashboardManager.deletePrompt(p.id);
            } else {
                ownerActions.classList.replace('flex', 'hidden');
            }

            const socialActions = document.getElementById("viewSocialActions");
            const commentSection = document.getElementById("viewCommentsSection");

            if (p.is_private) {
                if (socialActions) socialActions.classList.add('hidden');
                if (commentSection) commentSection.classList.add('hidden');
            } else {
                if (socialActions) socialActions.classList.remove('hidden');
                if (commentSection) commentSection.classList.remove('hidden');

                // Set stats
                document.getElementById("viewLikes").innerText = p.likes || 0;
                document.getElementById("viewDislikes").innerText = p.dislikes || 0;
                document.getElementById("viewViews").innerText = `${p.views || 0} VIEWS`;

                // Highlight user interaction
                const likeBtn = document.getElementById("likeBtn");
                const dislikeBtn = document.getElementById("dislikeBtn");
                likeBtn.className = p.has_liked ?
                    'flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-500/20 border border-blue-500/50 transition-all' :
                    'flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-blue-500/10 border border-white/10 transition-all';
                dislikeBtn.className = p.has_disliked ?
                    'flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-500/20 border border-red-500/50 transition-all' :
                    'flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-red-500/10 border border-white/10 transition-all';

                // Toggle Report Button
                const reportBtn = document.getElementById("viewReportBtn");
                if (reportBtn) {
                    if (state.user && state.user.username !== p.creator) {
                        reportBtn.classList.replace('hidden', 'flex');
                    } else {
                        reportBtn.classList.replace('flex', 'hidden');
                    }
                }

                socialManager.loadComments(p.id);
                socialManager.incrementView(p.id);
            }

            dashboardManager.viewModal.classList.replace('hidden', 'flex');
        },
        hideViewModal: () => dashboardManager.viewModal.classList.replace('flex', 'hidden'),
        copyFromView: () => {
            const text = document.getElementById("viewContent").value;
            dashboardManager.copyContent(text);
        },

        showToggleModal: (promptId, isPrivate) => {
            const title = isPrivate ? "MAKE PUBLIC?" : "MAKE PRIVATE?";
            const desc = isPrivate ? "This prompt will be visible to everyone in the community feed." : "This prompt will be hidden and encrypted for your eyes only.";

            document.getElementById("toggleTitle").innerText = title;
            document.getElementById("toggleDesc").innerText = desc;
            dashboardManager.toggleModal.classList.replace('hidden', 'flex');

            document.getElementById("confirmToggleBtn").onclick = () => dashboardManager.confirmToggle(promptId);
        },
        hideToggleModal: () => dashboardManager.toggleModal.classList.replace('flex', 'hidden'),

        confirmToggle: async (promptId) => {
            try {
                const res = await fetch('/api/prompts/toggle-visibility/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                    body: JSON.stringify({ prompt_id: promptId })
                });
                const data = await res.json();
                if (data.success) {
                    dashboardManager.hideToggleModal();
                    dashboardManager.loadPrompts();
                    toastManager.show("Visibility updated!", "success");
                } else toastManager.show(data.error, "error");
            } catch (err) { toastManager.show("Toggle failed.", "error"); }
        },

        deletePrompt: async (promptId) => {
            socialManager.showConfirm(
                "DELETE PROMPT?",
                "Are you sure you want to delete this prompt? This action cannot be undone.",
                async () => {
                    try {
                        const res = await fetch('/api/prompts/delete/', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                            body: JSON.stringify({ prompt_id: promptId })
                        });
                        const data = await res.json();
                        if (data.success) {
                            dashboardManager.loadPrompts();
                            toastManager.show("Prompt deleted.", "success");
                        } else toastManager.show(data.error, "error");
                    } catch (err) { toastManager.show("Delete failed.", "error"); }
                }
            );
        },

        savePrompt: async () => {
            const title = document.getElementById("saveTitle").value;
            const isPrivate = document.getElementById("savePrivate").checked;
            const content = elements.output.value;

            if (!content) return toastManager.show("Generate a prompt first!", "error");

            try {
                const res = await fetch('/api/prompts/save/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                    body: JSON.stringify({
                        title: title || "Untitled Prompt",
                        content: content,
                        is_private: state.selectedPromptType === "Image to Prompt" ? true : isPrivate,
                        idea: state.selectedPromptType === "Image to Prompt" ? "Image Reference Analysis" : document.getElementById("idea").value,
                        prompt_type: state.selectedPromptType,
                        category: state.selectedPromptType === "Image to Prompt" ? "Image Analysis" : state.selectedSubPromptType,
                        sub_style: state.selectedSub || "N/A",
                        format_type: state.selectedFormat,
                        temp_image_url: state.selectedPromptType === "Image to Prompt" ? state.imageToPromptTempUrl : null
                    })
                });
                const data = await res.json();
                if (data.success) {
                    toastManager.show("Saved to your library!", "success");
                    dashboardManager.hideSaveModal();
                } else toastManager.show(data.error, "error");
            } catch (err) { toastManager.show("Failed to save.", "error"); }
        },

        loadPrompts: async () => {
            const query = document.getElementById("promptSearch").value;
            const sort = document.getElementById("promptSort").value;

            try {
                const res = await fetch(`/api/prompts/my/?q=${query}&sort=${sort}`);
                const data = await res.json();
                if (data.success) {
                    dashboardManager.renderPrompts(data.prompts);
                }
            } catch (err) { console.error("Error loading prompts:", err); }
        },
        renderPrompts: (prompts) => {
            dashboardManager.grid.innerHTML = prompts.length ? '' : '<div class="col-span-full text-center py-20 text-zinc-600 font-bold uppercase tracking-widest">No prompts found in your library.</div>';

            prompts.forEach(p => {
                const card = document.createElement('div');
                card.className = 'bg-white rounded-[2rem] p-8 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group cursor-pointer relative overflow-hidden flex flex-col h-full';
                
                // Glow effect on hover
                const glow = document.createElement('div');
                glow.className = 'absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none';
                card.appendChild(glow);

                card.onclick = (e) => {
                    if (e.target.closest('button')) return;
                    dashboardManager.showViewModal(p);
                };

                let imageHtml = "";
                if (p.uploaded_image) {
                    imageHtml = `
                        <div class="relative w-full h-40 rounded-2xl overflow-hidden mb-5 border border-zinc-100 flex items-center justify-center bg-zinc-950">
                            <img src="${p.uploaded_image}" class="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" alt="${p.title}" />
                            <div class="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-zinc-950/80 backdrop-blur-md border border-white/10 text-[9px] font-black text-blue-400 uppercase tracking-widest">
                                Image Ref
                            </div>
                        </div>
                    `;
                }

                card.innerHTML += `
                    ${imageHtml}
                    <div class="flex justify-between items-center mb-6 relative z-10">
                        <span class="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] line-clamp-1 flex-1 pr-24">${p.category || 'General'}</span>
                        
                        <!-- Actions & Stats Group -->
                        <div class="flex items-center gap-2">
                            <!-- Stats (Only visible when NOT hovering or on mobile) -->
                            <div class="flex items-center gap-3 text-zinc-600 group-hover:opacity-0 transition-opacity">
                                <div class="flex items-center gap-1">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                    <span class="text-[10px] font-black">${p.views || 0}</span>
                                </div>
                                <div class="flex items-center gap-1">
                                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                    <span class="text-[10px] font-black">${p.likes || 0}</span>
                                </div>
                            </div>

                            <!-- Quick Actions (Visible ONLY on hover) -->
                            <div class="absolute right-0 top-1/2 -translate-y-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-110">
                                <button onclick="dashboardManager.showToggleModal(${p.id}, ${p.is_private})" class="p-2.5 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white border border-blue-500/20 transition-all shadow-lg">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                </button>
                                <button onclick="dashboardManager.deletePrompt(${p.id})" class="p-2.5 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/20 transition-all shadow-lg">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col gap-3 relative z-10 mb-4">
                        <h3 class="text-2xl font-black text-black uppercase tracking-tight line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors font-display">${p.title}</h3>
                        <p class="text-xs text-zinc-500 italic line-clamp-2 leading-relaxed">
                            "${p.idea}"
                        </p>
                    </div>
                    
                    <div class="mt-auto pt-6 relative z-10">
                        <div class="pt-5 border-t border-zinc-100 flex items-center justify-between">
                            <span class="text-[10px] text-zinc-600 font-black uppercase tracking-widest">BY ${p.creator ? p.creator.toUpperCase() : 'USER'}</span>
                            <span class="text-[10px] text-zinc-600 font-black uppercase tracking-widest">${p.created_at ? p.created_at.toUpperCase() : ''}</span>
                        </div>
                    </div>
                `;
                dashboardManager.grid.appendChild(card);
            });
        },

        copyContent: (text) => {
            navigator.clipboard.writeText(text);
            toastManager.show("Copied to clipboard!", "success");
        }
    };



    // DOM Elements
    const elements = {
        idea: document.getElementById("idea"),
        output: document.getElementById("output"),
        generateBtn: document.getElementById("generateBtn"),
        promptTypeGrid: document.getElementById("promptTypeGrid"),
        subPromptTypeGrid: document.getElementById("subPromptTypeGrid"),
        styleGrid: document.getElementById("styleGrid"),
        styleSection: document.getElementById("styleSection"),
        subPromptTypeSection: document.getElementById("subPromptTypeSection"),
        remainingCount: document.getElementById("remainingCount"),
        usageBadge: document.getElementById("usageBadge"),
        blurOverlay: document.getElementById("blurOverlay"),
        premiumModal: document.getElementById("premiumModal"),
        copyBtn: document.getElementById("copyBtn")
    };

    // Helper functions
    const updateUI = () => {
        elements.usageBadge.classList.toggle('hidden', false);
        elements.remainingCount.innerText = state.usage.remaining;

        if (state.usage.limitReached) {
            elements.output.classList.add('blur-text');
            elements.blurOverlay.classList.remove('hidden');
            elements.generateBtn.disabled = true;
            elements.generateBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            elements.output.classList.remove('blur-text');
            elements.blurOverlay.classList.add('hidden');
            elements.generateBtn.disabled = false;
            elements.generateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    };

    window.showModal = () => elements.premiumModal.classList.replace('hidden', 'flex');
    window.hideModal = () => elements.premiumModal.classList.replace('flex', 'hidden');

    const fetchUsage = async () => {
        try {
            const res = await fetch('/usage/');
            const data = await res.json();
            state.usage = data;
            updateUI();
        } catch (err) { console.error("Usage fetch failed", err); }
    };

    const createCard = (text, onClick, isActive = false) => {
        const div = document.createElement("div");
        div.className = `flex-shrink-0 px-6 py-4 rounded-2xl glass-card cursor-pointer text-sm font-semibold transition-all hover:scale-105 ${isActive ? 'active-card' : ''}`;
        div.innerText = text;
        div.onclick = onClick;
        return div;
    };

    const populateGrid = (grid, items, activeItem, onSelect) => {
        grid.innerHTML = "";
        items.forEach(item => {
            const card = createCard(item, () => onSelect(item), item === activeItem);
            grid.appendChild(card);
        });
    };

    // Image to Prompt Manager
    window.imageToPromptManager = {
        handleFileSelect: (event) => {
            const file = event.target.files[0];
            if (file) {
                imageToPromptManager.displayPreview(file);
            }
        },
        displayPreview: (file) => {
            state.imageToPromptFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById("imageToPromptPreview");
                const placeholder = document.getElementById("uploadPlaceholder");
                const removeBtn = document.getElementById("removeImageBtn");
                
                if (preview && placeholder && removeBtn) {
                    preview.src = e.target.result;
                    preview.classList.remove('hidden');
                    placeholder.classList.add('hidden');
                    removeBtn.classList.remove('hidden');
                }
            };
            reader.readAsDataURL(file);
        },
        removeImage: () => {
            state.imageToPromptFile = null;
            state.imageToPromptTempUrl = null;
            const preview = document.getElementById("imageToPromptPreview");
            const placeholder = document.getElementById("uploadPlaceholder");
            const removeBtn = document.getElementById("removeImageBtn");
            const fileInput = document.getElementById("imageToPromptInput");
            
            if (preview && placeholder && removeBtn && fileInput) {
                preview.src = "";
                preview.classList.add('hidden');
                placeholder.classList.remove('hidden');
                removeBtn.classList.add('hidden');
                fileInput.value = "";
            }
        }
    };

    // Drag and Drop Listeners Setup
    const setupDragAndDrop = () => {
        const dropzone = document.getElementById("uploadDropzone");
        if (dropzone) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                dropzone.addEventListener(eventName, () => {
                    dropzone.classList.add('border-blue-500/80', 'bg-blue-500/[0.02]');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, () => {
                    dropzone.classList.remove('border-blue-500/80', 'bg-blue-500/[0.02]');
                }, false);
            });

            dropzone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const file = dt.files[0];
                if (file && file.type.startsWith('image/')) {
                    imageToPromptManager.displayPreview(file);
                }
            }, false);
        }
    };

    // Initialization
    const init = async () => {
        if (!state.usageFetched) {
            await authManager.checkStatus();
            state.usageFetched = true;
            setupDragAndDrop();
        }

        // Prompt Types Grid
        populateGrid(elements.promptTypeGrid, Object.keys(PROMPT_TYPES), state.selectedPromptType, (type) => {
            state.selectedPromptType = type;
            
            // Clean up image to prompt state when switching away
            if (type !== "Image to Prompt") {
                imageToPromptManager.removeImage();
            }

            const isImage = type === "Image Prompt";
            const isImageToPrompt = type === "Image to Prompt";

            if (isImage) {
                state.selectedSubPromptType = Object.keys(ART_STYLES)[0];
                state.selectedSub = ART_STYLES[state.selectedSubPromptType][0];
            } else if (isImageToPrompt) {
                state.selectedSubPromptType = "Image Analysis";
                state.selectedSub = "N/A";
                // Select default format if current selectedFormat is not compatible
                if (!PROMPT_TYPES["Image to Prompt"].includes(state.selectedFormat)) {
                    state.selectedFormat = PROMPT_TYPES["Image to Prompt"][0];
                }
            } else {
                state.selectedSubPromptType = PROMPT_TYPES[type][0];
                state.selectedSub = "N/A";
            }
            init();
        });

        const isImageToPrompt = state.selectedPromptType === "Image to Prompt";
        const ideaSection = document.getElementById("ideaSection");
        const uploadSection = document.getElementById("imageToPromptUploadSection");
        const formatSection = document.getElementById("formatSection");
        const formatButtonsContainer = document.getElementById("formatButtonsContainer");
        const subLabel = document.getElementById('subPromptTypeLabel');

        if (isImageToPrompt) {
            // HIDE idea input, subcategory section, art styles
            if (ideaSection) ideaSection.classList.add('hidden');
            if (elements.subPromptTypeSection) elements.subPromptTypeSection.classList.add('hidden');
            if (elements.styleSection) elements.styleSection.classList.add('hidden');
            
            // SHOW upload area
            if (uploadSection) uploadSection.classList.remove('hidden');
            
            // POPULATE format buttons container with Image to Prompt formats
            if (formatButtonsContainer) {
                formatButtonsContainer.className = "flex flex-wrap gap-3 pb-2";
                formatButtonsContainer.innerHTML = "";
                PROMPT_TYPES["Image to Prompt"].forEach(fmt => {
                    const isActive = state.selectedFormat === fmt;
                    const btn = document.createElement("button");
                    btn.className = `px-5 py-3 rounded-2xl glass-card text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all ${isActive ? 'active-card' : 'text-zinc-500'}`;
                    btn.innerText = fmt;
                    btn.onclick = () => {
                        state.selectedFormat = fmt;
                        init();
                    };
                    formatButtonsContainer.appendChild(btn);
                });
            }

            elements.generateBtn.innerHTML = `
                ANALYZE IMAGE
                <svg class="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3"
                        d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            `;
        } else {
            // Restore regular layout
            if (ideaSection) ideaSection.classList.remove('hidden');
            if (uploadSection) uploadSection.classList.add('hidden');
            
            if (formatButtonsContainer) {
                formatButtonsContainer.className = "grid grid-cols-2 md:grid-cols-4 gap-3";
                // Restore the original 4 format buttons
                formatButtonsContainer.innerHTML = `
                    <button class="format-btn px-4 py-3 rounded-xl glass-card text-xs font-bold uppercase tracking-tighter hover:bg-white/5 transition-all ${state.selectedFormat === 'natural' ? 'active-card' : ''}" data-value="natural">Natural</button>
                    <button class="format-btn px-4 py-3 rounded-xl glass-card text-xs font-bold uppercase tracking-tighter hover:bg-white/5 transition-all ${state.selectedFormat === 'keywords' ? 'active-card' : ''}" data-value="keywords">Keywords</button>
                    <button class="format-btn px-4 py-3 rounded-xl glass-card text-xs font-bold uppercase tracking-tighter hover:bg-white/5 transition-all ${state.selectedFormat === 'json' ? 'active-card' : ''}" data-value="json">JSON</button>
                    <button class="format-btn px-4 py-3 rounded-xl glass-card text-xs font-bold uppercase tracking-tighter hover:bg-white/5 transition-all ${state.selectedFormat === 'image' ? 'active-card' : ''}" data-value="image">Image</button>
                `;
                // Re-bind listeners for original buttons
                document.querySelectorAll(".format-btn").forEach(btn => {
                    btn.onclick = () => {
                        document.querySelectorAll(".format-btn").forEach(b => b.classList.remove("active-card"));
                        btn.classList.add("active-card");
                        state.selectedFormat = btn.dataset.value;
                    };
                });
            }

            elements.generateBtn.innerHTML = `
                GENERATE PROMPT
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3"
                        d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            `;
            
            // Original subcategory and style sections visibility
            const isImage = state.selectedPromptType === "Image Prompt";
            if (elements.subPromptTypeSection) elements.subPromptTypeSection.classList.remove('hidden');
            
            const subItems = isImage ? Object.keys(ART_STYLES) : PROMPT_TYPES[state.selectedPromptType];
            if (subLabel) {
                const icon = isImage ? 
                    `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>` :
                    `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`;
                
                subLabel.innerHTML = `
                    <span class="w-7 h-7 flex items-center justify-center bg-blue-600/10 text-blue-500 rounded-lg">${icon}</span>
                    ${isImage ? 'Art Style Categories' : 'Subcategory'}
                `;
            }

            populateGrid(elements.subPromptTypeGrid, subItems, state.selectedSubPromptType, (sub) => {
                state.selectedSubPromptType = sub;
                if (isImage) {
                    state.selectedSub = ART_STYLES[sub][0];
                } else {
                    state.selectedSub = "N/A";
                }
                init();
            });

            const formatSectionEl = document.getElementById('formatSection');
            const styleSectionEl = document.getElementById('styleSection');
            
            if (isImage) {
                styleSectionEl.classList.remove('hidden');
                formatSectionEl.parentNode.insertBefore(styleSectionEl, formatSectionEl);
                
                populateGrid(elements.styleGrid, ART_STYLES[state.selectedSubPromptType], state.selectedSub, (style) => {
                    state.selectedSub = style;
                    init();
                });
            } else {
                styleSectionEl.classList.add('hidden');
                styleSectionEl.parentNode.appendChild(styleSectionEl);
            }
        }
    };

    // Copy function
    elements.copyBtn.onclick = () => {
        if (!elements.output.value) return;
        navigator.clipboard.writeText(elements.output.value);
        const originalText = elements.copyBtn.innerText;
        elements.copyBtn.innerText = "COPIED!";
        setTimeout(() => elements.copyBtn.innerText = originalText, 2000);
    };

    // Generate
    elements.generateBtn.onclick = async () => {
        if (state.usage.limitReached) {
            showModal();
            return;
        }

        const isImageToPrompt = state.selectedPromptType === "Image to Prompt";
        let res;
        let payload;
        let isMultipart = false;
        
        if (isImageToPrompt) {
            if (!state.imageToPromptFile) {
                return toastManager.show("Please upload an image first!", "error");
            }
            
            payload = new FormData();
            payload.append('image', state.imageToPromptFile);
            payload.append('promptType', state.selectedPromptType);
            payload.append('format', state.selectedFormat);
            isMultipart = true;
            
            // Show scan animation
            const scanLine = document.getElementById("imageScanLine");
            if (scanLine) scanLine.classList.remove('hidden');
        } else {
            const idea = elements.idea.value || "Futuristic masterpiece";
            payload = JSON.stringify({
                idea,
                format: state.selectedFormat,
                category: state.selectedPromptType === "Image Prompt" ? state.selectedSubPromptType : "General",
                subStyle: state.selectedSub,
                promptType: state.selectedPromptType,
                subPromptType: state.selectedPromptType === "Image Prompt" ? "Image Generation" : state.selectedSubPromptType,
                model: state.selectedModel
            });
        }

        elements.output.value = isImageToPrompt ? "Analyzing visual layers..." : "Processing quantum algorithms...";
        elements.generateBtn.innerText = isImageToPrompt ? "ANALYZING..." : "GENERATING...";
        elements.generateBtn.disabled = true;

        try {
            const headers = {};
            if (!isMultipart) {
                headers["Content-Type"] = "application/json";
            }
            headers["X-CSRFToken"] = getCookie('csrftoken');

            res = await fetch("/generate/", {
                method: "POST",
                headers: headers,
                body: payload
            });

            if (res.status === 403) {
                state.usage.limitReached = true;
                state.usage.remaining = 0;
                updateUI();
                showModal();
                return;
            }

            const result = await res.json();
            if (result.success) {
                let text = result.output;
                elements.output.value = "";
                let index = 0;
                
                if (isImageToPrompt && result.temp_image_url) {
                    state.imageToPromptTempUrl = result.temp_image_url;
                }
                
                const typeWriter = () => {
                    if (index < text.length) {
                        elements.output.value += text.charAt(index);
                        index++;
                        setTimeout(typeWriter, 5);
                    }
                };
                typeWriter();

                state.usage.remaining = result.remaining;
                state.usage.limitReached = result.limit_reached;
                updateUI();
            } else {
                elements.output.value = "Error: " + result.error;
            }
        } catch (err) {
            console.error("Generation Error:", err);
            elements.output.value = "Connection error. Please check your network or try again.";
        } finally {
            const scanLine = document.getElementById("imageScanLine");
            if (scanLine) scanLine.classList.add('hidden');
            
            elements.generateBtn.innerHTML = isImageToPrompt ? `
                ANALYZE IMAGE
                <svg class="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3"
                        d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ` : `
                GENERATE PROMPT
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3"
                        d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            `;
            elements.generateBtn.disabled = state.usage.limitReached;
        }
    };

    // Global Keyboard Listeners
    document.addEventListener('keydown', (e) => {
        const modals = [
            {
                id: 'authModal', hide: () => authManager.hide(), primary: () => {
                    const section = authManager.sections.find(s => !document.getElementById(`${s}Section`).classList.contains('hidden'));
                    document.getElementById(`${section}Btn`)?.click();
                }
            },
            { id: 'viewPromptModal', hide: () => dashboardManager.hideViewModal(), primary: null },
            { id: 'reportModal', hide: () => socialManager.hideReportModal(), primary: () => document.getElementById("submitReportBtn")?.click() },
            { id: 'editCommentModal', hide: () => socialManager.hideEditModal(), primary: () => document.getElementById("saveCommentBtn")?.click() },
            {
                id: 'saveModal', hide: () => dashboardManager.hideSaveModal(), primary: () => {
                    const btn = document.querySelector('#saveModal button.bg-blue-600');
                    btn?.click();
                }
            }
        ];

        const active = modals.find(m => {
            const el = document.getElementById(m.id);
            return el && !el.classList.contains('hidden');
        });

        if (!active) return;

        if (e.key === 'Escape') {
            active.hide();
        } else if (e.key === 'Enter') {
            // Prevent enter if it's a textarea (allow newlines)
            if (e.target.tagName === 'TEXTAREA') return;

            if (active.primary) {
                e.preventDefault();
                active.primary();
            }
        }
    });


    window.profileManager = {
        show: async (username) => {
            try {
                const response = await fetch(`/accounts/profile/${encodeURIComponent(username)}/`);
                const data = await response.json();
                if (!data.success) throw new Error(data.error);

                navManager.showSection('profileSection');
                
                document.getElementById("p_username").textContent = data.profile.username;
                document.getElementById("p_joined").textContent = `MEMBER SINCE ${new Date(data.profile.joined_at).toLocaleDateString('en-US', {month: 'long', year: 'numeric'}).toUpperCase()}`;
                document.getElementById("p_bio").textContent = data.profile.bio || "No bio added yet.";
                document.getElementById("p_location").textContent = data.profile.location || "Earth";
                document.getElementById("p_followers").textContent = data.profile.follower_count;
                document.getElementById("p_following").textContent = data.profile.following_count;
                
                const pAvatar = document.getElementById("p_avatar");
                const pPlaceholder = document.getElementById("p_avatar_placeholder");
                if (data.profile.avatar) {
                    pAvatar.src = data.profile.avatar;
                    pAvatar.classList.remove('hidden');
                    pPlaceholder.classList.add('hidden');
                } else {
                    pAvatar.classList.add('hidden');
                    pPlaceholder.classList.remove('hidden');
                    document.getElementById("p_initial").textContent = data.profile.username[0].toUpperCase();
                }

                document.getElementById("p_edit_btn").classList.toggle('hidden', !data.is_owner);
                document.getElementById("p_edit_avatar_btn").classList.toggle('hidden', !data.is_owner);
                document.getElementById("p_follow_btn").classList.toggle('hidden', data.is_owner);
                
                profileManager.renderArtworks(data.artworks);
                profileManager.renderPrompts(data.prompts);
                profileManager.switchTab('artworks');

            } catch (err) {
                toastManager.show(err.message, 'error');
            }
        },

        showMine: () => {
            if (!state.user) return authManager.show('login');
            profileManager.show(state.user.username);
        },

        switchTab: (tab) => {
            const tabs = ['artworks', 'prompts'];
            tabs.forEach(t => {
                document.getElementById(`p_tab_${t}`).classList.toggle('text-white', t === tab);
                document.getElementById(`p_tab_${t}`).classList.toggle('border-blue-500', t === tab);
                document.getElementById(`p_tab_${t}`).classList.toggle('border-transparent', t !== tab);
                document.getElementById(`p_tab_${t}`).classList.toggle('text-zinc-500', t !== tab);
                document.getElementById(`p_grid_${t}`).classList.toggle('hidden', t !== tab);
            });
        },

        renderArtworks: (artworks) => {
            const grid = document.getElementById("p_grid_artworks");
            grid.innerHTML = artworks.length ? '' : '<div class="col-span-full py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">No public artworks found</div>';
            artworks.forEach(art => {
                grid.innerHTML += `
                    <div class="group relative aspect-square rounded-3xl overflow-hidden border border-white/5 bg-zinc-900/50">
                        <img src="/media/${art.image}" class="w-full h-full object-cover transition-transform group-hover:scale-110" alt="${art.title}">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all p-6 flex flex-col justify-end">
                            <p class="text-xs font-black keep-white uppercase tracking-tight truncate">${art.title}</p>
                        </div>
                    </div>
                `;
            });
        },

        renderPrompts: (prompts) => {
            const grid = document.getElementById("p_grid_prompts");
            grid.innerHTML = prompts.length ? '' : '<div class="col-span-full py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">No public prompts found</div>';
            prompts.forEach(p => {
                grid.innerHTML += `
                    <div class="flex flex-col h-full p-6 rounded-[2rem] bg-white/5 border border-white/10 space-y-4">
                        <div class="flex justify-between">
                            <span class="text-[8px] font-black text-blue-400 uppercase tracking-widest px-2 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20">${p.category}</span>
                            <span class="text-[8px] text-zinc-600 font-bold">${new Date(p.created_at).toLocaleDateString()}</span>
                        </div>
                        <h4 class="text-sm font-black text-white uppercase tracking-tight">${p.title}</h4>
                    </div>
                `;
            });
        }
    };

    window.settingsManager = {
        show: async (tab = 'profile') => {
            if (!state.user) return authManager.show('login');
            navManager.showSection('settingsSection');
            
            try {
                const response = await fetch(`/accounts/profile/${encodeURIComponent(state.user.username)}/`);
                const data = await response.json();
                
                if (data.success) {
                    document.getElementById("s_bio").value = data.profile.bio || '';
                    document.getElementById("s_location").value = data.profile.location || '';
                    document.getElementById("s_website").value = data.profile.website || '';
                    document.getElementById("s_username").value = data.profile.username;
                    document.getElementById("s_email").value = state.user.email;
                    
                    document.getElementById("s_hide_activity").checked = data.settings.hide_activity;
                    document.getElementById("s_hide_artworks").checked = data.settings.hide_artworks;
                    document.getElementById("s_hide_history").checked = data.settings.hide_history;

                    const sPreview = document.getElementById("s_avatar_preview");
                    const sPlaceholder = document.getElementById("s_avatar_placeholder");

                    // Sync local state
                    if (data.profile.avatar) {
                        state.user.avatar = data.profile.avatar;
                        authManager.updateUI();
                        
                        sPreview.src = data.profile.avatar;
                        sPreview.classList.remove('hidden');
                        sPlaceholder.classList.add('hidden');
                    } else {
                        sPreview.classList.add('hidden');
                        sPlaceholder.classList.remove('hidden');
                        document.getElementById("s_initial").textContent = data.profile.username[0].toUpperCase();
                    }
                }
            } catch (err) { toastManager.show(err.message, 'error'); }
            
            settingsManager.switchTab(tab);
        },

        switchTab: (tab) => {
            const tabs = ['profile', 'account', 'privacy'];
            tabs.forEach(t => {
                document.getElementById(`s_tab_${t}`).classList.toggle('bg-blue-600', t === tab);
                document.getElementById(`s_tab_${t}`).classList.toggle('text-white', t === tab);
                document.getElementById(`s_tab_${t}`).classList.toggle('text-zinc-500', t !== tab);
                document.getElementById(`s_tab_${t}`).classList.toggle('hover:bg-white/5', t !== tab);
                document.getElementById(`s_content_${t}`).classList.toggle('hidden', t !== tab);
            });
        },

        previewAvatar: async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const sPreview = document.getElementById("s_avatar_preview");
                const sPlaceholder = document.getElementById("s_avatar_placeholder");
                sPreview.src = e.target.result;
                sPreview.classList.remove('hidden');
                sPlaceholder.classList.add('hidden');
            };
            reader.readAsDataURL(file);

            const formData = new FormData();
            formData.append('avatar', file);

            try {
                const response = await fetch('/accounts/profile/avatar/', {
                    method: 'POST',
                    body: formData,
                    headers: { 'X-CSRFToken': getCookie('csrftoken') }
                });
                const data = await response.json();
                if (data.success) {
                    toastManager.show('Avatar updated!', 'success');
                    await authManager.checkStatus();
                } else throw new Error(data.error);
            } catch (err) { toastManager.show(err.message, 'error'); }
        },

        saveProfile: async () => {
            const bio = document.getElementById("s_bio").value;
            const location = document.getElementById("s_location").value;
            const website = document.getElementById("s_website").value;

            try {
                const response = await fetch('/accounts/profile/update/', {
                    method: 'POST',
                    body: JSON.stringify({ bio, location, website }),
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') }
                });
                const data = await response.json();
                if (data.success) toastManager.show('Profile saved!', 'success');
                else throw new Error(data.error);
            } catch (err) { toastManager.show(err.message, 'error'); }
        },

        saveAccount: async () => {
            const current_password = document.getElementById("s_current_password").value;
            const username = document.getElementById("s_username").value;
            const email = document.getElementById("s_email").value;
            const new_password = document.getElementById("s_new_password").value;
            const confirm_password = document.getElementById("s_confirm_password").value;

            if (!current_password) return toastManager.show('Current password required!', 'error');
            if (new_password && new_password !== confirm_password) return toastManager.show('Passwords do not match!', 'error');

            try {
                const response = await fetch('/accounts/account/update/', {
                    method: 'POST',
                    body: JSON.stringify({ current_password, username, email, new_password }),
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') }
                });
                const data = await response.json();
                if (data.success) {
                    toastManager.show('Account updated!', 'success');
                    document.getElementById("s_current_password").value = '';
                    if (username !== state.user.username) window.location.reload();
                    else await authManager.checkStatus();
                } else throw new Error(data.error);
            } catch (err) { toastManager.show(err.message, 'error'); }
        },

        savePrivacy: async () => {
            const hide_activity = document.getElementById("s_hide_activity").checked;
            const hide_artworks = document.getElementById("s_hide_artworks").checked;
            const hide_history = document.getElementById("s_hide_history").checked;

            try {
                const response = await fetch('/accounts/profile/update/', {
                    method: 'POST',
                    body: JSON.stringify({ hide_activity, hide_artworks, hide_history }),
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') }
                });
                const data = await response.json();
                if (data.success) toastManager.show('Privacy settings saved!', 'success');
                else throw new Error(data.error);
            } catch (err) { toastManager.show(err.message, 'error'); }
        }
    };
    init();
});
