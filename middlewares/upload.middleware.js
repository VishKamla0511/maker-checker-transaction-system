
require("dotenv").config();

const multer = require("multer");
const path = require("path");

// Get file size from environment variable
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE);

if (!Number.isInteger(MAX_FILE_SIZE) || MAX_FILE_SIZE < 0) {
    throw new Error("Invalid MAX_FILE_SIZE in .env file");
}

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE
    },
    fileFilter: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();

        if (extension !== ".csv") {
            return cb(new Error("Only CSV files are allowed"));
        }

        cb(null, true);
    }
});

const handleUpload = (req, res, next) => {
    upload.single("file")(req, res, (error) => {
        if (error instanceof multer.MulterError) {
            if (error.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    success: false,
                    message: "File size must not exceed 5 MB"
                });
            }

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        next();
    });
};

module.exports = handleUpload;
