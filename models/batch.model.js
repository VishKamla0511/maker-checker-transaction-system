
const db = require("../config/database");

// Create batch
const createBatch = async (connection, batchData) => {

    const sql = `
        INSERT INTO batches
        (
            file_name,
            total_count,
            valid_count,
            invalid_count,
            status,
            errors
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
        batchData.file_name ?? null,
        batchData.total_count ?? 0,
        batchData.valid_count ?? 0,
        batchData.invalid_count ?? 0,
        batchData.status ?? "PENDING",
        JSON.stringify(batchData.errors || [])
    ];

    const [result] = await connection.execute(sql, values);

    return result.insertId;
};


// Get all batches
const getAllBatches = async () => {
    const [rows] = await db.execute(`
        SELECT b.*
        FROM batches b
        WHERE EXISTS (
            SELECT 1
            FROM transactions t
            WHERE t.batch_id = b.id
        )
        ORDER BY b.id DESC
    `);

    return rows;
};


// Get batch by ID
const getBatchById = async (id) => {

    const [rows] = await db.execute(
        "SELECT * FROM batches WHERE id = ?",
        [id]
    );

    return rows[0];
};


// Update batch status
const updateBatchStatus = async (connection, batchId, status) => {

    const sql = `
        UPDATE batches
        SET status = ?
        WHERE id = ?
    `;

    const [result] = await connection.execute(sql, [
        status,
        batchId
    ]);

    return result.affectedRows;
};


// Export functions
module.exports = {
    createBatch,
    getAllBatches,
    getBatchById,
    updateBatchStatus
};
