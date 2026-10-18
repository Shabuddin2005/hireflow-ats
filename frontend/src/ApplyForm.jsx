
import { useState } from "react";

function ApplyForm({ job, onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [resume, setResume] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!resume) {
        alert("Please upload your resume PDF.");
        return;
    }

    const formData = new FormData();

    formData.append("candidate_name", name);
    formData.append("email", email);
    formData.append("job_id", job.id);
    formData.append("resume", resume);

    try {
        const response = await fetch(
            "http://localhost:3000/api/applications",
            {
                method: "POST",
                body: formData
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Application failed");
        }

        alert("Application submitted successfully!");

        setName("");
        setEmail("");
        setResume(null);

        onClose();
        
    } catch (error) {
        console.error("Application error:", error);
        alert(error.message || "Something went wrong. Please try again.");
    }
};

  return (
    <div className="form-overlay">
      <form className="apply-form" onSubmit={handleSubmit}>
        <h2>Apply for {job.title}</h2>
        <p>{job.company}</p>

        <label>Full Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label>Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Resume (PDF)</label>
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={(e) => setResume(e.target.files[0])}
          required
        />

        <button type="submit">Submit Application</button>
        <button type="button" className="cancel-btn" onClick={onClose}>
          Cancel
        </button>
      </form>
    </div>
  );
}

export default ApplyForm;
