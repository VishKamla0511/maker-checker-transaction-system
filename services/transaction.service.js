
const csv = require("csv-parser");
const { Readable } = require("stream");

const db = require("../config/database");

const {
    validateTransaction
} = require("../validations/transaction.validation");

const Batch = require("../models/batch.model");
const Transaction = require("../models/transaction.model");
const AuditLog = require("../models/auditLog.model");

const REQUIRED_HEADERS = [
    "transaction_id",
    "customer_name",
    "account_number",
    "amount"
];

// Read and parse CSV
const parseCsv = (buffer) => {
    return new Promise((resolve, reject) => {
        const rows = [];
        const parser = csv();

        parser.on("headers", (headers) => {
            const normalizedHeaders = headers.map(header =>
                header.trim().toLowerCase()
            );

            const missingHeaders = REQUIRED_HEADERS.filter(
                header => !normalizedHeaders.includes(header)
            );

            if (missingHeaders.length) {
                parser.destroy(
                    new Error(
                        `Missing columns: ${missingHeaders.join(", ")}`
                    )
                );
            }
        });

        parser.on("data", (row) => {
            const formattedRow = {};

            Object.keys(row).forEach(key => {
                formattedRow[key.trim().toLowerCase()] = row[key];
            });

            rows.push(formattedRow);
        });

        parser.on("error", reject);

        parser.on("end", () => {
            if (!rows.length) {
                return reject(new Error("CSV contains no records"));
            }

            resolve(rows);
        });

        Readable.from(buffer).pipe(parser);
    });
};

// Upload CSV and process records
const uploadCsv = async (file) => {

    if (!file) {
        throw new Error("FILE_REQUIRED");
    }

    const rows = await parseCsv(file.buffer);

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const validRows = [];
        const invalidRows = [];

        // Store transaction IDs already found in this CSV
        const seenTransactions = new Set();

        // Validate every CSV row
        for (let i = 0; i < rows.length; i++) {

            const row = rows[i];

            const transactionId = String(
                row.transaction_id ?? ""
            ).trim();

            const duplicateKey = transactionId.toLowerCase();

            // Check duplicate Transaction ID inside CSV
            if (transactionId && seenTransactions.has(duplicateKey)) {

                invalidRows.push({
                    transaction_id: transactionId,
                    error_reason:
                        "Duplicate Transaction ID found in the uploaded CSV."
                });

                continue;
            }

            // Remember Transaction ID
            if (transactionId) {
                seenTransactions.add(duplicateKey);
            }

            // Validate current row
            const formattedRow = {
                ...row,
                transaction_id: transactionId
            };

            const result = validateTransaction(formattedRow);

            if (!result.isValid) {

                invalidRows.push({
                    transaction_id: transactionId || "Not provided",
                    error_reason: result.errors.join(", ")
                });

                continue;
            }

            // Check duplicate Transaction ID in database
            const exists = await Transaction.checkTransactionExists(
                connection,
                transactionId
            );

            if (exists) {

                invalidRows.push({
                    transaction_id: transactionId,
                    error_reason:
                        "This Transaction ID already exists in the database."
                });

                continue;
            }

            validRows.push(result.data);
        }

        // Reject entire CSV if any row is invalid
        if (invalidRows.length > 0 || validRows.length === 0) {

            const failureDetails = {
                file_name: file.originalname,
                total_records: rows.length,
                valid_records: validRows.length,
                invalid_records: invalidRows.length,
                errors: invalidRows
            };

            // Save failed upload in audit logs only
            await AuditLog.createAuditLog(
                connection,
                null,
                "UPLOAD_FAILED",
                JSON.stringify(failureDetails)
            );

            await connection.commit();

            return {
                success: false,
                batchId: null,
                totalRecords: rows.length,
                validRecords: 0,
                invalidRecords: invalidRows.length,
                status: "FAILED",
                message:
                    "CSV upload failed. Please check the Transaction ID errors.",
                errors: invalidRows
            };
        }

        // All rows valid: create batch
        const batchId = await Batch.createBatch(connection, {
            file_name: file.originalname,
            total_count: rows.length,
            valid_count: validRows.length,
            invalid_count: 0,
            status: "PENDING",
            errors: []
        });

        // Insert all transactions
        for (const transaction of validRows) {
            await Transaction.createTransaction(
                connection,
                batchId,
                transaction
            );
        }

        // Save successful upload audit log
        await AuditLog.createAuditLog(
            connection,
            batchId,
            "UPLOAD",
            `CSV uploaded successfully. Total: ${rows.length}, Valid: ${validRows.length}`
        );

        await connection.commit();

        return {
            success: true,
            batchId,
            totalRecords: rows.length,
            validRecords: validRows.length,
            invalidRecords: 0,
            status: "PENDING",
            message: "CSV uploaded successfully"
        };

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }
};

// Get all batches
const getBatches = async () => {
    return await Batch.getAllBatches();
};

// Get batch details
const getBatchDetails = async (batchId) => {

    const batch = await Batch.getBatchById(batchId);

    if (!batch) {
        throw new Error("BATCH_NOT_FOUND");
    }

    const transactions =
        await Transaction.getTransactionsByBatchId(batchId);

    let invalidRows = batch.errors || [];

    if (typeof invalidRows === "string") {
        invalidRows = JSON.parse(invalidRows);
    }

    return {
        batch,
        transactions,
        invalidRows
    };
};

// Approve batch
const approveBatch = async (batchId, checkerName) => {

    // Validate checker name
    if (
        typeof checkerName !== "string" ||
        !checkerName.trim()
    ) {
        throw new Error("CHECKER_NAME_REQUIRED");
    }

    checkerName = checkerName.trim();

    if (checkerName.length > 100) {
        throw new Error("CHECKER_NAME_TOO_LONG");
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Check batch ID
        const [batchRows] = await connection.query(
            "SELECT * FROM batches WHERE id = ? FOR UPDATE",
            [batchId]
        );

        if (!batchRows.length) {
            throw new Error("BATCH_NOT_FOUND");
        }

        // Check transactions
        const [transactionRows] = await connection.query(
            `SELECT status FROM transactions
             WHERE batch_id = ?
             FOR UPDATE`,
            [batchId]
        );

        if (!transactionRows.length) {
            throw new Error("NO_VALID_RECORDS");
        }

        // Check already authorized
        const alreadyAuthorized = transactionRows.some(
            transaction => transaction.status === "AUTHORIZED"
        );

        if (alreadyAuthorized) {
            throw new Error("BATCH_ALREADY_APPROVED");
        }

        // Check pending transactions
        const pendingTransactions = transactionRows.filter(
            transaction => transaction.status === "PENDING"
        );

        if (!pendingTransactions.length) {
            throw new Error("NO_PENDING_TRANSACTIONS");
        }

        // Authorize pending transactions
        const updatedCount = await Transaction.approveTransactions(
            connection,
            batchId
        );

        // Update batch status
        await Batch.updateBatchStatus(
            connection,
            batchId,
            "AUTHORIZED"
        );

        // Save approval audit log with checker name
        await AuditLog.createAuditLog(
            connection,
            batchId,
            "APPROVE",
            `${updatedCount} transactions authorized`,
            checkerName
        );

        await connection.commit();

        return {
            success: true,
            batchId,
            authorizedTransactions: updatedCount,
            status: "AUTHORIZED",
            checkerName,
            message: "Batch approved successfully"
        };

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }
};

// Get audit logs
const getAuditLogs = async () => {
    return await AuditLog.getAuditLogs();
};

module.exports = {
    uploadCsv,
    getBatches,
    getBatchDetails,
    approveBatch,
    getAuditLogs
};
