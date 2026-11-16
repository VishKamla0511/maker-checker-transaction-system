
const db = require("../config/database");

// Create Audit Log
const createAuditLog = async (
    connection,
    batchId,
    action,
    description,
    performedBy = null
) => {

    await connection.query(
        `INSERT INTO audit_logs
        (batch_id, action, description, performed_by)
        VALUES (?, ?, ?, ?)`,
        [
            batchId,
            action,
            description,
            performedBy
        ]
    );
};

// Get Audit Logs
const getAuditLogs = async () => {

    const [rows] = await db.query(
        `SELECT
            id,
            batch_id,
            action,
            description,
            performed_by,
            created_at
         FROM audit_logs
         ORDER BY id DESC`
    );

    return rows;
};

module.exports = {
    createAuditLog,
    getAuditLogs
};
