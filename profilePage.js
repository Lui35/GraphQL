document.addEventListener("DOMContentLoaded", checkJWT);
// Existing functions in profilePage.js
document.getElementById("logoutButton").addEventListener("click", logout);
import { getTitleData, getAuditData, getLatestFinishedAudit, getLatestFinishedProject, getXpForProjects } from './query.js';

const baseUrl = "https://learn.reboot01.com";

function checkJWT() {
  const jwt = localStorage.getItem("hasura-jwt");
  if (!jwt) {
    window.location.href = "index.html";
  }else{
    LoginWithJwt();
    CheckJwtWithParse();
  }
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
    const userId = await getUserId();
    alert(`LoginWithJwt: ${userId}`);
  } catch (error) {
    logout();
  }
}


function CheckJwtWithParse() {
  const userData = parseJwt();
  if (userData && userData.userId) {
    alert(`CheckJwtWithParse: ${userData.userId}`);
  } else {
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
  try {
    const response = await fetch(`${baseUrl}/api/graphql-engine/v1/graphql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("hasura-jwt")}`,
      },
      body: JSON.stringify({ query }),
    });

    if (response.status !== 200) {
      throw new Error(`could not get user id: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`could not get user id: ${data.errors[0].message}`);
    }

    if (data.data.user.length === 0) {
      throw new Error(`user not found`);
    }

    return data.data.user[0].id;
  } catch (error) {
    logout();
    throw error;
  }
}

async function displayData() {
  try {
    const userId = await getUserId(); // Ensure getUserId is defined and imported if necessary
    const auditData = await getAuditData(userId);

    createBarChart(auditData);
  } catch (error) {
    alert(error.message);
  }
}

function createBarChart(data) {
  const { auditRatio, totalDown, totalUp } = data;

  // Prepare the data
  const chartData = [
    { label: 'Audit Ratio', value: auditRatio },
    { label: 'Total Down', value: totalDown },
    { label: 'Total Up', value: totalUp }
  ];

  const width = 600;
  const height = 400;
  const margin = { top: 20, right: 30, bottom: 40, left: 40 };

  // Create SVG container
  const svg = d3.select('body')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('background-color', '#ccc')
    .style('display', 'block')
    .style('margin', 'auto');

  // Set the scales
  const x = d3.scaleBand()
    .domain(chartData.map(d => d.label))
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(chartData, d => d.value)]).nice()
    .range([height - margin.bottom, margin.top]);

  // Add the bars
  svg.selectAll('.bar')
    .data(chartData)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.label))
    .attr('y', d => y(d.value))
    .attr('width', x.bandwidth())
    .attr('height', d => y(0) - y(d.value))
    .attr('fill', d => d.label === 'Audit Ratio' ? 'blue' : d.label === 'Total Down' ? 'red' : 'green');

  // Add the x-axis
  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  // Add the y-axis
  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));
}

