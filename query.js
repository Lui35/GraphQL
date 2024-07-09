const baseUrl = "https://learn.reboot01.com";

export async function fetchGraphQL(query, variables, errorMessage) {
  return new Promise((resolve, reject) => {
    fetch(`${baseUrl}/api/graphql-engine/v1/graphql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("hasura-jwt")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    })
      .then((response) => {
        if (response.status !== 200) {
          reject(`${errorMessage}: ${response.status} ${response.statusText}`);
          return;
        }
        return response.json();
      })
      .then((data) => {
        if (data.errors) {
          reject(`${errorMessage}: ${data.errors[0].message}`);
          return;
        }
        resolve(data.data);
      });
  });
}

function getLastSlug(path) {
  const segments = path.split('/');
  return segments[segments.length - 1];
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
      throw new Error(
        `could not get user id: ${response.status} ${response.statusText}`
      );
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

export async function getTitleData(userId) {
  const query = `
          query GetTitleData($userId: Int) {
              event_user(where: { userId: { _eq: $userId }, eventId: { _eq: 20 } }) {
                  level
              }
              user(where: { id: { _eq: $userId } }) {
                  firstName
              }
          }
      `;
  const variables = { userId };
  const errorMessage = "could not get title data";

  const data = await fetchGraphQL(query, variables, errorMessage);

  if (data.user.length === 0 || data.event_user.length === 0) {
    throw new Error("user not found");
  }

  return {
    firstName: data.user[0].firstName,
    level: data.event_user[0].level,
  };
}

export async function getAuditData(userId) {
  const query = `
          query User($userId: Int) {
              user(where: { id: { _eq: $userId } }) {
                  auditRatio
                  totalDown
                  totalUp
              }
          }
      `;
  const variables = { userId };
  const errorMessage = "could not get audit data";

  const data = await fetchGraphQL(query, variables, errorMessage);

  if (data.user.length === 0) {
    throw new Error("user not found");
  }

  return data.user[0];
}

export async function getLatestFinishedAudit(userId) {
  const query = `
          query Audit($userId: Int) {
              audit(
                  where: { auditorId: { _eq: $userId }, grade: { _is_null: false } }
                  limit: 1
                  order_by: {endAt: desc}
              ) {
                  grade
                  group {
                      captainLogin
                      path
                  }
              }
          }
      `;
  const variables = { userId };
  const errorMessage = "could not get last audit data";

  const data = await fetchGraphQL(query, variables, errorMessage);

  if (data.audit.length === 0) {
    throw new Error("audit not found");
  }

  return {
    projectName: getLastSlug(data.audit[0].group.path),
    captain: data.audit[0].group.captainLogin,
    didPass: data.audit[0].grade >= 1,
  };
}

export async function getLatestFinishedProject(userId) {
  const query = `
          query Group($userId: Int) {
              group(
                  where: {
                      members: { userId: { _eq: $userId } }
                      eventId: { _eq: 20 }
                      status: { _eq: finished }
                  }
                  limit: 1
                  order_by: {updatedAt: desc}
              ) {
                  path
              }
          }
      `;
  const variables = { userId };
  const errorMessage = "could not get last group data";

  const data = await fetchGraphQL(query, variables, errorMessage);

  if (data.group.length === 0) {
    throw new Error("group not found");
  }

  return getLastSlug(data.group[0].path);
}

export async function getXpForProjects(userId) {
  const query = `
          query Transaction($userId: Int) {
              transaction(
                  where: { eventId: { _eq: 20 }, userId: { _eq: $userId }, type: { _eq: "xp" } }
                  order_by: {createdAt: desc}
              ) {
                  amount
                  createdAt
                  path
              }
          }
      `;
  const variables = { userId };
  const errorMessage = "could not get transactions data";

  const data = await fetchGraphQL(query, variables, errorMessage);

  if (data.transaction.length === 0) {
    throw new Error("no transactions found");
  }

  return data.transaction.map((t) => ({
    amount: t.amount,
    name: getLastSlug(t.path),
  }));
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