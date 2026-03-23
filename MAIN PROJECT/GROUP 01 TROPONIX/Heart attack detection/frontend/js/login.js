import { login } from '../api.js';

const loginForm = document.getElementById('loginForm');
const errorAlert = document.getElementById('errorAlert');

// Role selector logic
const roleOptions = document.querySelectorAll('.role-option');
roleOptions.forEach(opt =>
  opt.addEventListener('click', () => {
    roleOptions.forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
  })
);

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const role = document.querySelector('.role-option.active').dataset.role;

  const res = await login(username, password);

  if (res.error) {
    errorAlert.textContent = res.error;
    errorAlert.style.display = 'block';
    return;
  }

  // store the user securely
  localStorage.setItem('user', JSON.stringify({
    username: res.user.username,
    role: role,
    name: res.user.name || res.user.username
  }));

  window.location.href = 'dashboard.html';
});
