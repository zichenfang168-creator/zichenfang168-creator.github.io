// comments.js

// Initialize Supabase client
// REPLACE 'YOUR_SUPABASE_ANON_KEY' WITH YOUR ACTUAL PUBLIC KEY FROM SUPABASE DASHBOARD
const supabaseUrl = 'https://smlmbqzperdkazkmuroy.supabase.co';
const supabaseAnonKey = 'sb_publishable__QYASfvhAe8dre9r9Hccfw_ocyG6eKA'; // TODO: Replace with your actual Anon Key
const supabase = new SupabaseClient(supabaseUrl, supabaseAnonKey);
supabase.signIn('test@test.com', 'test');

// State
let currentUser = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    loadComments();
});

// Auth Functions
function checkSession() {
    const userJson = localStorage.getItem('tripPlannerUser');
    if (userJson) {
        currentUser = JSON.parse(userJson);
        updateUIForLoggedInUser();
    } else {
        updateUIForLoggedOutUser();
    }
}

function updateUIForLoggedInUser() {
    document.getElementById('authButtons').style.display = 'none';
    document.getElementById('userControls').style.display = 'block';
    document.getElementById('userGreeting').textContent = `Welcome, ${currentUser.nickname}`;
    
    document.getElementById('commentInputSection').style.display = 'block';
    document.getElementById('loginPrompt').style.display = 'none';
}

function updateUIForLoggedOutUser() {
    document.getElementById('authButtons').style.display = 'block';
    document.getElementById('userControls').style.display = 'none';
    
    document.getElementById('commentInputSection').style.display = 'none';
    document.getElementById('loginPrompt').style.display = 'block';
}

function logout() {
    localStorage.removeItem('tripPlannerUser');
    currentUser = null;
    updateUIForLoggedOutUser();
    alert('Logged out successfully');
}

// Modal Functions
function openRegisterForm() {
    document.getElementById('registerModal').style.display = 'block';
}

function closeRegisterForm() {
    document.getElementById('registerModal').style.display = 'none';
}

function openLoginForm() {
    document.getElementById('loginModal').style.display = 'block';
}

function closeLoginForm() {
    document.getElementById('loginModal').style.display = 'none';
}

function toggleBusinessFields() {
    const type = document.getElementById('accountType').value;
    const businessFields = document.getElementById('businessFields');
    if (type === 'business') {
        businessFields.style.display = 'block';
        document.getElementById('businessName').required = true;
    } else {
        businessFields.style.display = 'none';
        document.getElementById('businessName').required = false;
    }
}

// Window click to close modals
window.onclick = function(event) {
    const registerModal = document.getElementById('registerModal');
    const loginModal = document.getElementById('loginModal');
    if (event.target == registerModal) {
        closeRegisterForm();
    }
    if (event.target == loginModal) {
        closeLoginForm();
    }
}

// Auth Handlers
async function handleRegister(event) {
    event.preventDefault();
    const nickname = document.getElementById('nickname').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const type = document.getElementById('accountType').value;
    const businessName = document.getElementById('businessName').value;

    try {
        // Check if user already exists
        const existingUsers = await supabase.query('users', { nickname: nickname });
        if (existingUsers && existingUsers.length > 0) {
            alert('Nickname already taken');
            return;
        }

        const newUser = {
            nickname: nickname,
            email: email,
            password: password, // In a real app, hash this!
            role: type,
            business_name: type === 'business' ? businessName : null,
            created_at: new Date().toISOString()
        };

        const result = await supabase.insert('users', newUser);
        
        // Supabase REST insert returns array of inserted records
        if (result && result.length > 0) {
            alert('Registration successful! Please login.');
            closeRegisterForm();
        } else {
            // Fallback for mock environment or if return=representation not set
             alert('Registration request sent. Please try logging in.');
             closeRegisterForm();
        }

    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed: ' + error.message);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const nickname = document.getElementById('loginNickname').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const users = await supabase.query('users', { nickname: nickname, password: password });
        
        if (users && users.length > 0) {
            currentUser = users[0];
            localStorage.setItem('tripPlannerUser', JSON.stringify(currentUser));
            updateUIForLoggedInUser();
            closeLoginForm();
            alert('Login successful!');
        } else {
            alert('Invalid nickname or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
}

// Comment Functions
async function loadComments() {
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '<p>Loading comments...</p>';

    try {
        // Fetch comments ordered by date (descending)
        // Note: Our supabase client might need update to support order properly if not working
        const comments = await supabase.read('comments', { 
            order: { column: 'created_at', direction: 'desc' },
            limit: 50
        });

        commentsList.innerHTML = '';

        if (!comments || comments.length === 0) {
            commentsList.innerHTML = '<p>No comments yet. Be the first to share!</p>';
            return;
        }

        comments.forEach(comment => {
            const date = new Date(comment.created_at).toLocaleDateString();
            const isBusiness = comment.user_role === 'business';
            
            const card = document.createElement('div');
            card.className = 'comment-card';
            card.innerHTML = `
                <div class="comment-header">
                    <div class="comment-author">
                        ${escapeHtml(comment.user_nickname)}
                        ${isBusiness ? '<span class="business-badge">Shop Owner</span>' : ''}
                    </div>
                    <div class="comment-date">${date}</div>
                </div>
                <div class="comment-body">
                    ${escapeHtml(comment.content)}
                </div>
            `;
            commentsList.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading comments:', error);
        commentsList.innerHTML = '<p>Error loading comments. Please try again later.</p>';
    }
}

async function submitComment() {
    if (!currentUser) {
        alert('Please login to post a comment');
        return;
    }

    const textarea = document.getElementById('commentText');
    const content = textarea.value.trim();

    if (!content) {
        alert('Please write something!');
        return;
    }

    try {
        const newComment = {
            user_id: currentUser.id,
            user_nickname: currentUser.nickname,
            user_role: currentUser.role,
            content: content,
            created_at: new Date().toISOString()
        };

        await supabase.insert('comments', newComment);
        
        textarea.value = '';
        loadComments(); // Reload comments to show the new one
        alert('Comment posted!');

    } catch (error) {
        console.error('Error posting comment:', error);
        alert('Failed to post comment: ' + error.message);
    }
}

// Utility
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

