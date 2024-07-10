document.addEventListener("DOMContentLoaded", checkJWT);
// Existing functions in profilePage.js
document.getElementById("logoutButton").addEventListener("click", logout);
$("#myProfileBtn").on("click", function () {
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
    await displaytitleData();
    await displayXpData(userId);
    const latestFinishedAudit = await getLatestFinishedAudit(userId);
    const latestFinishedProject = await getLatestFinishedProject(userId);

    $("#latestAudit").text(
      "Latest Audit: " +
        latestFinishedAudit.captain +
        " " +
        latestFinishedAudit.projectName
    );
    $("#latestProject").text("Latest Project: " + latestFinishedProject);

    const auditData = await getAuditData(userId);
    createBarChart(auditData);
  } catch (error) {
    alert(error.message);
  }
}

async function displaytitleData() {
  try {
    var userData = await getTitleData(userId);
    $("#UserWel").text("Welcome, " + userData.firstName);
    $("#Userlvl").text("lvl" + userData.level);
  } catch (error) {
    alert(error.message);
  }
}

async function displayXpData(userId) {
  const xpData = await getXpForProjects(userId);
  // Sort xpData by amount in descending order
  const sortedXpData = xpData.sort((a, b) => b.amount - a.amount).slice(0, 8); //you can specidy how much of it you need
  // Create a formatted string for each project
  const xpDetails = sortedXpData
    .map((xp) => `${xp.name}: ${xp.amount} XP`)
    .join("\n");
  // Display total XP and detailed XP in the UI
  $("#xpDetails").text(xpDetails);

  createPieChart(sortedXpData);
}

function createBarChart(data) {
  const { auditRatio, totalDown, totalUp } = data;
  // Prepare the data
  const chartData = [
    { label: "Received", value: totalDown },
    { label: "Done", value: totalUp },
  ];
  $("#auditRatio").text("Audit ratio : " + parseFloat(auditRatio.toFixed(2)));
  const width = 600;
  const height = 100;
  const margin = { top: 20, right: 30, bottom: 20, left: 100 };

  // Create SVG container
  const svg = d3
    .select("#AuditChart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background-color", "white"); // Match the background color from the example
  //.style("display", "block")
  //.style("margin", "auto");

  // Set the scales
  const y = d3
    .scaleBand()
    .domain(chartData.map((d) => d.label))
    .range([margin.top, height - margin.bottom])
    .padding(0.3); // Adjust padding to match the style

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(chartData, (d) => d.value)])
    .nice()
    .range([margin.left, width - margin.right]);

  // Add the bars
  svg
    .selectAll(".bar")
    .data(chartData)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", margin.left)
    .attr("y", (d) => y(d.label))
    .attr("width", (d) => x(d.value) - margin.left)
    .attr("height", y.bandwidth())
    .attr("fill", "#black"); // Match the bar color from the example

  // Add the y-axis
  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickSize(0)) // Remove tick marks
    .selectAll("text")
    .style("fill", "#black") // Match the label color from the example
    .style("font-size", "16px")
    .style("font-weight", "bold");
  // Style the axis lines and ticks
  svg.selectAll(".domain, .tick line").style("stroke", "#black");
}

function createPieChart(data) {
  const width = 960,
    height = 450,
    radius = Math.min(width, height) / 2;

  const svg = d3
    .select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  svg.append("g").attr("class", "slices");
  svg.append("g").attr("class", "labels");

  const pie = d3
    .pie()
    .sort(null)
    .value((d) => d.amount);

  const arc = d3
    .arc()
    .outerRadius(radius * 0.8)
    .innerRadius(radius * 0.4);

  const outerArc = d3
    .arc()
    .innerRadius(radius * 0.9)
    .outerRadius(radius * 0.9);

  const color = d3
    .scaleOrdinal(d3.schemeCategory10)
    .domain(data.map((d) => d.name));

  const tooltip = d3.select("body").append("div").attr("class", "tooltip");

  function change(data) {
    const pieData = pie(data);

    const slice = svg
      .select(".slices")
      .selectAll("path.slice")
      .data(pieData, (d) => d.data.name);

    slice
      .enter()
      .append("path")
      .attr("class", "slice")
      .style("fill", (d) => color(d.data.name))
      .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(`${d.data.name}: ${d.data.amount} XP`)
          .style("left", event.pageX + 5 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        tooltip.transition().duration(500).style("opacity", 0);
      })
      .merge(slice)
      .transition()
      .duration(1000)
      .attrTween("d", function (d) {
        this._current = this._current || d;
        const interpolate = d3.interpolate(this._current, d);
        this._current = interpolate(0);
        return (t) => arc(interpolate(t));
      });

    slice.exit().remove();

    const text = svg
      .select(".labels")
      .selectAll("text")
      .data(pieData, (d) => d.data.name);

    text
      .enter()
      .append("text")
      .attr("dy", ".35em")
      .merge(text)
      .transition()
      .duration(1000)
      .attrTween("transform", function (d) {
        this._current = this._current || d;
        const interpolate = d3.interpolate(this._current, d);
        this._current = interpolate(0);
        return (t) => {
          const d2 = interpolate(t);
          const pos = outerArc.centroid(d2);
          pos[0] = radius * (midAngle(d2) < Math.PI ? 1 : -1);
          return `translate(${pos})`;
        };
      })
      .styleTween("text-anchor", function (d) {
        this._current = this._current || d;
        const interpolate = d3.interpolate(this._current, d);
        this._current = interpolate(0);
        return (t) => {
          const d2 = interpolate(t);
          return midAngle(d2) < Math.PI ? "start" : "end";
        };
      });

    text.exit().remove();
  }

  function midAngle(d) {
    return d.startAngle + (d.endAngle - d.startAngle) / 2;
  }

  change(data);

  d3.select(".randomize").on("click", () => change(data));
}
