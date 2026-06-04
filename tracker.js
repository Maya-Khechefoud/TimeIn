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

// FIXED: Instead of a hardcoded string, default to the user's real live machine date!
let savedDateString = localStorage.getItem('activeScheduleDate');
let currentDate;

if (savedDateString) {
    const dateParts = savedDateString.split('/');
    currentDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
} else {
    // If no date is saved yet, open up exactly to today's live date automatically
    currentDate = new Date();
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
        localStorage.setItem('activeScheduleDate', targetDateString);
        
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

        const dayTasks = tasks.filter(task => task.date === targetDateString);
        const total = dayTasks.length;
        const completed = dayTasks.filter(task => task.completed).length;
        const uncompleted = total - completed;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        if (progressText) progressText.innerText = `${percentage}%`;
        if (completedText) completedText.innerText = completed;
        if (uncompletedText) uncompletedText.innerText = uncompleted;

        const barsToLightUp = total > 0 ? Math.ceil((percentage / 100) * 7) : 0;

        for (let i = 1; i <= 7; i++) {
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