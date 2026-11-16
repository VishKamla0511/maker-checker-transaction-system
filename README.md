# Maker-Checker Transaction Management System

A Node.js and MySQL-based backend application that allows users to upload transaction records through CSV files, validate transaction data, manage batches, and approve transactions using a Maker-Checker workflow.

## Features

- **CSV Upload:** Upload transaction records using a CSV file.
- **CSV Validation:** Validate mandatory headers and transaction fields.
- **Duplicate Detection:** Identify duplicate transaction IDs within the uploaded CSV and existing database records.
- **All-or-Nothing Upload:** Reject the entire upload if any transaction contains validation errors.
- **Batch Management:** Create and manage transaction batches.
- **Maker-Checker Workflow:** Maker uploads transactions, and Checker approves pending batches.
- **Transaction Status:** Maintain transaction statuses such as `PENDING` and `AUTHORIZED`.
- **Audit Logging:** Maintain logs for successful uploads, failed uploads, and batch approvals.
- **Checker Information:** Capture the checker name during batch approval.
- **Dashboard:** View batches, transaction details, upload errors, and audit logs.
- **Centralized Error Handling:** Handle unexpected API errors through common middleware.

## Technology Stack

| Technology | Purpose |
|---|---|
| Node.js | Backend runtime |
| Express.js | REST API development |
| MySQL | Database |
| mysql2 | MySQL database connectivity |
| csv-parser | CSV file processing |
| Multer | File upload handling |
| dotenv | Environment configuration |
| HTML, CSS, JavaScript | Basic dashboard |

## Project Structure

```text
maker-checker-transaction-system/
│
├── config/
│   └── database.js
│
├── constants/
│   └── messages.js
│
├── controllers/
│   └── transaction.controller.js
│
├── middlewares/
│   ├── upload.middleware.js
│   └── error.middleware.js
│
├── models/
│   ├── batch.model.js
│   ├── transaction.model.js
│   └── auditLog.model.js
│
├── routes/
│   └── transaction.routes.js
│
├── services/
│   └── transaction.service.js
│
├── validations/
│   └── transaction.validation.js
│
├── public/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── dashboard.js
│
├── database.sql
├── server.js
├── package.json
├── package-lock.json
├── .env
└── .gitignore
```

## Prerequisites

Make sure the following are installed:

- Node.js
- npm
- MySQL Server 8.0 or above
- Git

## Installation and Setup

### 1. Clone the Repository

```bash
git clone -b maker-checker-assignment https://github.com/VishKamla0511/maker-checker-transaction-system.git
```

### 2. Navigate to the Project

```bash
cd maker-checker-transaction-system
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Create the Database

Open DBeaver.

Execute the SQL script provided in `database.sql`.

Alternatively, create the database manually:

```sql
CREATE DATABASE maker_checker_transaction_system;
```

Then execute the remaining table creation queries from `database.sql`.

### 5. Configure Environment Variables

Create a `.env` file in the project root.

```env
PORT=3000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=maker_checker_transaction_system

MAX_FILE_SIZE=5242880
```

Update the database username and password according to your local MySQL configuration.

**Note:** Never commit your `.env` file or expose database credentials on GitHub.

### 6. Start the Application

```bash
npm start
```

If your project uses a different start script, use the corresponding command from `package.json`.

Open the dashboard in your browser:

```text
http://localhost:3000
```

## CSV File Format

The CSV file must contain the following mandatory columns:

| Column | Required | Description |
|---|---|---|
| transaction_id | Yes | Unique transaction identifier |
| customer_name | Yes | Customer name |
| account_number | Yes | Customer account number |
| amount | Yes | Transaction amount (must be greater than zero) |
| currency | No | Transaction currency |
| date | No | Transaction date |

### Sample CSV

```csv
transaction_id,customer_name,account_number,amount,currency,date
TXN1001,John Smith,ACC1001,1500.50,INR,2026-11-10
TXN1002,David Brown,ACC1002,2500,INR,2026-11-11
TXN1003,Robert Wilson,ACC1003,3500.75,USD,2026-11-12
```

### Validation Rules

- Mandatory CSV headers must be present.
- Transaction ID cannot be empty.
- Customer name and account number are required.
- Amount must be greater than zero.
- Transaction IDs must be unique within the uploaded CSV.
- Transaction IDs must not already exist in the database.
- Currency and date are optional.
- If any record is invalid, the entire CSV upload is rejected.
- No batch or transaction records are created for a failed upload.

## API Documentation

Base URL:

```text
http://localhost:3000/api
```

### 1. Upload Transactions

**Endpoint:** `POST /upload`

Uploads and validates a CSV file.

**Request:** `multipart/form-data`

| Key | Type | Description |
|---|---|---|
| file | File | CSV file to upload |

**cURL:**

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@transactions.csv"
```

### 2. Get All Batches

**Endpoint:** `GET /batches`

Retrieves the list of successfully created transaction batches.

```bash
curl http://localhost:3000/api/batches
```

### 3. Get Batch Details

**Endpoint:** `GET /batches/:id`

Retrieves batch information and its associated transactions.

```bash
curl http://localhost:3000/api/batches/1
```

### 4. Approve a Batch

**Endpoint:** `POST /batches/:id/approve`

Approves all pending transactions in a batch.

**Request Body:**

```json
{
  "checker_name": "Rahul Sharma"
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/api/batches/1/approve \
  -H "Content-Type: application/json" \
  -d "{\"checker_name\":\"Rahul Sharma\"}"
```

### 5. Get Audit Logs

**Endpoint:** `GET /audit-logs`

Retrieves upload, failed upload, and approval audit records.

```bash
curl http://localhost:3000/api/audit-logs
```

## Maker-Checker Workflow

1. Maker uploads a CSV file.
2. The backend validates the CSV headers and transaction records.
3. Duplicate transaction IDs and invalid records are identified.
4. If any validation error occurs, the complete upload is rejected and the failure details are recorded in audit logs.
5. If all records are valid, a batch is created and transactions are saved with `PENDING` status.
6. Checker selects a pending batch and enters their name.
7. The backend approves the batch and updates transaction statuses to `AUTHORIZED`.
8. Upload and approval activities are recorded in audit logs.

## Transaction Status

| Status | Description |
|---|---|
| PENDING | Transaction uploaded and waiting for approval |
| AUTHORIZED | Transaction approved by Checker |

## Database Tables

The application uses three main tables:

**1. batches**

Stores uploaded batch information, including file name, total records, valid records, invalid records, and batch status.

**2. transactions**

Stores transaction details associated with each batch.

**3. audit_logs**

Stores successful uploads, failed upload details, and batch approval activities, including the checker name where applicable.

## Error Handling

The application uses centralized error-handling middleware to provide consistent API error responses.

Examples include:

- Invalid CSV file.
- File size limit exceeded.
- Duplicate database records.
- Invalid API routes.
- Unexpected server errors.

## Future Improvements

- Authentication and role-based authorization.
- Checker identity from authenticated user accounts.
- Pagination for batch and audit-log APIs.
- Automated unit and integration testing.
- Bulk database validation for improved performance.

## Author

**Maker-Checker Transaction Management System**

Developed using Node.js, Express.js, and MySQL.
