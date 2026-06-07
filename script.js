const API_URL = '/api/tasks';

// DOM Elements
const taskTableBody = document.getElementById('task-table-body');
const teamList = document.getElementById('team-list');
const taskSearch = document.getElementById('task-search');
const topSearch = document.querySelector('.search-container input');
const statusIndicator = document.getElementById('connection-status');

// App State
let isOfflineMode = false;
let allTasks = []; // Global tasks state

// Create Toast Container
const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Mock Data for Team
let mockTeam = [
    { name: 'Steve Wuckert', email: 'steve@gmail.com', status: 'Complete', avatar: 'https://i.pravatar.cc/150?u=steve' },
    { name: 'Carlton Littel', email: 'carlton@yahoo.com', status: 'In progress', avatar: 'https://i.pravatar.cc/150?u=carlton' },
    { name: 'Ricky Auer', email: 'ricky@hotmail.com', status: 'Pending', avatar: 'https://i.pravatar.cc/150?u=ricky' },
    { name: 'Terrence Marvin', email: 'terrence@gmail.com', status: 'Complete', avatar: 'https://i.pravatar.cc/150?u=terrence' },
    { name: 'Kenneth Donnelly', email: 'kenneth@yahoo.com', status: 'In progress', avatar: 'https://i.pravatar.cc/150?u=kenneth' }
];

// --- CORE FUNCTIONALITY ---

function updateConnectionStatus(online) {
    if (online) {
        statusIndicator.className = 'status-indicator online';
        statusIndicator.querySelector('.status-text').textContent = 'Server Connected';
        isOfflineMode = false;
    } else {
        statusIndicator.className = 'status-indicator offline';
        statusIndicator.querySelector('.status-text').textContent = 'Offline Mode (Local Storage)';
        isOfflineMode = true;
        if (allTasks.length === 0) {
            const saved = localStorage.getItem('taskmaster_tasks');
            allTasks = saved ? JSON.parse(saved) : [
                { id: 1, title: 'Learn Taskmaster UI', completed: true },
                { id: 2, title: 'Connect to Java Backend', completed: false }
            ];
        }
    }
}

// Fetch and render tasks
async function fetchTasks() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Server error');
        const tasks = await response.json();
        allTasks = tasks; // Store globally
        updateConnectionStatus(true);
        renderTasks(tasks);
        updateStats(tasks);
        if (!document.getElementById('calendar-view').classList.contains('hidden')) {
            renderCalendar();
        }
    } catch (error) {
        console.warn('Backend unavailable, switching to local mode');
        updateConnectionStatus(false);
        const saved = localStorage.getItem('taskmaster_tasks');
        allTasks = saved ? JSON.parse(saved) : [
            { id: 1, title: 'Learn Taskmaster UI', completed: true },
            { id: 2, title: 'Connect to Java Backend', completed: false }
        ];
        renderTasks(allTasks);
        updateStats(allTasks);
        if (!document.getElementById('calendar-view').classList.contains('hidden')) {
            renderCalendar();
        }
    }
}

function renderTasks(tasks) {
    taskTableBody.innerHTML = '';
    tasks.forEach((task, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox"></td>
            <td><span class="task-id-badge">#${task.id.toString().slice(-4)}</span></td>
            <td><strong>${task.title}</strong></td>
            <td>user${index}@example.com</td>
            <td><span class="dept-badge">Development</span></td>
            <td>
                <span class="status-pill ${task.completed ? 'completed' : 'pending'}">
                    ${task.completed ? 'Completed' : 'Pending'}
                </span>
            </td>
            <td>
                <div class="table-action-btns">
                    <button class="icon-action" onclick="toggleTask(${task.id}, ${task.completed})">
                        <i data-lucide="${task.completed ? 'rotate-ccw' : 'check-circle'}"></i>
                    </button>
                    <button class="icon-action delete" onclick="deleteTask(${task.id})">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        `;
        taskTableBody.appendChild(tr);
    });
    lucide.createIcons();
}

function renderTeam() {
    // Update Dashboard Team List
    if (teamList) {
        teamList.innerHTML = '';
        mockTeam.slice(0, 5).forEach(member => {
            const div = document.createElement('div');
            div.className = 'team-member';
            div.innerHTML = `
                <img src="${member.avatar}" alt="${member.name}" class="member-avatar">
                <div class="member-info">
                    <span class="member-name">${member.name}</span>
                    <span class="member-email">${member.email}</span>
                </div>
                <span class="status-badge ${getStatusClass(member.status)}">${member.status}</span>
            `;
            teamList.appendChild(div);
        });
    }

    // Update Full Team View
    const teamViewList = document.getElementById('team-view-list');
    if (teamViewList) {
        teamViewList.innerHTML = '';
        mockTeam.forEach(member => {
            const div = document.createElement('div');
            div.className = 'team-card';
            div.innerHTML = `
                <img src="${member.avatar}" alt="${member.name}" class="member-avatar">
                <h4 class="member-name">${member.name}</h4>
                <p class="member-email">${member.email}</p>
                <span class="status-badge ${getStatusClass(member.status)}">${member.status}</span>
            `;
            teamViewList.appendChild(div);
        });
    }
}

function getStatusClass(status) {
    if (status === 'Complete') return 'status-complete';
    if (status === 'In progress') return 'status-progress';
    return 'status-pending';
}

function updateStats(tasks) {
    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;
    const pendingCount = totalCount - completedCount;
    
    document.getElementById('total-projects').textContent = totalCount;
    document.getElementById('completed-projects').textContent = completedCount;
    document.getElementById('running-projects').textContent = pendingCount;
    document.getElementById('pending-projects').textContent = Math.floor(pendingCount / 2);

    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    // Update all progress charts (Dashboard and Analytics)
    document.querySelectorAll('.donut-inner .percent').forEach(el => el.textContent = `${percent}%`);
    document.querySelectorAll('.donut-chart').forEach(el => {
        el.style.background = `conic-gradient(var(--primary) 0% ${percent}%, var(--primary-light) ${percent}% 80%, #f1f5f9 80% 100%)`;
    });
}

// --- BUTTON ACTIONS ---

async function addTask(title, date = null) {
    if (!title) title = prompt("Enter project title:");
    if (!title || !title.trim()) return;

    const taskData = { title };
    if (date) taskData.date = date;

    if (isOfflineMode) {
        const newTask = { id: Date.now(), ...taskData, completed: false };
        allTasks.push(newTask);
        localStorage.setItem('taskmaster_tasks', JSON.stringify(allTasks));
        renderTasks(allTasks);
        updateStats(allTasks);
        renderCalendar(); // Refresh calendar if visible
        showToast('Added locally (Offline)', 'info');
    } else {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
            if (response.ok) fetchTasks();
        } catch (e) {
            isOfflineMode = true;
            addTask(title, date);
        }
    }
}

async function toggleTask(id, currentStatus) {
    if (isOfflineMode) {
        allTasks = allTasks.map(t => t.id === id ? { ...t, completed: !currentStatus } : t);
        localStorage.setItem('taskmaster_tasks', JSON.stringify(allTasks));
        renderTasks(allTasks);
        updateStats(allTasks);
    } else {
        try {
            await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: !currentStatus })
            });
            fetchTasks();
        } catch (e) {
            isOfflineMode = true;
            toggleTask(id, currentStatus);
        }
    }
}

async function deleteTask(id) {
    if (!confirm('Delete this project?')) return;
    if (isOfflineMode) {
        allTasks = allTasks.filter(t => t.id !== id);
        localStorage.setItem('taskmaster_tasks', JSON.stringify(allTasks));
        renderTasks(allTasks);
        updateStats(allTasks);
    } else {
        try {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            fetchTasks();
        } catch (e) {
            isOfflineMode = true;
            deleteTask(id);
        }
    }
}

async function addMember() {
    const name = prompt("Enter member name:");
    if (!name) return;
    const email = prompt("Enter member email:");
    if (!email) return;

    const newMember = { 
        name, 
        email, 
        status: 'In progress', 
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random` 
    };
    
    mockTeam.unshift(newMember);
    renderTeam();
    showToast(`Member ${name} added successfully`, 'success');
}

// --- PROFILE SETTINGS ---
let userProfile = {
    name: 'Confidency',
    email: 'confidency@taskmaster.com',
    mobile: '+1 234 567 890'
};

function loadProfileData() {
    const savedProfile = localStorage.getItem('user_profile');
    if (savedProfile) {
        userProfile = JSON.parse(savedProfile);
    }
    
    // Update display
    document.getElementById('display-name').textContent = userProfile.name;
    document.getElementById('display-email').textContent = userProfile.email;
    document.querySelector('.profile-name').textContent = userProfile.name;
    
    const initials = userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('settings-avatar').textContent = initials;
    document.querySelector('.profile-avatar').textContent = initials;
    
    // Update inputs
    document.getElementById('input-name').value = userProfile.name;
    document.getElementById('input-email').value = userProfile.email;
    document.getElementById('input-mobile').value = userProfile.mobile;
}

function resetProfileForm() {
    loadProfileData();
    showToast('Form reset', 'info');
}

document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newName = document.getElementById('input-name').value;
    const newEmail = document.getElementById('input-email').value;
    const newMobile = document.getElementById('input-mobile').value;
    
    if (!newName || !newEmail) {
        showToast('Name and Email are required', 'warning');
        return;
    }
    
    userProfile = {
        name: newName,
        email: newEmail,
        mobile: newMobile
    };
    
    localStorage.setItem('user_profile', JSON.stringify(userProfile));
    loadProfileData();
    showToast('Profile updated successfully', 'success');
});

// --- LOGIN MODAL LOGIC ---
const loginModal = document.getElementById('login-modal');
const signupModal = document.getElementById('signup-modal');
const topAvatarBtn = document.getElementById('top-avatar-btn');

// Mock Database for users
let registeredUsers = JSON.parse(localStorage.getItem('registered_users')) || [];

function openLoginModal() {
    signupModal.classList.add('hidden');
    loginModal.classList.remove('hidden');
}

function closeLoginModal() {
    loginModal.classList.add('hidden');
}

function openSignUpModal() {
    loginModal.classList.add('hidden');
    signupModal.classList.remove('hidden');
}

function closeSignUpModal() {
    signupModal.classList.add('hidden');
}

topAvatarBtn.addEventListener('click', openLoginModal);

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    
    // Check against registered users
    const user = registeredUsers.find(u => (u.name === username || u.email === username) && u.password === pass);
    
    if (user) {
        userProfile.name = user.name;
        userProfile.email = user.email;
        localStorage.setItem('user_profile', JSON.stringify(userProfile));
        loadProfileData();
        closeLoginModal();
        showToast(`Welcome back, ${user.name}!`, 'success');
    } else {
        showToast('Invalid username or password', 'warning');
    }
});

document.getElementById('signup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    if (registeredUsers.some(u => u.email === email)) {
        showToast('Email already registered!', 'warning');
        return;
    }
    
    const newUser = { name, email, password };
    registeredUsers.push(newUser);
    localStorage.setItem('registered_users', JSON.stringify(registeredUsers));
    
    showToast('Account created! Please login.', 'success');
    setTimeout(() => {
        openLoginModal();
    }, 1000);
});

function mockSocialLogin(provider) {
    showToast(`Connecting to ${provider}...`, 'info');
    
    // Simulate Google Sign-In popup
    const width = 500, height = 600;
    const left = (window.innerWidth / 2) - (width / 2);
    const top = (window.innerHeight / 2) - (height / 2);
    
    console.log(`Opening ${provider} auth window...`);
    
    setTimeout(() => {
        userProfile.name = `Google User`;
        userProfile.email = `user@google.com`;
        localStorage.setItem('user_profile', JSON.stringify(userProfile));
        loadProfileData();
        closeLoginModal();
        closeSignUpModal();
        showToast(`Successfully logged in with ${provider}`, 'success');
    }, 1500);
}

// Update existing event bindings
document.querySelector('.btn-ghost').onclick = addMember;
document.querySelector('.sidebar-footer .btn-primary').onclick = () => addTask();
document.querySelector('.btn-logout').addEventListener('click', () => {
    if (confirm('Logout?')) window.location.reload();
});

taskSearch.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const rows = taskTableBody.querySelectorAll('tr');
    rows.forEach(row => row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none');
});

// Sidebar Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        const targetId = item.id;
        if (targetId === 'nav-tasks') {
            switchView('tasks-view');
        } else if (targetId === 'nav-dashboard') {
            switchView('dashboard-view');
        } else if (targetId === 'nav-calendar') {
            switchView('calendar-view');
        } else if (targetId === 'nav-analytics') {
            switchView('analytics-view');
        } else if (targetId === 'nav-team') {
            switchView('team-view');
        } else if (targetId === 'nav-settings') {
            switchView('settings-view');
        } else {
            showToast(`Navigated to ${item.textContent.trim()}`, 'info');
        }
    });
});

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
    });
    
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
        // If switching to tasks, clear search
        if (viewId === 'tasks-view') {
            taskSearch.value = '';
            fetchTasks(); // Refresh tasks
        }
        if (viewId === 'calendar-view') {
            renderCalendar();
        }
        if (viewId === 'settings-view') {
            loadProfileData();
        }
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const viewNames = {
        'tasks-view': 'Tasks Management',
        'dashboard-view': 'Dashboard Overview',
        'calendar-view': 'Calendar',
        'analytics-view': 'Project Analytics',
        'team-view': 'Team Collaboration',
        'settings-view': 'Settings'
    };
    showToast(viewNames[viewId] || 'View Switched', 'info');
}

// --- CALENDAR LOGIC ---
let currentCalendarDate = new Date();

function renderCalendar() {
    const calendarMonthYear = document.getElementById('calendar-month-year');
    const calendarDays = document.getElementById('calendar-days');
    
    if (!calendarMonthYear || !calendarDays) return;

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    
    calendarMonthYear.textContent = `${monthNames[month]} ${year}`;
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    calendarDays.innerHTML = '';
    
    // Helper to format date for comparison
    const formatDate = (y, m, d) => `${y}-${m + 1}-${d}`;

    // Previous month's trailing days
    for (let i = firstDayOfMonth; i > 0; i--) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day other-month';
        const dayNum = prevMonthLastDay - i + 1;
        const prevMonthDate = new Date(year, month - 1, dayNum);
        const dateStr = formatDate(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), dayNum);
        
        dayDiv.innerHTML = `<span class="day-number">${dayNum}</span><div class="day-tasks"></div>`;
        
        // Show tasks for this day
        const dayTasks = allTasks.filter(t => t.date === dateStr);
        const tasksCont = dayDiv.querySelector('.day-tasks');
        dayTasks.forEach(t => {
            const dot = document.createElement('div');
            dot.className = `task-dot ${t.completed ? 'completed' : 'pending'}`;
            dot.title = t.title;
            tasksCont.appendChild(dot);
        });

        dayDiv.addEventListener('click', () => {
            const taskTitle = prompt(`Add task for ${dateStr}:`);
            if (taskTitle && taskTitle.trim()) {
                addTask(taskTitle, dateStr);
                showToast(`Task added for ${dateStr}`, 'success');
            }
        });
        
        calendarDays.appendChild(dayDiv);
    }
    
    // Current month's days
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayDiv.classList.add('today');
        }
        
        const dateStr = formatDate(year, month, i);
        dayDiv.innerHTML = `<span class="day-number">${i}</span><div class="day-tasks"></div>`;
        
        // Show tasks for this day
        const dayTasks = allTasks.filter(t => t.date === dateStr);
        const tasksCont = dayDiv.querySelector('.day-tasks');
        dayTasks.forEach(t => {
            const dot = document.createElement('div');
            dot.className = `task-dot ${t.completed ? 'completed' : 'pending'}`;
            dot.title = t.title;
            tasksCont.appendChild(dot);
        });

        dayDiv.addEventListener('click', () => {
            const taskTitle = prompt(`Add task for ${dateStr}:`);
            if (taskTitle && taskTitle.trim()) {
                addTask(taskTitle, dateStr);
                showToast(`Task added for ${dateStr}`, 'success');
            }
        });
        
        calendarDays.appendChild(dayDiv);
    }
    
    // Next month's leading days
    const totalSlots = 42; 
    const remainingSlots = totalSlots - (firstDayOfMonth + daysInMonth);
    for (let i = 1; i <= remainingSlots; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day other-month';
        const nextMonthDate = new Date(year, month + 1, i);
        const dateStr = formatDate(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), i);
        
        dayDiv.innerHTML = `<span class="day-number">${i}</span><div class="day-tasks"></div>`;
        
        // Show tasks for this day
        const dayTasks = allTasks.filter(t => t.date === dateStr);
        const tasksCont = dayDiv.querySelector('.day-tasks');
        dayTasks.forEach(t => {
            const dot = document.createElement('div');
            dot.className = `task-dot ${t.completed ? 'completed' : 'pending'}`;
            dot.title = t.title;
            tasksCont.appendChild(dot);
        });

        dayDiv.addEventListener('click', () => {
            const taskTitle = prompt(`Add task for ${dateStr}:`);
            if (taskTitle && taskTitle.trim()) {
                addTask(taskTitle, dateStr);
                showToast(`Task added for ${dateStr}`, 'success');
            }
        });
        
        calendarDays.appendChild(dayDiv);
    }
}

// Calendar event bindings
document.addEventListener('DOMContentLoaded', () => {
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const todayBtn = document.getElementById('today-btn');

    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderCalendar();
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            renderCalendar();
        });
    }

    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            currentCalendarDate = new Date();
            renderCalendar();
        });
    }
});

// Initial load
loadProfileData();
fetchTasks();
renderTeam();
lucide.createIcons();
