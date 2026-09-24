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

// Helper to format date into standard array matching format "DD/MM/YYYY"
function formatStorageDateKey(dateObj) {
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
}

// Active Date Tracking Engine
let savedDateString = sessionStorage.getItem('activeScheduleDate');
let currentDate;

if (savedDateString && savedDateString !== "25/03/2026" && savedDateString !== "25 / 03 / 2026") {
    const dateParts = savedDateString.split('/');
    currentDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
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

    // --- THE RENDERING MACHINE ---
    function renderTasks() {
        if (!contentContainer) return;
        contentContainer.innerHTML = '';

        const targetDateString = formatStorageDateKey(currentDate);
        const filteredTasks = tasks.filter(task => task.date === targetDateString);

        if (filteredTasks.length === 0) {
            contentContainer.innerHTML = `
                <div style="text-align: center; color: var(--text-gray); margin-top: 40px; font-weight: 500;">
                    No tasks scheduled for this day! ✨
                </div>`;
            return;
        }

        filteredTasks.forEach(task => {
            let cardHTML = '';

            if (task.completed) {
                cardHTML = `
                    <div class="task-card-wrapper completed-pill-state" data-id="${task.id}">
                        <div class="time-column">
                            <span>${task.startTime}</span>
                            <div class="dotted-line"></div>
                            <span>${task.endTime}</span>
                        </div>
                        <div class="task-card-pill">
                            <button class="btn-undo-complete">
                                <i class="fa-solid fa-circle-check"></i>
                            </button>
                            <div class="pill-title">${task.title}</div>
                        </div>
                    </div>
                `;
            } else {
                let categoryClass = 'personal';
                let iconBadge = '☀️';

                switch(task.category.toLowerCase()) {
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

                // Check if description exists and is non-empty
                const taskDescription = (task.description && task.description.trim() !== "") ? task.description.trim() : null;
                const bodyHTML = taskDescription 
                    ? `<div class="card-body"><p>${taskDescription}</p></div>` 
                    : '';

                cardHTML = `
                    <div class="task-card-wrapper" data-id="${task.id}">
                        <div class="time-column">
                            <span>${task.startTime}</span>
                            <div class="dotted-line"></div>
                            <span>${task.endTime}</span>
                        </div>
                        <div class="task-card">
                            <div class="card-header">
                                <span class="badge ${categoryClass}">${iconBadge} ${task.category}</span>
                                <div class="title-field">${task.title}</div>
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
        const deleteButtons = document.querySelectorAll('.btn-delete');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cardWrapper = e.target.closest('.task-card-wrapper');
                const taskId = cardWrapper.getAttribute('data-id');
                tasks = tasks.filter(task => task.id !== taskId);
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
                    targetTask.completed = true;
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
                    targetTask.completed = false;
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

            function endPress(e) {
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
            const selectedCategory = document.querySelector('input[name="modalCategory"]:checked').value;
            const descField = document.getElementById('modalTaskDescription');
            const descriptionInput = descField ? descField.value.trim() : "";

            const notifyCheckbox = document.getElementById('modalNotifyMe');
            const alarmCheckbox = document.getElementById('modalSetAlarm');
            const notifyMeInput = notifyCheckbox ? notifyCheckbox.checked : false;
            const setAlarmInput = alarmCheckbox ? alarmCheckbox.checked : false;

            if (titleInput === "") {
                alert("Please give your task a title!");
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
                    description: descriptionInput,
                    
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