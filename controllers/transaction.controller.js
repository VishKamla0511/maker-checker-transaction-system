
const transactionService = require("../services/transaction.service");
const MESSAGE = require("../constants/messages");

// Upload CSV
const uploadCsv = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select a CSV file"
            });
        }

        const result = await transactionService.uploadCsv(req.file);

        return res.status(result.success ? 201 : 400).json(result);

    } catch (error) {
        next(error);
    }
};

// Get all batches
const getBatches = async (req, res) => {
    try {
        const result = await transactionService.getBatches();

        return res.status(200).json({
            success: true,
            message: MESSAGE.BATCH_FETCHED,
            data: result
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: MESSAGE.INTERNAL_ERROR
        });
    }
};

// Get batch details
const getBatchDetails = async (req, res) => {
    try {
        const result = await transactionService.getBatchDetails(
            req.params.id
        );

        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        const statusCode =
            error.message === "BATCH_NOT_FOUND" ? 404 : 500;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

// Approve batch
const approveBatch = async (req, res) => {
    try {
        const checkerName = req.body?.checker_name;

        // Validate checker name
        if (
            typeof checkerName !== "string" ||
            !checkerName.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Checker name is required."
            });
        }

        if (checkerName.trim().length > 100) {
            return res.status(400).json({
                success: false,
                message: "Checker name cannot exceed 100 characters."
            });
        }

        const result = await transactionService.approveBatch(
            req.params.id,
            checkerName.trim()
        );

        return res.status(200).json({
            success: true,
            message: MESSAGE.BATCH_APPROVED,
            data: result
        });

    } catch (error) {
        const errorMessages = {
            BATCH_NOT_FOUND: 404,
            BATCH_ALREADY_APPROVED: 400,
            NO_VALID_RECORDS: 400,
            NO_PENDING_TRANSACTIONS: 400,
            CHECKER_NAME_REQUIRED: 400
        };

        return res.status(errorMessages[error.message] || 500).json({
            success: false,
            message:
                MESSAGE[error.message] ||
                (errorMessages[error.message]
                    ? error.message.replace(/_/g, " ")
                    : MESSAGE.INTERNAL_ERROR)
        });
    }
};

// Get audit logs
const getAuditLogs = async (req, res) => {
    try {
        const result = await transactionService.getAuditLogs();

        return res.status(200).json({
            success: true,
            message: MESSAGE.AUDIT_FETCHED,
            data: result
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: MESSAGE.INTERNAL_ERROR
        });
    }
};

module.exports = {
    uploadCsv,
    getBatches,
    getBatchDetails,
    approveBatch,
    getAuditLogs
};
