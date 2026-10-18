require("dotenv").config();

const bcrypt = require("bcrypt");
const db = require("./db");

const name = "HireFlow Recruiter";
const email = "recruiter@example.com";
const password = "recruiter123";

async function createRecruiter() {
  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    db.query(
      "INSERT INTO recruiters (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword],
      (error, result) => {
        if (error) {
          if (error.code === "ER_DUP_ENTRY") {
            console.log("This recruiter email already exists.");
          } else {
            console.error("Could not create recruiter:", error.message);
          }
        } else {
          console.log("Recruiter account created successfully!");
          console.log("Recruiter ID:", result.insertId);
          console.log("Email:", email);
          console.log("Use your configured password to log in.");
        }

        db.end();
      }
    );
  } catch (error) {
    console.error("Password hashing failed:", error.message);
    db.end();
  }
}

createRecruiter();
