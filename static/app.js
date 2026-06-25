// MedTracker - Client Dashboard Logic

// State Management
let state = {
    selectedDate: getCentralDateString(new Date()),
    checklist: {
        morning_meds: false,
        evening_meds: false,
        morning_inject: false,
        morning_meds_taken_at: null,
        evening_meds_taken_at: null,
        morning_inject_taken_at: null
    },
    mealInjections: []
};

// DOM Elements
const dateInput = document.getElementById('current-date-input');
const dateDisplay = document.getElementById('current-date-display');
const prevDayBtn = document.getElementById('prev-day-btn');
const nextDayBtn = document.getElementById('next-day-btn');
const todayBtn = document.getElementById('today-btn');
const checklistCompletionBadge = document.getElementById('checklist-completion-badge');
const mealCountBadge = document.getElementById('meal-count-badge');
const mealLogsList = document.getElementById('meal-logs-list');
const customNoteInput = document.getElementById('custom-note-input');
const customLogBtn = document.getElementById('custom-log-btn');
const historyGrid = document.getElementById('history-grid');
const toastEl = document.getElementById('toast');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Set initial date picker value
    dateInput.value = state.selectedDate;
    updateDateDisplay();
    
    // Event Listeners for Date Navigation
    dateInput.addEventListener('change', (e) => {
        state.selectedDate = e.target.value;
        updateDateDisplay();
        fetchDayData();
    });
    
    prevDayBtn.addEventListener('click', () => adjustDate(-1));
    nextDayBtn.addEventListener('click', () => adjustDate(1));
    todayBtn.addEventListener('click', () => {
        const todayStr = getCentralDateString(new Date());
        if (state.selectedDate !== todayStr) {
            state.selectedDate = todayStr;
            dateInput.value = todayStr;
            updateDateDisplay();
            fetchDayData();
        }
    });

    // Event Listeners for Checklist Toggle
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = btn.getAttribute('data-item');
            toggleChecklistItem(item);
        });
    });

    // Event Listeners for Meal Injections
    document.querySelectorAll('.quick-log-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const note = btn.getAttribute('data-note');
            addMealInjection(note);
        });
    });

    customLogBtn.addEventListener('click', () => {
        const note = customNoteInput.value.trim();
        if (note) {
            addMealInjection(note);
            customNoteInput.value = '';
        } else {
            showToast('Please enter a note for custom log');
        }
    });

    customNoteInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            customLogBtn.click();
        }
    });

    // Initial Load
    fetchDayData();
    fetchHistory();
});

// Helper: Get US/Central date string YYYY-MM-DD
function getCentralDateString(date) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    return `${year}-${month}-${day}`;
}

// Helper: Adjust date string by offset (+1 or -1 days) in a timezone-agnostic way
function adjustDateString(dateStr, offsetDays) {
    const parts = dateStr.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    date.setDate(date.getDate() + offsetDays);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Format date for display
function formatDateDisplay(dateStr) {
    const todayStr = getCentralDateString(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getCentralDateString(yesterday);

    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';

    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString(undefined, options);
}

// Update the Date header UI
function updateDateDisplay() {
    dateDisplay.textContent = formatDateDisplay(state.selectedDate);
}

// Adjust date by offset (+1 or -1)
function adjustDate(offset) {
    const newDateStr = adjustDateString(state.selectedDate, offset);
    state.selectedDate = newDateStr;
    dateInput.value = newDateStr;
    updateDateDisplay();
    fetchDayData();
}

// API: Fetch all status and logs for selected day
async function fetchDayData() {
    try {
        const response = await fetch(`/api/status?date=${state.selectedDate}`);
        if (!response.ok) throw new Error('Failed to fetch status');
        
        const data = await response.json();
        state.checklist = data.checklist;
        state.mealInjections = data.meal_injections;
        
        renderChecklist();
        renderMealInjections();
        fetchHistory(); // Keep history up to date with changes
    } catch (error) {
        console.error(error);
        showToast('Error loading day data');
    }
}

// Render Checklist Card UI
function renderChecklist() {
    let completedCount = 0;
    const items = ['morning_meds', 'evening_meds', 'morning_inject'];
    
    items.forEach(itemKey => {
        const cardEl = document.getElementById(`item-${itemKey}`);
        const isTaken = state.checklist[itemKey];
        const takenAt = state.checklist[`${itemKey}_taken_at`];
        
        const timeEl = cardEl.querySelector('.time-taken');
        const statusEl = cardEl.querySelector('.status-text');
        const actionBtn = cardEl.querySelector('.toggle-btn');
        
        if (isTaken) {
            completedCount++;
            cardEl.classList.add('taken');
            statusEl.textContent = 'Completed';
            actionBtn.innerHTML = '<span class="btn-check"></span>Undo Check';
            if (takenAt) {
                timeEl.textContent = `Taken at ${formatTime(takenAt)}`;
            } else {
                timeEl.textContent = '';
            }
        } else {
            cardEl.classList.remove('taken');
            statusEl.textContent = 'Pending';
            timeEl.textContent = '';
            actionBtn.innerHTML = '<span class="btn-check"></span>Mark Taken';
        }
    });
    
    checklistCompletionBadge.textContent = `${completedCount} / 3 Done`;
    if (completedCount === 3) {
        checklistCompletionBadge.style.color = '#10b981';
        checklistCompletionBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    } else {
        checklistCompletionBadge.style.color = '#38bdf8';
        checklistCompletionBadge.style.borderColor = 'rgba(56, 189, 248, 0.2)';
    }
}

// Render Meal Injections Card UI
function renderMealInjections() {
    mealCountBadge.textContent = `${state.mealInjections.length} Logged`;
    
    if (state.mealInjections.length === 0) {
        mealLogsList.innerHTML = '<div class="empty-state">No mealtime injections logged for this day.</div>';
        return;
    }
    
    mealLogsList.innerHTML = '';
    state.mealInjections.forEach(log => {
        const logItem = document.createElement('div');
        logItem.className = 'log-item';
        
        const timeStr = formatTime(log.timestamp);
        
        logItem.innerHTML = `
            <div class="log-item-details">
                <span class="log-badge">💉 Injection</span>
                <span class="log-time">${timeStr}</span>
                ${log.note ? `<span class="log-note">• ${escapeHtml(log.note)}</span>` : ''}
            </div>
            <button class="delete-btn" data-id="${log.id}" title="Delete Log">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
            </button>
        `;
        
        // Add Delete Event Listener
        logItem.querySelector('.delete-btn').addEventListener('click', () => {
            deleteMealInjection(log.id);
        });
        
        mealLogsList.appendChild(logItem);
    });
}

// API: Toggle Checklist Item
async function toggleChecklistItem(item) {
    try {
        const response = await fetch('/api/checklist/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: state.selectedDate,
                item: item
            })
        });
        
        if (!response.ok) throw new Error('Toggle failed');
        
        const updatedChecklist = await response.json();
        state.checklist = updatedChecklist;
        renderChecklist();
        fetchHistory();
        
        const friendlyName = item.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const stateStr = updatedChecklist[item] ? 'completed' : 'pending';
        showToast(`${friendlyName} marked as ${stateStr}`);
    } catch (error) {
        console.error(error);
        showToast('Failed to update checklist');
    }
}

// API: Log a new meal injection
async function addMealInjection(note) {
    try {
        const response = await fetch('/api/meal-injections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: state.selectedDate,
                note: note
            })
        });
        
        if (!response.ok) throw new Error('Failed to log injection');
        
        const newLog = await response.json();
        state.mealInjections.push(newLog);
        renderMealInjections();
        fetchHistory();
        showToast(`Meal injection logged (${note || 'No Note'})`);
    } catch (error) {
        console.error(error);
        showToast('Failed to log meal injection');
    }
}

// API: Delete a meal injection log
async function deleteMealInjection(id) {
    try {
        const response = await fetch(`/api/meal-injections/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete log');
        
        state.mealInjections = state.mealInjections.filter(log => log.id !== id);
        renderMealInjections();
        fetchHistory();
        showToast('Meal injection log deleted');
    } catch (error) {
        console.error(error);
        showToast('Failed to delete log');
    }
}

// API: Fetch 7-Day History and Render
async function fetchHistory() {
    try {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 6); // Last 7 days
        
        const startStr = getCentralDateString(start);
        const endStr = getCentralDateString(end);
        
        const response = await fetch(`/api/history?start_date=${startStr}&end_date=${endStr}`);
        if (!response.ok) throw new Error('History fetch failed');
        
        const historyData = await response.json();
        renderHistory(historyData);
    } catch (error) {
        console.error(error);
    }
}

// Render History Section Grid
function renderHistory(historyData) {
    historyGrid.innerHTML = '';
    
    // Sort chronological ascending (oldest first)
    historyData.sort((a, b) => a.date.localeCompare(b.date));
    
    const todayStr = getCentralDateString(new Date());
    
    historyData.forEach(day => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'history-day';
        if (day.date === todayStr) {
            dayDiv.classList.add('is-today');
        }
        
        // Parse date for display
        const dateObj = new Date(day.date + 'T00:00:00');
        const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
        const dateNum = dateObj.toLocaleDateString(undefined, { day: 'numeric' });
        
        // Checklist completeness dots
        const check = day.checklist;
        const mmClass = check.morning_meds ? 'checked' : '';
        const emClass = check.evening_meds ? 'checked' : '';
        const miClass = check.morning_inject ? 'checked' : '';
        
        dayDiv.innerHTML = `
            <span class="day-name">${day.date === todayStr ? 'Today' : dayName}</span>
            <span class="day-date">${dateNum}</span>
            <div class="day-indicators" title="Morning Meds, Evening Meds, Morning Inject">
                <span class="day-indicator ${mmClass}" title="Morning Meds"></span>
                <span class="day-indicator ${emClass}" title="Evening Meds"></span>
                <span class="day-indicator ${miClass}" title="Morning Inject"></span>
            </div>
            ${day.meal_injections_count > 0 ? `<span class="day-injects">💉 x${day.meal_injections_count}</span>` : '<span style="font-size: 0.75rem; color: var(--text-muted);">None</span>'}
        `;
        
        // Make grid item clickable to navigation to that day
        dayDiv.style.cursor = 'pointer';
        dayDiv.addEventListener('click', () => {
            state.selectedDate = day.date;
            dateInput.value = day.date;
            updateDateDisplay();
            fetchDayData();
            // Scroll smooth to top on mobile
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        historyGrid.appendChild(dayDiv);
    });
}

// Utilities

// Format datetime string to US/Central time (hh:mm AM/PM)
function formatTime(isoStr) {
    if (!isoStr) return '';
    try {
        // If the string doesn't indicate a timezone offset or UTC, assume it is UTC
        let parsedStr = isoStr;
        if (!isoStr.endsWith('Z') && !isoStr.match(/[+-]\d{2}:\d{2}$/)) {
            parsedStr = isoStr + 'Z';
        }
        const date = new Date(parsedStr);
        return date.toLocaleTimeString(undefined, {
            timeZone: 'America/Chicago',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        return '';
    }
}

// Toast notification trigger
let toastTimeout;
function showToast(message) {
    clearTimeout(toastTimeout);
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    
    toastTimeout = setTimeout(() => {
        toastEl.classList.add('hidden');
    }, 3000);
}

// Safe html escape
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
