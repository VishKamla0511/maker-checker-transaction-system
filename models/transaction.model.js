const db = require("../config/database");

const checkTransactionExists = async (connection, transactionId) => {

    const [rows] = await connection.query(
        `SELECT id FROM transactions
         WHERE transaction_id = ?`,
        [transactionId]
    );

    return rows.length > 0;
};

const createTransaction = async (connection, batchId, data) => {

    await connection.query(
        `INSERT INTO transactions
        (batch_id, transaction_id, customer_name,
         account_number, amount, status)
        VALUES (?, ?, ?, ?, ?, 'PENDING')`,
        [
            batchId,
            data.transaction_id,
            data.customer_name,
            data.account_number,
            data.amount
        ]
    );
};

// const saveInvalidRow = async (connection, batchId, data) => {

//     await connection.query(
//         `INSERT INTO batch_errors
//         (batch_id, row_number, transaction_id, error_reason)
//         VALUES (?, ?, ?, ?)`,
//         [
//             batchId,
//             data.row_number,
//             data.transaction_id,
//             data.error_reason
//         ]
//     );
// };

const getTransactionsByBatchId = async (id) => {

    const [rows] = await db.query(
        `SELECT * FROM transactions WHERE batch_id = ?`,
        [id]
    );

    return rows;
};

// const getInvalidRowsByBatchId = async (id) => {

//     const [rows] = await db.query(
//         `SELECT * FROM batch_errors WHERE batch_id = ?`,
//         [id]
//     );

//     return rows;
// };

const approveTransactions = async (connection, batchId) => {

    const [result] = await connection.query(
        `UPDATE transactions
         SET status = 'AUTHORIZED'
         WHERE batch_id = ? AND status = 'PENDING'`,
        [batchId]
    );

    return result.affectedRows;
};

module.exports = {
    checkTransactionExists,
    createTransaction,
    // saveInvalidRow,
    getTransactionsByBatchId,
    // getInvalidRowsByBatchId,
    approveTransactions
};