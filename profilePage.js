document.addEventListener("DOMContentLoaded", checkJWT);
// Existing functions in profilePage.js
document.getElementById("logoutButton").addEventListener("click", logout);
$('#myProfileBtn').on('click', function() {
  location.reload();
});

import {
  getTitleData,
  getAuditData,
  getLatestFinishedAudit,
  getLatestFinishedProject,
  getXpForProjects,
} from "./query.js";

const baseUrl = "https://learn.reboot01.com";
let userId = 0;

async function checkJWT() {
  const jwt = localStorage.getItem("hasura-jwt");
  if (!jwt) {
    window.location.href = "index.html";
  } else {
    await LoginWithJwt();
    await CheckJwtWithParse();
  }
  userId = await getUserId();
  displayData();
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

async function LoginWithJwt() {
  try {
    userId = await getUserId();
    if (!userId) {
      logout();
    }
  } catch (error) {
    logout();
  }
}

function CheckJwtWithParse() {
  const userData = parseJwt();
  if (!(userData && userData.userId)) {
    logout();
  }
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

export async function getUserId() {
  const query = `
      query {
          user {
              id
          }
      }
  `;
  return new Promise((resolve, reject) => {
    fetch(`${baseUrl}/api/graphql-engine/v1/graphql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("hasura-jwt")}`,
      },
      body: JSON.stringify({ query }),
    })
      .then((response) => {
        if (response.status !== 200) {
          reject(
            `could not get user id: ${response.status} ${response.statusText}`
          );
          return;
        }
        return response.json();
      })
      .then((data) => {
        if (data.errors) {
          reject(`could not get user id: ${data.errors[0].message}`);
          return;
        }
        if (data.data.user.length === 0) {
          reject(`user not found`);
          return;
        }
        resolve(data.data.user[0].id);
      });
  });
}

async function displayData() {
  try {
    var userData = await getTitleData(userId);
    $("#UserWel").text( "Welcome, "+ userData.firstName);
    $("#Userlvl").text("lvl"+userData.level);
    const auditData = await getAuditData(userId);
    //createBarChart(auditData);
  } catch (error) {
    alert(error.message);
  }
}

function createBarChart(data) {
  const { auditRatio, totalDown, totalUp } = data;

  // Prepare the data
  const chartData = [
    { label: "Audit Ratio", value: auditRatio },
    { label: "Total Down", value: totalDown },
    { label: "Total Up", value: totalUp },
  ];

  const width = 600;
  const height = 400;
  const margin = { top: 20, right: 30, bottom: 40, left: 40 };

  // Create SVG container
  const svg = d3
    .select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background-color", "#ccc")
    .style("display", "block")
    .style("margin", "auto");

  // Set the scales
  const x = d3
    .scaleBand()
    .domain(chartData.map((d) => d.label))
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(chartData, (d) => d.value)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  // Add the bars
  svg
    .selectAll(".bar")
    .data(chartData)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", (d) => x(d.label))
    .attr("y", (d) => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", (d) => y(0) - y(d.value))
    .attr("fill", (d) =>
      d.label === "Audit Ratio"
        ? "blue"
        : d.label === "Total Down"
        ? "red"
        : "green"
    );

  // Add the x-axis
  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  // Add the y-axis
  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));
}
