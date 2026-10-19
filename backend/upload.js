
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "hireflow-resumes",
        resource_type: "raw",
        allowed_formats: ["pdf"],
        public_id: (req, file) => {
            return `${Date.now()}-${file.originalname.replace(/\.pdf$/i, "")}`;
        }
    }
});

const fileFilter = (req, file, cb) => {
    const extension = file.originalname.split(".").pop().toLowerCase();

    if (extension === "pdf" && file.mimetype === "application/pdf") {
        cb(null, true);
    } else {
        cb(new Error("Only PDF resumes are allowed"));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

module.exports = upload;
