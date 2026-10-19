
require("dotenv").config();

console.log("JWT_SECRET loaded:", Boolean(process.env.JWT_SECRET));

const express = require("express");
const verifyToken = require("./middleware");
const cors = require("cors");
const authRouter = require("./auth");
const path = require("path");
const fs = require("fs");
const upload = require("./upload");
const cloudinary = require("cloudinary").v2;
const db = require("./db");

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = [
    "http://localhost:5173",
    "https://hireflow-ats-cydt.onrender.com"
];

app.use((req, res, next) => {
    console.log("Request Origin:", req.headers.origin);
    next();
});

app.use(cors({
    origin: (origin, callback) => {
        console.log("CORS checking origin:", origin);

        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Origin not allowed: " + origin));
        }
    }
}));

app.use(express.json());

app.use("/api/auth", authRouter);

app.get("/", (req, res) => {
    res.send("Application tracking system is running");
});

// Get all jobs
app.get("/api/jobs", (req, res) => {
    db.query("SELECT * FROM jobs", (err, results) => {
        if (err) {
            console.error("Error while fetching jobs:", err.message);

            return res.status(500).json({
                message: "Failed to fetch jobs"
            });
        }

        res.json(results);
    });
});

// Get all applications
app.get("/api/applications", verifyToken, (req, res) => {
    const sql = `
        SELECT
            applications.id,
            applications.candidate_name,
            applications.email,
            applications.resume_path,
            applications.status,
            applications.applied_at,
            jobs.title AS job_title,
            jobs.company
        FROM applications
        INNER JOIN jobs ON applications.job_id = jobs.id
        ORDER BY applications.applied_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching applications:", err);

            return res.status(500).json({
                message: "Failed to fetch applications"
            });
        }

        res.json(results);
    });
});

// Update application status
app.put("/api/applications/:id/status", verifyToken, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
        "Applied",
        "Reviewing",
        "Shortlisted",
        "Rejected"
    ];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            message: "Invalid application status"
        });
    }

    const sql = `
        UPDATE applications
        SET status = ?
        WHERE id = ?
    `;

    db.query(sql, [status, id], (err, result) => {
        if (err) {
            console.error("Error updating application status:", err);

            return res.status(500).json({
                message: "Failed to update application status"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Application not found"
            });
        }

        res.json({
            message: "Application status updated successfully"
        });
    });
});

// Delete application and its local resume file

app.delete("/api/applications/:id", verifyToken, (req, res) => {
    const applicationId = req.params.id;

    db.query(
        "SELECT resume_path FROM applications WHERE id = ?",
        [applicationId],
        (error, rows) => {
            if (error) {
                console.error("Find application error:", error);
                return res.status(500).json({
                    message: "Failed to find application"
                });
            }

            if (rows.length === 0) {
                return res.status(404).json({
                    message: "Application not found"
                });
            }

            const resumeUrl = rows[0].resume_path;

            let publicId = null;

            // Extract Cloudinary public ID from a Cloudinary URL
            try {
                const parsedUrl = new URL(resumeUrl);

                if (
                    parsedUrl.hostname === "res.cloudinary.com" &&
                    parsedUrl.pathname.includes("/raw/upload/")
                ) {
                    const pathAfterUpload =
                        parsedUrl.pathname.split("/raw/upload/")[1];

                    const withoutVersion =
                        pathAfterUpload.replace(/^v\d+\//, "");

                    publicId = decodeURIComponent(
                        withoutVersion.replace(/\.pdf$/i, "")
                    );
                }
            } catch {
                // Existing records may contain local filenames instead
            }

            db.query(
                "DELETE FROM applications WHERE id = ?",
                [applicationId],
                (deleteError, result) => {
                    if (deleteError) {
                        console.error("Delete application error:", deleteError);
                        return res.status(500).json({
                            message: "Failed to delete application"
                        });
                    }

                    if (publicId) {
                        cloudinary.uploader.destroy(publicId, {
                            resource_type: "raw"
                        }).then((cloudResult) => {
                            console.log("Cloudinary delete result:", cloudResult);
                        }).catch((cloudError) => {
                            console.error("Cloudinary cleanup error:", cloudError);
                        });
                    }

                    return res.json({
                        message: "Application deleted successfully"
                    });
                }
            );
        }
    );
});


// Submit an application with a PDF resume

app.post(
    "/api/applications",
    upload.single("resume"),
    (req, res) => {
        const { candidate_name, email, job_id } = req.body;

        if (!candidate_name || !email || !job_id || !req.file) {
            return res.status(400).json({
                message: "Please provide all application details and a PDF resume"
            });
        }

        const sql = `
            INSERT INTO applications
            (candidate_name, email, job_id, resume_path)
            VALUES (?, ?, ?, ?)
        `;

        // Cloudinary URL instead of a local filename
        const resumePath = req.file.path;

        db.query(
            sql,
            [candidate_name, email, job_id, resumePath],
            (err, result) => {
                if (err) {
                    console.error("Application save error:", err);

                    // Remove the uploaded file if saving the application fails
                    if (req.file.filename) {
                        cloudinary.uploader.destroy(req.file.filename, {
                            resource_type: "raw"
                        }).catch((deleteError) => {
                            console.error(
                                "Cloudinary cleanup error:",
                                deleteError
                            );
                        });
                    }

                    return res.status(500).json({
                        message: "Failed to save application"
                    });
                }

                return res.status(201).json({
                    message: "Application submitted successfully",
                    applicationId: result.insertId
                });
            }
        );
    }
);


// View resume PDF in the browser instead of downloading it

app.get(
    "/api/applications/:id/resume/download",
    verifyToken,
    (req, res) => {
        db.query(
            "SELECT resume_path FROM applications WHERE id = ?",
            [req.params.id],
            (error, rows) => {
                if (error) {
                    console.error("Resume view database error:", error);
                    return res.status(500).json({
                        message: "Database error"
                    });
                }

                if (rows.length === 0 || !rows[0].resume_path) {
                    return res.status(404).json({
                        message: "Resume not found"
                    });
                }

                const resumeUrl = rows[0].resume_path;

                // Allow only URLs from your Cloudinary account
                let parsedUrl;

                try {
                    parsedUrl = new URL(resumeUrl);
                } catch {
                    return res.status(404).json({
                        message: "Invalid resume URL"
                    });
                }

                const expectedHost =
                    `res.cloudinary.com`;

                if (
                    parsedUrl.hostname !== expectedHost ||
                    !parsedUrl.pathname.includes("/raw/upload/")
                ) {
                    return res.status(404).json({
                        message: "Invalid resume location"
                    });
                }

                return res.redirect(resumeUrl);
            }
        );
    }
);


app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});
