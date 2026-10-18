require("dotenv").config();
console.log("JWT_SECRET loaded:", Boolean(process.env.JWT_SECRET));
const express = require('express');
const verifyToken = require('./middleware')
const cors = require('cors');
const authRouter = require('./auth')
const path = require('path')
const fs = require('fs');
const upload = require('./upload')
const db = require('./db');
const app = express();;
const port = 3000;


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

// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/",(req,res) => {
    res.send("Application tracking system is running")
})

app.get("/api/jobs", (req, res) => {
    const sql = "SELECT * FROM jobs";

    db.query(sql,(err,results) => {
        if(err) {
            console.err("Error while fetching jobs:",err.message)
            return res.status(500).json({
                message : "Failed to fetch jobs"
            });
        }
        res.json(results);
    })
})

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
        INNER JOIN jobs
            ON applications.job_id = jobs.id
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

// Delete an application

app.delete("/api/applications/:id",verifyToken, (req, res) => {
  const applicationId = req.params.id;

  // First, find the resume associated with this application
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

      const resumePath = rows[0].resume_path;

      // Delete the application record from MySQL
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

          if (result.affectedRows === 0) {
            return res.status(404).json({
              message: "Application not found"
            });
          }

          // Remove the associated resume file, if it exists
          if (resumePath) {
            const filePath = path.join(
              __dirname,
              "uploads",
              path.basename(resumePath)
            );

            fs.unlink(filePath, (fileError) => {
              if (fileError && fileError.code !== "ENOENT") {
                console.error("Resume cleanup error:", fileError);
              }

              return res.json({
                message: "Application deleted successfully"
              });
            });
          } else {
            return res.json({
              message: "Application deleted successfully"
            });
          }
        }
      );
    }
  );
});


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

        const resumePath = req.file.filename;

        db.query(
            sql,
            [candidate_name, email, job_id, resumePath],
            (err, result) => {
                if (err) {
                    console.error("Application save error:", err);

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



app.get("/api/applications/:id/resume/download",verifyToken, (req, res) => {
  db.query(
    "SELECT resume_path FROM applications WHERE id = ?",
    [req.params.id],
    (error, rows) => {
      if (error) {
        console.error("Resume download error:", error);
        return res.status(500).json({
          message: "Database error"
        });
      }

      if (rows.length === 0 || !rows[0].resume_path) {
        return res.status(404).json({
          message: "Resume not found"
        });
      }

      const filePath = path.join(
        __dirname,
        "uploads",
        path.basename(rows[0].resume_path)
      );

      res.download(filePath, "candidate-resume.pdf", (error) => {
        if (error && !res.headersSent) {
          console.error("File download error:", error);
          res.status(404).json({
            message: "Resume file could not be downloaded"
          });
        }
      });
    }
  );
});



app.listen(port,() => {
    console.log(`Server is running on ${port}`);
})