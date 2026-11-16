const validateTransaction = (row) => {

    const errors = [];

    const transactionId = String(row.transaction_id || "").trim();
    const customerName = String(row.customer_name || "").trim();
    const accountNumber = String(row.account_number || "").trim();
    const amount = String(row.amount || "").trim();

    if (!transactionId) {
        errors.push("Transaction ID is required");
    }

    if (!customerName) {
        errors.push("Customer name is required");
    }

    if (!accountNumber) {
        errors.push("Account number is required");
    }

    if (!amount) {
        errors.push("Amount is required");
    } else if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
        errors.push("Amount must be greater than zero");
    }

    return {
        isValid: errors.length === 0,
        errors: errors,
        data: {
            transaction_id: transactionId,
            customer_name: customerName,
            account_number: accountNumber,
            amount: Number(amount)
        }
    };
};

module.exports = {
    validateTransaction
};