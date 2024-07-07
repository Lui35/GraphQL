document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const profileInfo = document.getElementById('profile-info');
    const logoutButton = document.getElementById('logout-button');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('https://((DOMAIN))/api/auth/signin', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Basic ' + btoa(username + ':' + password),
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) throw new Error('Invalid credentials');

                const data = await response.json();
                localStorage.setItem('token', data.token);
                window.location.href = 'profile.html';
            } catch (error) {
                errorMessage.textContent = error.message;
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    }

    if (profileInfo) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        async function fetchProfile() {
            try {
                const response = await fetch('https://learn.reboot01.com/api/graphql-engine/v1/graphql', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        query: `
                        query {
                            user {
                                id
                                login
                            }
                        }`
                    })
                });

                if (!response.ok) throw new Error('Failed to fetch profile');

                const data = await response.json();
                const user = data.data.user[0];
                profileInfo.innerHTML = `
                    <p>ID: ${user.id}</p>
                    <p>Login: ${user.login}</p>
                `;
            } catch (error) {
                profileInfo.textContent = error.message;
            }
        }

        fetchProfile();
    }
});
