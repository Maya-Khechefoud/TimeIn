// Load our shared tasks state array from local storage (Client-scoped)
let tasks = JSON.parse(localStorage.getItem('myAppState')) || [];

// HELPER FUNCTIONS FOR REAL-TIME DATES
function formatDateString(dateObj) {
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day} / ${month} / ${year}`;
}

function formatStorageDateKey(dateObj) {
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
}

function parseStorageDateKey(dateStr) {
    if (!dateStr) return new Date();
    const parts = dateStr.split('/');
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
}

// Helper engine: shared with schedule.js to evaluate task presence on active date
function shouldTaskAppearOnDate(task, targetDateObj) {
    const targetDateMidnight = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate());
    const taskStartDate = parseStorageDateKey(task.date);
    const taskStartMidnight = new Date(taskStartDate.getFullYear(), taskStartDate.getMonth(), taskStartDate.getDate());

    // Task cannot appear before creation date
    if (targetDateMidnight < taskStartMidnight) {
        return false;
    }

    // Non-repeating task match
    if (!task.repeatDays || task.repeatDays.length === 0) {
        return formatStorageDateKey(taskStartDate) === formatStorageDateKey(targetDateObj);
    }

    // Repeating task day-of-week match
    const dayOfWeek = targetDateObj.getDay();
    return task.repeatDays.includes(dayOfWeek);
}

// Helper engine: checks completion based on single completion status vs. repeated history array
function isTaskCompletedForDate(task, dateStr) {
    if (!task.repeatDays || task.repeatDays.length === 0) {
        return !!task.completed;
    }
    return Array.isArray(task.completedDates) && task.completedDates.includes(dateStr);
}

// SMART DATE ENGINE: Always launch on today's live date for a fresh session!
let savedDateString = sessionStorage.getItem('activeScheduleDate');
let currentDate;

if (savedDateString && savedDateString !== "25/03/2026" && savedDateString !== "25 / 03 / 2026") {
    currentDate = parseStorageDateKey(savedDateString);
} else {
    currentDate = new Date(); // Fallback straight to today's real system date
    sessionStorage.setItem('activeScheduleDate', formatStorageDateKey(currentDate));
}

document.addEventListener('DOMContentLoaded', () => {
    const datePill = document.querySelector('.date-pill');
    const dateHeaderText = document.querySelector('.date-header-text');
    const prevArrow = document.querySelectorAll('.nav-arrow')[0];
    const nextArrow = document.querySelectorAll('.nav-arrow')[1];
    
    const progressText = document.getElementById('progress-percentage');
    const completedText = document.getElementById('completed-count');
    const uncompletedText = document.getElementById('uncompleted-count');

    function updateTrackerMetrics() {
        const targetDateString = formatStorageDateKey(currentDate);
        sessionStorage.setItem('activeScheduleDate', targetDateString);
        
        if (datePill) {
            datePill.innerText = formatDateString(currentDate);
        }

        if (dateHeaderText) {
            const realToday = new Date();
            const targetDateMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
            const realTodayMidnight = new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate());
            const dayDiff = Math.round((targetDateMidnight.getTime() - realTodayMidnight.getTime()) / (1000 * 60 * 60 * 24));

            if (dayDiff === 0) {
                dateHeaderText.innerText = "Today";
            } else if (dayDiff === -1) {
                dateHeaderText.innerText = "Yesterday";
            } else if (dayDiff === 1) {
                dateHeaderText.innerText = "Tomorrow";
            } else {
                const options = { weekday: 'long' };
                dateHeaderText.innerText = currentDate.toLocaleDateString('en-US', options);
            }
        }

        // Filter tasks that validly appear on the active date (both non-repeating and active repeating)
        const dayTasks = tasks.filter(task => shouldTaskAppearOnDate(task, currentDate));
        
        const total = dayTasks.length;
        const completed = dayTasks.filter(task => isTaskCompletedForDate(task, targetDateString)).length;
        const uncompleted = total - completed;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        if (progressText) progressText.innerText = `${percentage}%`;
        if (completedText) completedText.innerText = completed;
        if (uncompletedText) uncompletedText.innerText = uncompleted;

        // Maps progress across 9 visual level bars
        const barsToLightUp = total > 0 ? Math.ceil((percentage / 100) * 9) : 0;

        for (let i = 1; i <= 9; i++) {
            const barElement = document.querySelector(`.level-${i}`);
            if (barElement) {
                if (i <= barsToLightUp) {
                    barElement.style.display = "block";
                } else {
                    barElement.style.display = "none";
                }
            }
        }
    }

    if (prevArrow) {
        prevArrow.addEventListener('click', () => {
            currentDate.setDate(currentDate.getDate() - 1);
            updateTrackerMetrics();
        });
    }

    if (nextArrow) {
        nextArrow.addEventListener('click', () => {
            currentDate.setDate(currentDate.getDate() + 1);
            updateTrackerMetrics();
        });
    }

    updateTrackerMetrics();
});