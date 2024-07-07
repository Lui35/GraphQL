document.addEventListener("DOMContentLoaded", checkJWT);
// Existing functions in profilePage.js
document.getElementById("logoutButton").addEventListener("click", logout);

const baseUrl = "https://learn.reboot01.com";

function checkJWT() {
  const jwt = localStorage.getItem("hasura-jwt");
  if (!jwt) {
    window.location.href = "index.html";
  }
}

async function logout() {
  const data = {
    headers: {
      "x-jwt-token": localStorage.getItem("hasura-jwt") || "",
    },
    method: "GET",
  };
  await fetch(`${baseUrl}/api/auth/expire`, data);
  data.method = "POST";
  await fetch(`${baseUrl}/api/auth/signout`, data);
  window.location.href = "index.html";
  localStorage.removeItem("hasura-jwt");
}

export function parseJwt() {
  const token = localStorage.getItem("hasura-jwt") || "";
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );
  const json = JSON.parse(jsonPayload);
  return {
    userId: json["https://hasura.io/jwt/claims"]["x-hasura-user-id"],
  };
}
