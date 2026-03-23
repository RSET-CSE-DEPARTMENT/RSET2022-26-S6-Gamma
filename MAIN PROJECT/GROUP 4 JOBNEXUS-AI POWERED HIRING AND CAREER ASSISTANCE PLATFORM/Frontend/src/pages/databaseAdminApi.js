const API_BASE = process.env.REACT_APP_PHP_API_BASE || "http://localhost/JobNexus/Backend-PHP/api";

export function createAdminApiCaller(token) {
  return async (payload) => {
    const response = await fetch(`${API_BASE}/database-admin-control.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(raw || "Invalid server response");
    }

    if (!data.success) {
      throw new Error(data.message || "Operation failed");
    }

    return data;
  };
}

