const todoForm = document.getElementById("todoForm");
const todoInput = document.getElementById("todoInput");
const todoList = document.getElementById("todoList");
const todoStats = document.getElementById("todoStats");
const emptyState = document.getElementById("emptyState");

const STORAGE_KEY = "ourShrineTodos";

let todos = loadTodos();

function loadTodos() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item.text === "string" && typeof item.done === "boolean");
  } catch {
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function updateStats() {
  const completed = todos.filter((todo) => todo.done).length;
  const pending = todos.length - completed;
  todoStats.textContent = `${pending} pending • ${completed} completed`;
  emptyState.hidden = todos.length > 0;
}

function toggleTodo(index) {
  todos[index].done = !todos[index].done;
  saveTodos();
  renderTodos();
}

function deleteTodo(index) {
  todos.splice(index, 1);
  saveTodos();
  renderTodos();
}

function createTodoItem(todo, index) {
  const item = document.createElement("li");
  item.className = "todo-item";

  const left = document.createElement("div");
  left.className = "todo-left";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = todo.done;
  checkbox.addEventListener("change", () => toggleTodo(index));

  const text = document.createElement("span");
  text.className = `todo-text ${todo.done ? "done" : ""}`;
  text.textContent = todo.text;

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => deleteTodo(index));

  left.append(checkbox, text);
  item.append(left, deleteBtn);
  return item;
}

function renderTodos() {
  todoList.innerHTML = "";
  todos.forEach((todo, index) => {
    todoList.appendChild(createTodoItem(todo, index));
  });
  updateStats();
}

todoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = todoInput.value.trim();
  if (!text) return;

  todos.push({ text, done: false });
  saveTodos();
  renderTodos();
  todoForm.reset();
  todoInput.focus();
});

renderTodos();
