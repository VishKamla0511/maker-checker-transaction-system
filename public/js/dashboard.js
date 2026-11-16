
const API_BASE_URL = "";

// HTML Elements
const batchTable = document.getElementById("batchTable");
const transactionTable = document.getElementById("transactionTable");
const auditTable = document.getElementById("auditTable");

const uploadForm = document.getElementById("uploadForm");
const uploadBtn = document.getElementById("uploadBtn");
const uploadResult = document.getElementById("uploadResult");
const csvFile = document.getElementById("csvFile");
const clearFileBtn = document.getElementById("clearFileBtn");

const auditModal = document.getElementById("auditModal");
const auditModalBody = document.getElementById("auditModalBody");
const closeAuditModal = document.getElementById("closeAuditModal");

// Approval Modal Elements
const approvalModal = document.getElementById("approvalModal");
const approvalForm = document.getElementById("approvalForm");
const checkerNameInput = document.getElementById("checkerName");

const confirmApprovalBtn = document.getElementById("confirmApprovalBtn");
const cancelApprovalBtn = document.getElementById("cancelApprovalBtn");
const closeApprovalModal = document.getElementById("closeApprovalModal");

// Selected Batch
let selectedBatchId = null;

// Store batches and audit logs
let batches = [];
let currentAuditLogs = [];

// Escape HTML values
function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[char];
    });
}

// Show Toast Notification
function showToast(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// Common API Function
async function apiRequest(url, options = {}) {
    const response = await fetch(API_BASE_URL + url, options);

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error("Server returned an invalid response.");
    }

    if (!response.ok) {
        const error = new Error(
            result.message || "Something went wrong."
        );

        error.responseData = result;

        throw error;
    }

    return result;
}

// Get Response Data
function getData(result) {
    return result?.data ?? result;
}

// Get Array From API Response
function getArray(data, possibleKeys) {
    if (Array.isArray(data)) {
        return data;
    }

    for (const key of possibleKeys) {
        if (Array.isArray(data?.[key])) {
            return data[key];
        }
    }

    return [];
}

// Get Validation Errors
function getValidationErrors(data) {
    return getArray(data, [
        "errors",
        "invalidRows",
        "invalid_rows"
    ]);
}

// Display Validation Errors
function renderValidationErrors(errors) {
    if (!errors || errors.length === 0) {
        return "";
    }

    let html = `
        <ul class="error-list">
    `;

    errors.forEach(error => {
        const transactionId =
            error.transaction_id ??
            error.transactionId ??
            "Not provided";

        const reason =
            error.error_reason ??
            error.errorReason ??
            error.reason ??
            error.message ??
            "Invalid transaction";

            html += `
            <li>
                <strong>Transaction ID:</strong>
                ${escapeHtml(transactionId)},
                ${escapeHtml(reason)}
            </li>
            `;
    });

    html += "</ul>";

    return html;
}

// Format Date
function formatDate(date) {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return String(date);
    }

    return parsedDate.toLocaleString();
}

// Get Batch ID
function getBatchId(batch) {
    return batch.id ?? batch.batch_id ?? batch.batchId;
}

// Get Transaction Count
function getTransactionCount(batch) {
    return Number(
        batch.total_transactions ??
        batch.transaction_count ??
        batch.valid_count ??
        batch.total_count ??
        batch.totalRecords ??
        0
    );
}

// Get Status
function getStatus(item) {
    return String(item.status ?? "PENDING").toUpperCase();
}

// Update Dashboard Summary
function updateSummary() {
    let totalTransactions = 0;
    let pendingTransactions = 0;
    let authorizedTransactions = 0;

    batches.forEach(batch => {
        const count = getTransactionCount(batch);
        const status = getStatus(batch);

        totalTransactions += count;

        if (status === "PENDING") {
            pendingTransactions += count;
        }

        if (status === "AUTHORIZED") {
            authorizedTransactions += count;
        }
    });

    document.getElementById("totalBatches").textContent =
        batches.length;

    document.getElementById("totalTransactions").textContent =
        totalTransactions;

    document.getElementById("pendingTransactions").textContent =
        pendingTransactions;

    document.getElementById("authorizedTransactions").textContent =
        authorizedTransactions;
}

// Load Batches
async function loadBatches() {
    try {
        const result = await apiRequest("/batches");

        const data = getData(result);

        batches = getArray(data, [
            "batches",
            "results"
        ]);

        updateSummary();

        renderBatches();

    } catch (error) {
        batchTable.innerHTML = `
            <tr>
                <td colspan="5">
                    ${escapeHtml(error.message)}
                </td>
            </tr>
        `;
    }
}

// Display Batches
function renderBatches() {
    if (batches.length === 0) {
        batchTable.innerHTML = `
            <tr>
                <td colspan="5">No batches found.</td>
            </tr>
        `;

        return;
    }

    batchTable.innerHTML = batches.map(batch => {
        const batchId = getBatchId(batch);
        const status = getStatus(batch);
        const count = getTransactionCount(batch);

        const statusClass = status.toLowerCase();

        const approveButton = status === "PENDING"
            ? `
                <button
                    class="action-btn approve-btn"
                    data-action="approve"
                    data-id="${escapeHtml(batchId)}">
                    Approve
                </button>
            `
            : "";

        return `
            <tr>
                <td>${escapeHtml(batchId)}</td>

                <td>${count}</td>

                <td>
                    <span class="status status-${escapeHtml(statusClass)}">
                        ${escapeHtml(status)}
                    </span>
                </td>

                <td>
                    ${escapeHtml(formatDate(
                        batch.created_at ?? batch.createdAt
                    ))}
                </td>

                <td>
                    <button
                        class="action-btn view-btn"
                        data-action="view"
                        data-id="${escapeHtml(batchId)}">
                        View
                    </button>

                    ${approveButton}
                </td>
            </tr>
        `;
    }).join("");
}

// View Batch Transactions
async function viewBatch(batchId) {
    try {
        const result = await apiRequest(
            `/batches/${encodeURIComponent(batchId)}`
        );

        const data = getData(result);

        const transactions = getArray(data, [
            "transactions",
            "records",
            "results"
        ]);

        document.getElementById("selectedBatchText").textContent =
            `Batch ID: ${batchId}`;

        renderTransactions(transactions);

        document.getElementById("batchDetails").scrollIntoView({
            behavior: "smooth"
        });

    } catch (error) {
        showToast(error.message);
    }
}

// Display Transactions
function renderTransactions(transactions) {
    if (!transactions || transactions.length === 0) {
        transactionTable.innerHTML = `
            <tr>
                <td colspan="4">No transactions found.</td>
            </tr>
        `;

        return;
    }

    transactionTable.innerHTML = transactions.map(transaction => {
        const status = String(
            transaction.status || "-"
        ).toUpperCase();

        const statusClass = status.toLowerCase();

        return `
            <tr>
                <td>
                    ${escapeHtml(transaction.transaction_id || "-")}
                </td>

                <td>
                    ${escapeHtml(transaction.account_number || "-")}
                </td>

                <td>
                    ${escapeHtml(transaction.amount ?? "-")}
                </td>

                <td>
                    <span class="status-badge ${escapeHtml(statusClass)}">
                        ${escapeHtml(status)}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}

// Open Checker Approval Popup
function approveBatch(batchId) {
    selectedBatchId = batchId;

    checkerNameInput.value = "";

    approvalModal.classList.add("show");

    checkerNameInput.focus();
}

// Close Approval Popup
function closeApprovalPopup() {
    approvalModal.classList.remove("show");

    approvalForm.reset();

    selectedBatchId = null;
}

// Cancel Approval
cancelApprovalBtn.addEventListener("click", function () {
    closeApprovalPopup();
});

// Close Approval Popup
closeApprovalModal.addEventListener("click", function () {
    closeApprovalPopup();
});

// Close Popup When Clicking Outside
approvalModal.addEventListener("click", function (event) {
    if (event.target === approvalModal) {
        closeApprovalPopup();
    }
});

// Confirm Batch Approval
approvalForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const checkerName = checkerNameInput.value.trim();

    if (!checkerName) {
        showToast("Please enter checker name.");
        checkerNameInput.focus();
        return;
    }

    if (!selectedBatchId) {
        showToast("Please select a valid batch.");
        return;
    }

    const batchId = selectedBatchId;

    confirmApprovalBtn.disabled = true;
    confirmApprovalBtn.textContent = "Approving...";

    try {
        await apiRequest(
            `/batches/${encodeURIComponent(batchId)}/approve`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    checker_name: checkerName
                })
            }
        );

        closeApprovalPopup();

        showToast("Batch approved successfully.");

        await Promise.all([
            loadBatches(),
            loadAuditLogs()
        ]);

        if (
            document.getElementById("selectedBatchText").textContent ===
            `Batch ID: ${batchId}`
        ) {
            await viewBatch(batchId);
        }

    } catch (error) {
        showToast(error.message);

    } finally {
        confirmApprovalBtn.disabled = false;
        confirmApprovalBtn.textContent = "Confirm Approval";
    }
});

// Load Audit Logs
async function loadAuditLogs() {
    try {
        const result = await apiRequest("/audit-logs");

        const data = getData(result);

        const logs = getArray(data, [
            "logs",
            "auditLogs",
            "audit_logs",
            "results"
        ]);

        renderAuditLogs(logs);

    } catch (error) {
        auditTable.innerHTML = `
            <tr>
                <td colspan="5">
                    ${escapeHtml(error.message)}
                </td>
            </tr>
        `;
    }
}

// Display Audit Logs
function renderAuditLogs(logs) {
    currentAuditLogs = logs;

    if (logs.length === 0) {
        auditTable.innerHTML = `
            <tr>
                <td colspan="5">No audit logs found.</td>
            </tr>
        `;

        return;
    }

    auditTable.innerHTML = logs.map((log, index) => {
        const action = log.action ?? log.action_type ?? "-";

        const isFailed = action === "UPLOAD_FAILED";

        const batchId = log.batch_id ?? log.batchId ?? "-";

        const performedBy =
            log.performed_by ??
            log.performedBy ??
            "-";

        const createdAt = formatDate(
            log.created_at ?? log.createdAt
        );

        const detailsButton = isFailed
            ? `
                <button
                    class="action-btn details-btn"
                    data-action="view-audit"
                    data-index="${index}">
                    View Errors
                </button>
            `
            : "-";

        return `
            <tr>
                <td>
                    ${escapeHtml(action)}

                    ${isFailed
                        ? '<span class="failed-status">FAILED</span>'
                        : ''
                    }
                </td>

                <td>${escapeHtml(batchId)}</td>

                <td>${escapeHtml(performedBy)}</td>

                <td>${escapeHtml(createdAt)}</td>

                <td>${detailsButton}</td>
            </tr>
        `;
    }).join("");
}

// Show Failed Upload Details
function showAuditDetails(log) {
    let details = log.description ?? log.details ?? {};

    if (typeof details === "string") {
        try {
            details = JSON.parse(details);
        } catch {
            details = {
                message: details
            };
        }
    }

    const errors = Array.isArray(details.errors)
        ? details.errors
        : [];

    let html = `
        <div class="audit-info">

            <p>
                <strong>File Name:</strong>
                ${escapeHtml(details.file_name ?? "-")}
            </p>

            <p>
                <strong>Total Records:</strong>
                ${escapeHtml(details.total_records ?? 0)}
            </p>

            <p>
                <strong>Valid Records:</strong>
                ${escapeHtml(details.valid_records ?? 0)}
            </p>

            <p>
                <strong>Invalid Records:</strong>
                ${escapeHtml(
                    details.invalid_records ?? errors.length
                )}
            </p>

            <p>
                <strong>Status:</strong>
                <span class="failed-status">FAILED</span>
            </p>

        </div>

        <hr>

        <h3 style="margin-top: 15px;">
            Validation Errors
        </h3>
    `;

    if (errors.length > 0) {
        html += renderValidationErrors(errors);
    } else {
        html += `
            <p>
                ${escapeHtml(
                    details.message ??
                    "No transaction error details available."
                )}
            </p>
        `;
    }

    auditModalBody.innerHTML = html;

    auditModal.classList.remove("hidden");
}

// Close Audit Modal
closeAuditModal.addEventListener("click", function () {
    auditModal.classList.add("hidden");
});

// Close Audit Modal When Clicking Outside
auditModal.addEventListener("click", function (event) {
    if (event.target === auditModal) {
        auditModal.classList.add("hidden");
    }
});

// Audit Table Button Click
auditTable.addEventListener("click", function (event) {
    const button = event.target.closest(
        'button[data-action="view-audit"]'
    );

    if (!button) return;

    const index = Number(button.dataset.index);

    const log = currentAuditLogs[index];

    if (log) {
        showAuditDetails(log);
    }
});

// Upload CSV
uploadForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const file = csvFile.files[0];

    if (!file) {
        showToast("Please select a CSV file.");
        return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
        showToast("Please select a valid CSV file.");
        return;
    }

    const formData = new FormData();

    // Must match upload.single("file") in backend
    formData.append("file", file);

    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading...";

    uploadResult.classList.remove("hidden");

    uploadResult.textContent = "Uploading and validating CSV...";

    try {
        const result = await apiRequest("/upload", {
            method: "POST",
            body: formData
        });

        const data = getData(result);

        if (data.success === false) {
            const errors = getValidationErrors(data);

            let html = `
                <strong>
                    ${escapeHtml(
                        data.message ?? "CSV upload failed."
                    )}
                </strong>
            `;

            html += renderValidationErrors(errors);

            uploadResult.innerHTML = html;

            showToast("CSV upload failed.");

            return;
        }

        let html = `
            <strong>
                ${escapeHtml(
                    data.message ?? "CSV uploaded successfully."
                )}
            </strong>
        `;

        const batchId =
            data.batchId ??
            data.batch_id ??
            data.id;

        if (batchId) {
            html += `
                <p>
                    Batch ID: ${escapeHtml(batchId)}
                </p>
            `;
        }

        const totalCount =
            data.totalRecords ??
            data.total_count;

        if (totalCount !== undefined) {
            html += `
                <p>
                    Total records: ${escapeHtml(totalCount)}
                </p>
            `;
        }

        const validCount =
            data.validCount ??
            data.valid_count ??
            data.validRecords;

        if (validCount !== undefined) {
            html += `
                <p>
                    Valid records: ${escapeHtml(validCount)}
                </p>
            `;
        }

        const invalidCount =
            data.invalidCount ??
            data.invalid_count ??
            data.invalidRecords;

        if (invalidCount !== undefined) {
            html += `
                <p>
                    Invalid records: ${escapeHtml(invalidCount)}
                </p>
            `;
        }

        uploadResult.innerHTML = html;

        csvFile.value = "";

        showToast("CSV uploaded successfully.");

    } catch (error) {
        const errorData =
            error.responseData?.data ??
            error.responseData ??
            {};

        const errors = getValidationErrors(errorData);

        let html = `
            <strong>
                ${escapeHtml(error.message)}
            </strong>
        `;

        html += renderValidationErrors(errors);

        uploadResult.innerHTML = html;

        showToast(error.message);

    } finally {
        uploadResult.classList.remove("hidden");

        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload CSV";

        await Promise.all([
            loadBatches(),
            loadAuditLogs()
        ]);
    }
});

// Clear Selected CSV File
clearFileBtn.addEventListener("click", function () {
    csvFile.value = "";

    showToast("Selected file cleared.");
});

// Batch Table Button Actions
batchTable.addEventListener("click", function (event) {
    const button = event.target.closest(
        "button[data-action]"
    );

    if (!button) return;

    const batchId = button.dataset.id;
    const action = button.dataset.action;

    if (action === "view") {
        viewBatch(batchId);
    }

    if (action === "approve") {
        approveBatch(batchId);
    }
});

// Refresh Dashboard
document.getElementById("refreshBtn").addEventListener(
    "click",
    async function () {
        await Promise.all([
            loadBatches(),
            loadAuditLogs()
        ]);

        showToast("Dashboard refreshed.");
    }
);

// Initialize Dashboard
async function initializeDashboard() {
    await Promise.all([
        loadBatches(),
        loadAuditLogs()
    ]);
}

initializeDashboard();
