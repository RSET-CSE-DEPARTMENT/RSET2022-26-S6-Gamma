import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DatabaseAdmin.css";
import { createAdminApiCaller } from "./databaseAdminApi";

export default function DatabaseAdminRecords() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";
  const callAdminApi = useMemo(() => createAdminApiCaller(token), [token]);

  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [tableColumns, setTableColumns] = useState([]);
  const [primaryKey, setPrimaryKey] = useState("id");
  const [records, setRecords] = useState([]);
  const [updatePkValue, setUpdatePkValue] = useState("");
  const [deletePkValue, setDeletePkValue] = useState("");
  const [insertJson, setInsertJson] = useState("{\n  \n}");
  const [updateJson, setUpdateJson] = useState("{\n  \n}");
  const [loading, setLoading] = useState(false);

  const refreshTables = useCallback(async () => {
    const data = await callAdminApi({ action: "list_tables" });
    setTables(data.tables || []);
  }, [callAdminApi]);

  const loadTableDetails = useCallback(async (table) => {
    if (!table) return;
    const meta = await callAdminApi({ action: "describe_table", table });
    setTableColumns(meta.columns || []);
    setPrimaryKey(meta.primaryKey || "id");

    const rows = await callAdminApi({
      action: "select_records",
      table,
      limit: 50,
      offset: 0,
      orderBy: meta.primaryKey || "id",
      orderDir: "DESC",
    });
    setRecords(rows.records || []);
  }, [callAdminApi]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await refreshTables();
      } catch (error) {
        alert(error.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [refreshTables]);

  const handleLoadRecords = async () => {
    if (!selectedTable) return;
    try {
      await loadTableDetails(selectedTable);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleInsertRecord = async () => {
    if (!selectedTable) return;
    try {
      const data = JSON.parse(insertJson);
      await callAdminApi({ action: "insert_record", table: selectedTable, data });
      await loadTableDetails(selectedTable);
      alert("Record inserted");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleUpdateRecord = async () => {
    if (!selectedTable) return;
    try {
      const data = JSON.parse(updateJson);
      await callAdminApi({
        action: "update_record",
        table: selectedTable,
        primaryKey,
        primaryValue: updatePkValue,
        data,
      });
      await loadTableDetails(selectedTable);
      alert("Record updated");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteRecord = async () => {
    if (!selectedTable) return;
    if (!window.confirm(`Delete record where ${primaryKey}=${deletePkValue}?`)) return;
    try {
      await callAdminApi({
        action: "delete_record",
        table: selectedTable,
        primaryKey,
        primaryValue: deletePkValue,
      });
      await loadTableDetails(selectedTable);
      alert("Record deleted");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="dbadmin-page">
      <header className="dbadmin-header">
        <h1>Database Admin Control Panel</h1>
        <button className="dbadmin-btn dbadmin-btn-danger" onClick={handleLogout}>Logout</button>
      </header>

      <nav className="dbadmin-nav">
        <button className="dbadmin-tab" onClick={() => navigate("/database-admin/users")}>
          User Authorization
        </button>
        <button className="dbadmin-tab dbadmin-tab-active" onClick={() => navigate("/database-admin/records")}>
          Database Records
        </button>
      </nav>

      {loading && <p className="dbadmin-loading">Loading...</p>}

      <section className="dbadmin-card">
        <h2>Database Records Management</h2>
        <div className="dbadmin-toolbar">
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
          >
            <option value="">Select table</option>
            {tables.map((table) => (
              <option key={table} value={table}>
                {table}
              </option>
            ))}
          </select>
          <button className="dbadmin-btn" onClick={handleLoadRecords} disabled={!selectedTable}>
            Load Records
          </button>
          <button className="dbadmin-btn" onClick={refreshTables}>Refresh Tables</button>
          <span className="dbadmin-pk">Primary Key: {primaryKey || "n/a"}</span>
        </div>

        {selectedTable && (
          <>
            <p className="dbadmin-columns">Columns: {tableColumns.join(", ")}</p>

            <div className="dbadmin-records-grid">
              {records.map((record, index) => (
                <article className="dbadmin-record-card" key={index}>
                  {tableColumns.map((column) => (
                    <div className="dbadmin-record-row" key={column}>
                      <span className="dbadmin-record-key">{column}</span>
                      <span className="dbadmin-record-value">{String(record[column] ?? "")}</span>
                    </div>
                  ))}
                </article>
              ))}
            </div>

            <div className="dbadmin-ops-grid">
              <div className="dbadmin-op-card">
                <h3>Insert Record</h3>
                <textarea
                  rows={6}
                  value={insertJson}
                  onChange={(e) => setInsertJson(e.target.value)}
                />
                <button className="dbadmin-btn" onClick={handleInsertRecord}>Insert</button>
              </div>

              <div className="dbadmin-op-card">
                <h3>Update Record</h3>
                <input
                  placeholder={`Primary key value (${primaryKey})`}
                  value={updatePkValue}
                  onChange={(e) => setUpdatePkValue(e.target.value)}
                />
                <textarea
                  rows={6}
                  value={updateJson}
                  onChange={(e) => setUpdateJson(e.target.value)}
                />
                <button className="dbadmin-btn" onClick={handleUpdateRecord}>Update</button>
              </div>

              <div className="dbadmin-op-card">
                <h3>Delete Record</h3>
                <input
                  placeholder={`Primary key value (${primaryKey})`}
                  value={deletePkValue}
                  onChange={(e) => setDeletePkValue(e.target.value)}
                />
                <button className="dbadmin-btn dbadmin-btn-danger" onClick={handleDeleteRecord}>
                  Delete
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

