const express = require("express");
const router = express.Router();

const transactionController = require("../controllers/transaction.controller");
const upload = require("../middlewares/upload.middleware");

router.post(
    "/upload",
    upload, 
    transactionController.uploadCsv
);

// 2. Get all batches
router.get(
    "/batches",
    transactionController.getBatches
);


// 3. Get batch details
router.get(
    "/batches/:id",
    transactionController.getBatchDetails
);


// 4. Approve batch
router.post(
    "/batches/:id/approve",
    transactionController.approveBatch
);


// 5. Get audit logs
router.get(
    "/audit-logs",
    transactionController.getAuditLogs
);


module.exports = router;