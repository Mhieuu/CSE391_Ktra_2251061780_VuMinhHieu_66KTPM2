

const MAX_TASK_LENGTH = 100;


// 1. TRẠNG THÁI ỨNG DỤNG

let tasks = [];
let nextId = 1;
let pendingDeleteId = null;


// 2. KHỞI TẠO
 
document.addEventListener("DOMContentLoaded", function () {
    loadFromStorage();
    renderTasks();
    bindFormEvents();
    bindModalReset();
    bindDeleteConfirmEvents();
});


// 3. LƯU / ĐỌC TỪ localStorage
function saveToStorage() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function loadFromStorage() {
    const saved = localStorage.getItem("tasks");
    if (saved) {
        tasks = JSON.parse(saved);
        nextId = tasks.length > 0
            ? Math.max(...tasks.map(function (t) { return t.id; })) + 1
            : 1;
    } else {
        // Load mặc định từ data.json
        fetch("data.json")
            .then(function (res) { return res.json(); })
            .then(function (data) {
                tasks = data.tasks;
                nextId = tasks.length > 0
                    ? Math.max(...tasks.map(function (t) { return t.id; })) + 1
                    : 1;
                saveToStorage();
                renderTasks();
            })
            .catch(function () {
                // Nếu không tải được data.json, dùng mặc định
                tasks = [
                    { id: 1, name: "Go to gym", priority: "High", status: "To Do" },
                    { id: 2, name: "Read a book", priority: "Medium", status: "Done" },
                    { id: 3, name: "Go to market", priority: "Low", status: "In Progress" },
                    { id: 4, name: "Do homework", priority: "High", status: "To Do" },
                    { id: 5, name: "Clean the room", priority: "Low", status: "Done" }
                ];
                nextId = 6;
                saveToStorage();
                renderTasks();
            });
    }
}


// 4. RENDER DANH SÁCH TASK

function renderTasks() {
    const tbody = document.getElementById("taskTableBody");
    const emptyState = document.getElementById("emptyState");

    if (tasks.length === 0) {
        tbody.innerHTML = "";
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";

    tbody.innerHTML = tasks.map(function (task, index) {
        var rowNum = index + 1;

        var priorityClass = getPriorityClass(task.priority);
        var statusClass = getStatusClass(task.status);
        var progressIcon = getProgressIcon(task.status);
        var progressColor = getProgressColor(task.status);

        return [
            '<tr data-id="' + task.id + '">',
            '  <td class="text-center row-num">' + rowNum + '</td>',
            '  <td class="fw-medium">' + escapeHtml(task.name) + '</td>',
            '  <td><span class="badge badge-priority ' + priorityClass + '">' + task.priority + '</span></td>',
            '  <td><span class="badge badge-status ' + statusClass + '">' + task.status + '</span></td>',
            '  <td class="text-center">',
            '    <i class="bi ' + progressIcon + ' progress-icon" style="color:' + progressColor + '"></i>',
            '  </td>',
            '  <td class="text-center">',
            '    <button class="btn-action btn-edit" onclick="openEditModal(' + task.id + ')" title="Edit">',
            '      <i class="bi bi-pencil-square"></i>',
            '    </button>',
            '    <button class="btn-action btn-delete" onclick="deleteTask(' + task.id + ')" title="Delete">',
            '      <i class="bi bi-trash"></i>',
            '    </button>',
            '  </td>',
            '</tr>'
        ].join("");
    }).join("");
}


// 5. THÊM TASK MỚI

function addTask(name, priority, status) {
    var task = {
        id: nextId++,
        name: name.trim(),
        priority: priority,
        status: status
    };
    tasks.push(task);
    saveToStorage();
    renderTasks();
    showToast("Task added successfully!", "success");
}


// 7. SỬA TASK

function updateTask(id, name, priority, status) {
    var task = tasks.find(function (t) { return t.id === id; });
    if (task) {
        task.name = name.trim();
        task.priority = priority;
        task.status = status;
        saveToStorage();
        renderTasks();
        showToast("Task updated successfully!", "info");
    }
}


// 8. XÓA TASK
function deleteTask(id) {
    var task = tasks.find(function (t) { return t.id === id; });
    if (!task) return;

    pendingDeleteId = id;
    document.getElementById("deleteConfirmMessage").textContent =
        'Are you sure you want to delete the task "' + task.name + '"?';

    var modal = new bootstrap.Modal(document.getElementById("deleteConfirmModal"));
    modal.show();
}

// 9. MỞ MODAL SỬA
function openEditModal(id) {
    var task = tasks.find(function (t) { return t.id === id; });
    if (!task) return;

    document.getElementById("modalTitle").innerHTML =
        '<i class="bi bi-pencil-square me-1"></i> Edit Task';
    document.getElementById("btnSubmitTask").innerHTML =
        '<i class="bi bi-check-lg"></i> Update Task';
    document.getElementById("taskId").value = task.id;
    document.getElementById("taskName").value = task.name;
    document.getElementById("selectedStatus").value = task.status;

    // Đếm ký tự
    document.getElementById("charCount").textContent = task.name.length;

    // Set priority buttons
    setActivePriority(task.priority);
    document.getElementById("selectedPriority").value = task.priority;

    // Ẩn lỗi cũ
    showError("");

    // Mở modal
    var modal = new bootstrap.Modal(document.getElementById("taskModal"));
    modal.show();
}

// 10. XỬ LÝ SỰ KIỆN FORM

function bindFormEvents() {
    var taskForm = document.getElementById("taskForm");
    var taskNameInput = document.getElementById("taskName");
    var priorityBtns = document.querySelectorAll(".btn-priority");

    // Chọn Priority
    priorityBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            setActivePriority(btn.getAttribute("data-priority"));
            document.getElementById("selectedPriority").value = btn.getAttribute("data-priority");
        });
    });

    // Đếm ký tự khi gõ
    taskNameInput.addEventListener("input", function () {
        document.getElementById("charCount").textContent = taskNameInput.value.length;
        var err = validateTaskName(taskNameInput.value);
        showError(err);
    });

    // Submit form (Add / Edit)
    taskForm.addEventListener("submit", function (e) {
        e.preventDefault();

        var name = taskNameInput.value;
        var err = validateTaskName(name);

        if (err) {
            showError(err);
            taskNameInput.focus();
            return;
        }

        var id = document.getElementById("taskId").value;
        var priority = document.getElementById("selectedPriority").value;
        var status = document.getElementById("selectedStatus").value;

        if (id === "") {
            addTask(name, priority, status);
        } else {
            updateTask(parseInt(id), name, priority, status);
        }

        // Đóng modal
        bootstrap.Modal.getInstance(document.getElementById("taskModal")).hide();
    });
}


// 11. RESET MODAL KHI ĐÓNG

function bindModalReset() {
    var modalEl = document.getElementById("taskModal");
    modalEl.addEventListener("hidden.bs.modal", function () {
        document.getElementById("taskForm").reset();
        document.getElementById("taskId").value = "";
        document.getElementById("charCount").textContent = "0";
        document.getElementById("selectedPriority").value = "Low";
        document.getElementById("modalTitle").innerHTML =
            '<i class="bi bi-plus-circle me-1"></i> Add Task';
        document.getElementById("btnSubmitTask").innerHTML =
            '<i class="bi bi-plus-lg"></i> Add Task';
        setActivePriority("Low");
        showError("");
    });

    var deleteModalEl = document.getElementById("deleteConfirmModal");
    deleteModalEl.addEventListener("hidden.bs.modal", function () {
        pendingDeleteId = null;
        document.getElementById("deleteConfirmMessage").textContent =
            "Are you sure you want to delete this task?";
    });
}

function bindDeleteConfirmEvents() {
    var confirmDeleteBtn = document.getElementById("btnConfirmDelete");
    confirmDeleteBtn.addEventListener("click", function () {
        if (pendingDeleteId === null) return;

        tasks = tasks.filter(function (t) { return t.id !== pendingDeleteId; });
        saveToStorage();
        renderTasks();
        showToast("Task deleted.", "danger");

        var deleteModal = bootstrap.Modal.getInstance(document.getElementById("deleteConfirmModal"));
        if (deleteModal) {
            deleteModal.hide();
        }
    });
}


// 12. VALIDATION

function validateTaskName(name) {
    if (name.trim() === "") {
        return "Task name cannot be empty!";
    }
    if (name.length > MAX_TASK_LENGTH) {
        return "Task name cannot exceed " + MAX_TASK_LENGTH + " characters! (Current: " + name.length + ")";
    }
    return "";
}

function showError(message) {
    var errEl = document.getElementById("errorMessage");
    var inputEl = document.getElementById("taskName");
    if (message) {
        errEl.textContent = message;
        errEl.classList.add("show");
        inputEl.classList.add("input-error");
    } else {
        errEl.textContent = "";
        errEl.classList.remove("show");
        inputEl.classList.remove("input-error");
    }
}


// 13. HELPER FUNCTIONS


// Đặt active cho nút Priority
function setActivePriority(priority) {
    var btns = document.querySelectorAll(".btn-priority");
    btns.forEach(function (btn) {
        btn.classList.remove("active-high", "active-medium", "active-low");
    });
    btns.forEach(function (btn) {
        if (btn.getAttribute("data-priority") === priority) {
            if (priority === "High")   btn.classList.add("active-high");
            if (priority === "Medium") btn.classList.add("active-medium");
            if (priority === "Low")    btn.classList.add("active-low");
        }
    });
}

// Lấy class CSS cho Priority badge
function getPriorityClass(priority) {
    if (priority === "High")   return "badge-high";
    if (priority === "Medium") return "badge-medium";
    return "badge-low";
}

// Lấy class CSS cho Status badge
function getStatusClass(status) {
    if (status === "To Do")       return "badge-todo";
    if (status === "In Progress") return "badge-progress";
    return "badge-done";
}

// Lấy icon progress theo status
function getProgressIcon(status) {
    if (status === "Done")        return "bi-check-circle-fill";
    if (status === "In Progress") return "bi-arrow-repeat";
    return "bi-circle";
}

// Lấy màu icon progress
function getProgressColor(status) {
    if (status === "Done")        return "#10b981";
    if (status === "In Progress") return "#3b82f6";
    return "#94a3b8";
}

// Escape HTML để tránh XSS
function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Hiển thị Toast notification
function showToast(message, type) {
    var container = document.getElementById("toastContainer");
    var toast = document.createElement("div");
    toast.className = "toast custom-toast";
    toast.setAttribute("role", "alert");

    var bgClass = "bg-white";
    var icon = "";
    if (type === "success") {
        bgClass = "text-white";
        icon = '<i class="bi bi-check-circle-fill me-2"></i>';
        toast.style.background = "linear-gradient(135deg, #10b981, #059669)";
    } else if (type === "info") {
        bgClass = "text-white";
        icon = '<i class="bi bi-info-circle-fill me-2"></i>';
        toast.style.background = "linear-gradient(135deg, #3b82f6, #2563eb)";
    } else if (type === "danger") {
        bgClass = "text-white";
        icon = '<i class="bi bi-exclamation-circle-fill me-2"></i>';
        toast.style.background = "linear-gradient(135deg, #ef4444, #dc2626)";
    } else {
        icon = '<i class="bi bi-bell-fill me-2"></i>';
    }

    toast.innerHTML = '<div class="toast-body d-flex align-items-center ' + bgClass + '">' +
        icon + message + '</div>';
    container.appendChild(toast);

    var bsToast = new bootstrap.Toast(toast, { delay: 2500 });
    bsToast.show();

    toast.addEventListener("hidden.bs.toast", function () {
        toast.remove();
    });
}
