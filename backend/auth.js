
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./db");

const router = express.Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      message: "Email and password are required"
    });
  }

  db.query(
    "SELECT id, name, email, password FROM recruiters WHERE email = ?",
    [email.trim()],
    async (error, rows) => {
      if (error) {
        console.error("Login database error:", error);
        return res.status(500).json({
          message: "Login failed. Please try again."
        });
      }

      if (rows.length === 0) {
        return res.status(401).json({
          message: "Invalid email or password"
        });
      }

      try {
        const recruiter = rows[0];
        const passwordMatches = await bcrypt.compare(
          password,
          recruiter.password
        );

        if (!passwordMatches) {
          return res.status(401).json({
            message: "Invalid email or password"
          });
        }

        const token = jwt.sign(
          {
            id: recruiter.id,
            email: recruiter.email,
            role: "recruiter"
          },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );

        return res.json({
          message: "Login successful",
          token,
          recruiter: {
            id: recruiter.id,
            name: recruiter.name,
            email: recruiter.email
          }
        });
      } catch (tokenError) {
        console.error("Login error:", tokenError);
        return res.status(500).json({
          message: "Login failed. Please try again."
        });
      }
    }
  );
});

module.exports = router;
