"use strict";

/* ===== STORAGE ===== */
const STORAGE_KEY = "taskflow.tasks";
const THEME_KEY = "taskflow.theme";

/* ===== PRIORITY ORDER ===== */
const PRIORITY_ORDER = { high: 1, medium: 2, low: 3 };

/* ===== DOM ELEMENTS ===== */
const taskForm = document.querySelector("#taskForm");
const taskInput = document.querySelector("#taskInput");
const priorityInput = document.querySelector("#priorityInput");
const formMessage = document.querySelector("#formMessage");
const taskList = document.querySelector("#taskList");
const emptyState = document.querySelector("#emptyState");
const filterButtons = document.querySelectorAll(".filter-button");
const sortSelect = document.querySelector("#sortSelect");
const clearCompletedButton = document.querySelector("#clearCompleted");
const themeToggle = document.querySelector("#themeToggle");
const totalCount = document.querySelector("#totalCount");
const completedCount = document.querySelector("#completedCount");
const pendingCount = document.querySelector("#pendingCount");
const taskCountLabel = document.querySelector("#taskCountLabel");

/* ===== APPLICATION STATE ===== */
let tasks = loadTasks();
let currentFilter = "all";
let currentSort = "manual";

/* ===== INITIALIZATION ===== */
loadTheme();
setupEventListeners();
render();

/* ===== EVENT LISTENERS ===== */
function setupEventListeners() {
    taskForm.addEventListener("submit", addTask);
    filterButtons.forEach(button => button.addEventListener("click", changeFilter));
    sortSelect.addEventListener("change", changeSort);
    clearCompletedButton.addEventListener("click", clearCompletedTasks);
    themeToggle.addEventListener("click", toggleTheme);
}

/* ===== ADD TASK ===== */
function addTask(event) {
    event.preventDefault();

    const title = taskInput.value.trim();

    if (!title) {
        showMessage("Please enter a task before adding it.");
        taskInput.focus();
        return;
    }

    const newTask = {
        id: Date.now().toString(),
        title: title,
        priority: priorityInput.value,
        completed: false,
        createdAt: Date.now()
    };

    tasks.push(newTask);
    saveTasks();

    taskForm.reset();
    priorityInput.value = "medium"; // restore default priority after reset

    clearMessage();
    render();
    taskInput.focus();
}

/* ===== CREATE TASK ELEMENT ===== */
function createTaskElement(task, index) {
    const listItem = document.createElement("li");
    listItem.className = "task-item entering";
    listItem.dataset.taskId = task.id;
    listItem.classList.add(`priority-${task.priority}`);
    if (task.completed) listItem.classList.add("completed");

    // Checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", function () {
        task.completed = checkbox.checked;
        saveTasks();
        render();
    });

    // Content
    const content = document.createElement("div");
    content.className = "task-content";

    const title = document.createElement("p");
    title.className = "task-title";
    title.textContent = task.title; // textContent avoids XSS
    content.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const priorityBadge = document.createElement("span");
    priorityBadge.className = `priority-badge priority-${task.priority}`;
    priorityBadge.textContent = capitalize(task.priority);
    meta.appendChild(priorityBadge);

    content.appendChild(meta);

    // Actions
    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = createButton("Edit", "✎");
    editButton.addEventListener("click", function () {
        startEditing(task);
    });
    actions.appendChild(editButton);

    const deleteButton = createButton("Delete", "×");
    deleteButton.classList.add("delete-button");
    deleteButton.addEventListener("click", function () {
        deleteTask(task);
    });
    actions.appendChild(deleteButton);

    // Build
    listItem.appendChild(checkbox);
    listItem.appendChild(content);
    listItem.appendChild(actions);

    if (index > 0) {
        listItem.style.animationDelay = `${Math.min(index * 20, 200)}ms`;
    }

    return listItem;
}

/* ===== CREATE BUTTON ===== */
function createButton(label, icon) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "task-action-button";
    button.title = label;
    button.textContent = icon;
    return button;
}

/* ===== EDIT TASK ===== */
function startEditing(task) {
    const taskItem = document.querySelector(`[data-task-id="${task.id}"]`);
    if (!taskItem) return;

    const title = taskItem.querySelector(".task-title");

    const input = document.createElement("input");
    input.type = "text";
    input.className = "edit-input";
    input.value = task.title;
    input.maxLength = 200;

    title.replaceWith(input);
    input.focus();
    input.select();

    const buttons = taskItem.querySelectorAll(".task-action-button");
    const editButton = buttons[0];
    editButton.textContent = "Save";
    editButton.title = "Save";
    editButton.onclick = function () {
        saveEditedTask(task, input);
    };

    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") saveEditedTask(task, input);
        if (event.key === "Escape") render();
    });
}

/* ===== SAVE EDITED TASK ===== */
function saveEditedTask(task, input) {
    const newTitle = input.value.trim();

    if (!newTitle) {
        showMessage("A task cannot be empty.");
        input.focus();
        return;
    }

    task.title = newTitle;
    saveTasks();
    clearMessage();
    render();
}

/* ===== DELETE TASK ===== */
function deleteTask(task) {
    const shouldDelete = window.confirm(`Delete "${task.title}"?`);
    if (!shouldDelete) return;

    const taskItem = document.querySelector(`[data-task-id="${task.id}"]`);

    if (taskItem) {
        taskItem.classList.add("removing");
        taskItem.addEventListener("animationend", function () {
            tasks = tasks.filter(item => item.id !== task.id);
            saveTasks();
            render();
        }, { once: true });
    } else {
        tasks = tasks.filter(item => item.id !== task.id);
        saveTasks();
        render();
    }
}

/* ===== CLEAR COMPLETED ===== */
function clearCompletedTasks() {
    const completed = tasks.filter(task => task.completed);
    if (completed.length === 0) return;

    const shouldClear = window.confirm(`Delete ${completed.length} completed task(s)?`);
    if (!shouldClear) return;

    tasks = tasks.filter(task => !task.completed);
    saveTasks();
    render();
}

/* ===== FILTERING ===== */
function changeFilter(event) {
    currentFilter = event.currentTarget.dataset.filter;

    filterButtons.forEach(button => {
        button.classList.toggle("active", button.dataset.filter === currentFilter);
    });

    render();
}

function getFilteredTasks() {
    if (currentFilter === "active") return tasks.filter(task => !task.completed);
    if (currentFilter === "completed") return tasks.filter(task => task.completed);
    return [...tasks];
}

/* ===== SORTING ===== */
function changeSort(event) {
    currentSort = event.target.value;
    render();
}

function getSortedTasks(taskArray) {
    const sortedTasks = [...taskArray];

    if (currentSort === "priority") {
        return sortedTasks.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    }

    if (currentSort === "date") {
        return sortedTasks.sort((a, b) => b.createdAt - a.createdAt);
    }

    return sortedTasks;
}

/* ===== RENDER ===== */
function render() {
    const filteredTasks = getFilteredTasks();
    const sortedTasks = getSortedTasks(filteredTasks);

    taskList.replaceChildren();

    sortedTasks.forEach((task, index) => {
        taskList.appendChild(createTaskElement(task, index));
    });

    updateEmptyState(sortedTasks.length);
    updateStatistics();
    updateTaskCountLabel(sortedTasks.length);
}

/* ===== EMPTY STATE ===== */
function updateEmptyState(count) {
    emptyState.hidden = count !== 0;
}

/* ===== STATISTICS ===== */
function updateStatistics() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;

    totalCount.textContent = total;
    completedCount.textContent = completed;
    pendingCount.textContent = pending;
}

function updateTaskCountLabel(count) {
    taskCountLabel.textContent = `${count} ${count === 1 ? "task" : "tasks"}`;
}

/* ===== LOCAL STORAGE ===== */
function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
    const storedTasks = localStorage.getItem(STORAGE_KEY);
    if (!storedTasks) return [];

    try {
        const parsedTasks = JSON.parse(storedTasks);
        if (!Array.isArray(parsedTasks)) return [];
        return parsedTasks.filter(isValidTask);
    } catch (error) {
        console.error("Could not load saved tasks.", error);
        return [];
    }
}

function isValidTask(task) {
    return (
        task &&
        typeof task.id === "string" &&
        typeof task.title === "string" &&
        typeof task.priority === "string" &&
        typeof task.completed === "boolean" &&
        typeof task.createdAt === "number"
    );
}

/* ===== DARK MODE ===== */
function toggleTheme() {
    const isDark = document.body.classList.toggle("dark-mode");
    const theme = isDark ? "dark" : "light";
    localStorage.setItem(THEME_KEY, theme);
    updateThemeButton(isDark);
}

function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = savedTheme === "dark" || (!savedTheme && prefersDark);

    document.body.classList.toggle("dark-mode", shouldUseDark);
    updateThemeButton(shouldUseDark);
}

function updateThemeButton(isDark) {
    themeToggle.textContent = isDark ? "☀️" : "🌙";
    themeToggle.title = isDark ? "Switch to light mode" : "Switch to dark mode";
}

/* ===== HELPERS ===== */
function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function showMessage(message) {
    formMessage.textContent = message;
}

function clearMessage() {
    formMessage.textContent = "";
}