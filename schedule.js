// Global App State: Load all tasks or start empty
let tasks = JSON.parse(localStorage.getItem('myAppState')) || [];
let currentEditTaskId = null;

function saveToLocalStorage() {
    localStorage.setItem('myAppState', JSON.stringify(tasks));
}

// Helper to format JavaScript date objects into "DD / MM / YYYY" layout
function formatDateString(dateObj) {
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day} / ${month} / ${year}`;
}

// Helper to format date into standard string matching format "DD/MM/YYYY"
function formatStorageDateKey(dateObj) {
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
}

// Helper to parse "DD/MM/YYYY" back into Date object
function parseStorageDateKey(dateStr) {
    if (!dateStr) return new Date();
    const parts = dateStr.split('/');
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
}

// Helper for XSS protection when rendering text strings inside innerHTML
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Active Date Tracking Engine
let savedDateString = sessionStorage.getItem('activeScheduleDate');
let currentDate;

if (savedDateString && savedDateString !== "25/03/2026" && savedDateString !== "25 / 03 / 2026") {
    currentDate = parseStorageDateKey(savedDateString);
} else {
    currentDate = new Date();
    sessionStorage.setItem('activeScheduleDate', formatStorageDateKey(currentDate));
}

document.addEventListener('DOMContentLoaded', () => {   
    // DOM Elements selection
    const addTaskBar = document.querySelector('.add-task-bar input'); 
    const addBtn = document.querySelector('.add-btn');               
    const modalOverlay = document.getElementById('taskModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalHeaderTitle = document.querySelector('#taskModal h2');
    const contentContainer = document.querySelector('.content');
    
    // Date navigation elements
    const datePill = document.querySelector('.date-pill');
    const dateHeaderText = document.querySelector('.date-header-text'); 
    const prevArrow = document.querySelectorAll('.nav-arrow')[0];
    const nextArrow = document.querySelectorAll('.nav-arrow')[1];

    // Repeat UI Elements
    const repeatCheckbox = document.getElementById('modalRepeatCheckbox');
    const repeatDaysContainer = document.getElementById('repeatDaysContainer');
    const dayPills = document.querySelectorAll('.day-pill');

    // --- REPEAT UI TOGGLE & PILL SELECTION ---
    if (repeatCheckbox && repeatDaysContainer) {
        repeatCheckbox.addEventListener('change', () => {
            if (repeatCheckbox.checked) {
                repeatDaysContainer.classList.remove('hidden');
            } else {
                repeatDaysContainer.classList.add('hidden');
            }
        });
    }

    dayPills.forEach(pill => {
        pill.addEventListener('click', () => {
            pill.classList.toggle('active');
        });
    });

    function getSelectedRepeatDays() {
        const selectedDays = [];
        document.querySelectorAll('.day-pill.active').forEach(pill => {
            selectedDays.push(parseInt(pill.getAttribute('data-day-value'), 10));
        });
        return selectedDays;
    }

    function setSelectedRepeatDays(daysArray = []) {
        dayPills.forEach(pill => {
            const val = parseInt(pill.getAttribute('data-day-value'), 10);
            if (daysArray.includes(val)) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });
    }

    function updateDateDisplay() {
        if (datePill) {
            datePill.innerText = formatDateString(currentDate);
        }

        if (dateHeaderText) {
            const realToday = new Date(); 
            
            const targetDateMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
            const realTodayMidnight = new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate());
            
            const timeDiff = targetDateMidnight.getTime() - realTodayMidnight.getTime();
            const dayDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24));

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

        sessionStorage.setItem('activeScheduleDate', formatStorageDateKey(currentDate));
        renderTasks(); 
    }

    // --- DATE NAVIGATION LISTENERS ---
    if (prevArrow) {
        prevArrow.addEventListener('click', () => {
            currentDate.setDate(currentDate.getDate() - 1); 
            updateDateDisplay();
        });
    }

    if (nextArrow) {
        nextArrow.addEventListener('click', () => {
            currentDate.setDate(currentDate.getDate() + 1); 
            updateDateDisplay();
        });
    }

    function clearModalInputs() {
        const titleField = document.getElementById('modalTaskTitle');
        const startField = document.getElementById('modalStartTime');
        const endField = document.getElementById('modalEndTime');
        const descField = document.getElementById('modalTaskDescription');
        
        const notifyCheckbox = document.getElementById('modalNotifyMe');
        const alarmCheckbox = document.getElementById('modalSetAlarm');

        if (titleField) titleField.value = "";
        if (startField) startField.value = "";
        if (endField) endField.value = "";
        if (descField) descField.value = "";
        
        if (notifyCheckbox) notifyCheckbox.checked = false;
        if (alarmCheckbox) alarmCheckbox.checked = false;

        if (repeatCheckbox) repeatCheckbox.checked = false;
        if (repeatDaysContainer) repeatDaysContainer.classList.add('hidden');
        setSelectedRepeatDays([]);

        const defaultRadio = document.querySelector('input[name="modalCategory"][value="Personal"]');
        if (defaultRadio) defaultRadio.checked = true;
    }

    function openModal(isEditMode = false) {
        if (modalHeaderTitle) {
            modalHeaderTitle.innerText = isEditMode ? "Edit Task" : "Create Task";
        }
        if (!isEditMode) {
            clearModalInputs();
            currentEditTaskId = null; 
        }
        if (modalOverlay) modalOverlay.classList.add('open');
    }

    function closeModal() {
        if (modalOverlay) modalOverlay.classList.remove('open');
        clearModalInputs();
        currentEditTaskId = null;
    }

    if (addTaskBar) addTaskBar.addEventListener('click', (e) => { e.preventDefault(); openModal(false); });
    if (addBtn) addBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(false); });
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

    // --- REPEATING MATCHING ENGINE ---
    function shouldTaskAppearOnDate(task, targetDateObj) {
        const targetDateMidnight = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate());
        const taskStartDate = parseStorageDateKey(task.date);
        const taskStartMidnight = new Date(taskStartDate.getFullYear(), taskStartDate.getMonth(), taskStartDate.getDate());

        // Do not render before creation date
        if (targetDateMidnight < taskStartMidnight) {
            return false;
        }

        // Non-repeating task match
        if (!task.repeatDays || task.repeatDays.length === 0) {
            return formatStorageDateKey(taskStartDate) === formatStorageDateKey(targetDateObj);
        }

        // Repeating task day-of-week match (0 = Sun, 1 = Mon, ..., 6 = Sat)
        const dayOfWeek = targetDateObj.getDay();
        return task.repeatDays.includes(dayOfWeek);
    }

    function isTaskCompletedForDate(task, dateStr) {
        if (!task.repeatDays || task.repeatDays.length === 0) {
            return !!task.completed;
        }
        return Array.isArray(task.completedDates) && task.completedDates.includes(dateStr);
    }

    // --- THE RENDERING MACHINE ---
    function renderTasks() {
        if (!contentContainer) return;
        contentContainer.innerHTML = '';

        const targetDateString = formatStorageDateKey(currentDate);
        const filteredTasks = tasks.filter(task => shouldTaskAppearOnDate(task, currentDate));

        if (filteredTasks.length === 0) {
            contentContainer.innerHTML = `
                <div style="text-align: center; color: var(--text-gray); margin-top: 40px; font-weight: 500;">
                    No tasks scheduled for this day! ✨
                </div>`;
            return;
        }

        filteredTasks.forEach(task => {
            let cardHTML = '';
            const isCompletedToday = isTaskCompletedForDate(task, targetDateString);

            if (isCompletedToday) {
                cardHTML = `
                    <div class="task-card-wrapper completed-pill-state" data-id="${task.id}">
                        <div class="time-column">
                            <span>${escapeHTML(task.startTime)}</span>
                            <div class="dotted-line"></div>
                            <span>${escapeHTML(task.endTime)}</span>
                        </div>
                        <div class="task-card-pill">
                            <button class="btn-undo-complete">
                                <i class="fa-solid fa-circle-check"></i>
                            </button>
                            <div class="pill-title">${escapeHTML(task.title)}</div>
                        </div>
                    </div>
                `;
            } else {
                let categoryClass = 'personal';
                let iconBadge = '☀️';

                switch((task.category || '').toLowerCase()) {
                    case 'study':
                        categoryClass = 'study';
                        iconBadge = '🔵';
                        break;
                    case 'business':
                        categoryClass = 'business';
                        iconBadge = '💼';
                        break;
                    case 'shopping':
                        categoryClass = 'shopping';
                        iconBadge = '🛍️';
                        break;
                    default:
                        categoryClass = 'personal';
                        iconBadge = '☀️';
                }

                const taskDescription = (task.description && task.description.trim() !== "") ? task.description.trim() : null;
                const bodyHTML = taskDescription 
                    ? `<div class="card-body"><p>${escapeHTML(taskDescription)}</p></div>` 
                    : '';

                cardHTML = `
                    <div class="task-card-wrapper" data-id="${task.id}">
                        <div class="time-column">
                            <span>${escapeHTML(task.startTime)}</span>
                            <div class="dotted-line"></div>
                            <span>${escapeHTML(task.endTime)}</span>
                        </div>
                        <div class="task-card">
                            <div class="card-header">
                                <span class="badge ${categoryClass}">${iconBadge} ${escapeHTML(task.category)}</span>
                                <div class="title-field">${escapeHTML(task.title)}</div>
                            </div>
                            ${bodyHTML}
                            <div class="action-buttons">
                                <button class="btn-delete"><i class="fa-solid fa-xmark"></i></button>
                                <button class="btn-edit"><i class="fa-solid fa-paintbrush"></i></button>
                                <button class="btn-complete"><i class="fa-solid fa-check"></i></button>
                            </div>
                        </div>
                    </div>
                `;
            }

            contentContainer.innerHTML += cardHTML;
        });

        attachCardActionListeners();
        initDragAndDrop();
    }

    // --- CARD INTERACTIONS: CONTROLLERS ---
    function attachCardActionListeners() {
        const targetDateString = formatStorageDateKey(currentDate);

        const deleteButtons = document.querySelectorAll('.btn-delete');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cardWrapper = e.target.closest('.task-card-wrapper');
                const taskId = cardWrapper.getAttribute('data-id');
                const targetTask = tasks.find(t => t.id === taskId);

                if (!targetTask) return;

                if (targetTask.repeatDays && targetTask.repeatDays.length > 0) {
                    const removeAll = confirm("Delete all occurrences of this repeating task?\n\nPress OK to delete ALL occurrences, or Cancel to remove ONLY today's instance.");
                    if (removeAll) {
                        tasks = tasks.filter(task => task.id !== taskId);
                    } else {
                        // Remove current day from repeat schedule
                        const currentDayIndex = currentDate.getDay();
                        targetTask.repeatDays = targetTask.repeatDays.filter(d => d !== currentDayIndex);
                    }
                } else {
                    tasks = tasks.filter(task => task.id !== taskId);
                }

                saveToLocalStorage();
                renderTasks();
            });
        });

        const completeButtons = document.querySelectorAll('.btn-complete');
        completeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cardWrapper = e.target.closest('.task-card-wrapper');
                const taskId = cardWrapper.getAttribute('data-id');
                const targetTask = tasks.find(task => task.id === taskId);

                if (targetTask) {
                    if (targetTask.repeatDays && targetTask.repeatDays.length > 0) {
                        if (!Array.isArray(targetTask.completedDates)) {
                            targetTask.completedDates = [];
                        }
                        if (!targetTask.completedDates.includes(targetDateString)) {
                            targetTask.completedDates.push(targetDateString);
                        }
                    } else {
                        targetTask.completed = true;
                    }
                }
                saveToLocalStorage();
                renderTasks();
            });
        });

        const undoButtons = document.querySelectorAll('.btn-undo-complete');
        undoButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cardWrapper = e.target.closest('.task-card-wrapper');
                const taskId = cardWrapper.getAttribute('data-id');
                const targetTask = tasks.find(task => task.id === taskId);

                if (targetTask) {
                    if (targetTask.repeatDays && targetTask.repeatDays.length > 0) {
                        if (Array.isArray(targetTask.completedDates)) {
                            targetTask.completedDates = targetTask.completedDates.filter(d => d !== targetDateString);
                        }
                    } else {
                        targetTask.completed = false;
                    }
                }
                saveToLocalStorage();
                renderTasks();
            });
        });

        const editButtons = document.querySelectorAll('.btn-edit');
        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cardWrapper = e.target.closest('.task-card-wrapper');
                const taskId = cardWrapper.getAttribute('data-id');
                const targetTask = tasks.find(task => task.id === taskId);
                
                if (targetTask) {
                    currentEditTaskId = taskId;

                    document.getElementById('modalTaskTitle').value = targetTask.title;
                    
                    document.getElementById('modalStartTime').value = targetTask.startTime === "." ? "" : targetTask.startTime;
                    document.getElementById('modalEndTime').value = targetTask.endTime === "." ? "" : targetTask.endTime;
                    
                    const descField = document.getElementById('modalTaskDescription');
                    if (descField) {
                        descField.value = targetTask.description || "";
                    }

                    if (repeatCheckbox) {
                        const hasRepeat = targetTask.repeatDays && targetTask.repeatDays.length > 0;
                        repeatCheckbox.checked = hasRepeat;
                        if (hasRepeat) {
                            repeatDaysContainer.classList.remove('hidden');
                            setSelectedRepeatDays(targetTask.repeatDays);
                        } else {
                            repeatDaysContainer.classList.add('hidden');
                            setSelectedRepeatDays([]);
                        }
                    }
                    
                    const categoryRadio = document.querySelector(`input[name="modalCategory"][value="${targetTask.category}"]`);
                    if (categoryRadio) {
                        categoryRadio.checked = true;
                    }

                    const notifyCheckbox = document.getElementById('modalNotifyMe');
                    const alarmCheckbox = document.getElementById('modalSetAlarm');
                    if (notifyCheckbox) notifyCheckbox.checked = !!targetTask.notifyMe;
                    if (alarmCheckbox) alarmCheckbox.checked = !!targetTask.setAlarm;

                    openModal(true);
                }
            });
        });
    }

    // --- LONG PRESS & DRAG-AND-DROP ENGINE ---
    function initDragAndDrop() {
        const wrappers = document.querySelectorAll('.task-card-wrapper');
        let draggedWrapper = null;
        let longPressTimer = null;
        let isDragging = false;
        let startY = 0;

        wrappers.forEach(wrapper => {
            function startPress(e) {
                if (e.target.closest('button')) return;

                const touch = e.touches ? e.touches[0] : e;
                startY = touch.clientY;

                longPressTimer = setTimeout(() => {
                    isDragging = true;
                    draggedWrapper = wrapper;
                    draggedWrapper.classList.add('floating-card');
                    
                    if (navigator.vibrate) {
                        navigator.vibrate(40);
                    }
                }, 350);
            }

            function movePress(e) {
                const touch = e.touches ? e.touches[0] : e;
                const moveY = touch.clientY;

                if (!isDragging && Math.abs(moveY - startY) > 10) {
                    clearTimeout(longPressTimer);
                    return;
                }

                if (isDragging && draggedWrapper) {
                    e.preventDefault();

                    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                    if (!elementBelow) return;

                    const targetWrapper = elementBelow.closest('.task-card-wrapper');

                    wrappers.forEach(w => w.classList.remove('drag-over-above', 'drag-over-below'));

                    if (targetWrapper && targetWrapper !== draggedWrapper) {
                        const rect = targetWrapper.getBoundingClientRect();
                        const middleY = rect.top + rect.height / 2;

                        if (touch.clientY < middleY) {
                            targetWrapper.classList.add('drag-over-above');
                        } else {
                            targetWrapper.classList.add('drag-over-below');
                        }
                    }
                }
            }

            function endPress() {
                clearTimeout(longPressTimer);

                if (isDragging && draggedWrapper) {
                    const activeDropTarget = document.querySelector('.drag-over-above, .drag-over-below');

                    if (activeDropTarget && activeDropTarget !== draggedWrapper) {
                        const isAbove = activeDropTarget.classList.contains('drag-over-above');
                        const draggedId = draggedWrapper.getAttribute('data-id');
                        const targetId = activeDropTarget.getAttribute('data-id');

                        const draggedIndex = tasks.findIndex(t => t.id === draggedId);
                        const targetIndex = tasks.findIndex(t => t.id === targetId);

                        if (draggedIndex !== -1 && targetIndex !== -1) {
                            const [movedTask] = tasks.splice(draggedIndex, 1);
                            let newIndex = tasks.findIndex(t => t.id === targetId);

                            if (!isAbove) {
                                newIndex += 1;
                            }

                            tasks.splice(newIndex, 0, movedTask);
                            saveToLocalStorage();
                        }
                    }

                    wrappers.forEach(w => w.classList.remove('floating-card', 'drag-over-above', 'drag-over-below'));
                    isDragging = false;
                    draggedWrapper = null;
                    renderTasks();
                }
            }

            wrapper.addEventListener('touchstart', startPress, { passive: false });
            wrapper.addEventListener('touchmove', movePress, { passive: false });
            wrapper.addEventListener('touchend', endPress);
            wrapper.addEventListener('touchcancel', endPress);

            wrapper.addEventListener('mousedown', startPress);
            wrapper.addEventListener('mousemove', movePress);
            wrapper.addEventListener('mouseup', endPress);
        });
    }

    // --- SAVING OR UPDATING DATA FROM MODAL ---
    const saveTaskBtn = document.getElementById('saveTaskBtn');

    if (saveTaskBtn) {
        saveTaskBtn.addEventListener('click', () => {
            const titleInput = document.getElementById('modalTaskTitle').value.trim();
            const startTimeInput = document.getElementById('modalStartTime').value.trim();
            const endTimeInput = document.getElementById('modalEndTime').value.trim();
            const categoryRadio = document.querySelector('input[name="modalCategory"]:checked');
            const selectedCategory = categoryRadio ? categoryRadio.value : "Personal";
            
            const descField = document.getElementById('modalTaskDescription');
            const descriptionInput = descField ? descField.value.trim() : "";

            const isRepeatEnabled = repeatCheckbox ? repeatCheckbox.checked : false;
            const selectedDays = isRepeatEnabled ? getSelectedRepeatDays() : [];

            const notifyCheckbox = document.getElementById('modalNotifyMe');
            const alarmCheckbox = document.getElementById('modalSetAlarm');
            const notifyMeInput = notifyCheckbox ? notifyCheckbox.checked : false;
            const setAlarmInput = alarmCheckbox ? alarmCheckbox.checked : false;

            if (titleInput === "") {
                alert("Please give your task a title!");
                return; 
            }

            if (isRepeatEnabled && selectedDays.length === 0) {
                alert("Please select at least one day to repeat the task!");
                return;
            }

            if (currentEditTaskId) {
                const targetTask = tasks.find(task => task.id === currentEditTaskId);
                if (targetTask) {
                    targetTask.title = titleInput;
                    targetTask.category = selectedCategory;
                    targetTask.startTime = startTimeInput || ".";
                    targetTask.endTime = endTimeInput || ".";
                    targetTask.description = descriptionInput;
                    targetTask.repeatDays = selectedDays;
                    targetTask.notifyMe = notifyMeInput;
                    targetTask.setAlarm = setAlarmInput;
                }
            } else {
                const newTask = {
                    id: "task-" + Date.now(),
                    title: titleInput,
                    category: selectedCategory,
                    startTime: startTimeInput || ".",
                    endTime: endTimeInput || ".",
                    date: formatStorageDateKey(currentDate), 
                    completed: false,
                    completedDates: [],
                    description: descriptionInput,
                    repeatDays: selectedDays,
                    notifyMe: notifyMeInput,
                    setAlarm: setAlarmInput
                };

                tasks.push(newTask);
            }

            saveToLocalStorage(); 
            closeModal();
            renderTasks();
        });
    }

    updateDateDisplay();

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
});