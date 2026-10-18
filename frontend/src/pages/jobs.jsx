
import { useEffect, useState } from "react";
import "../App.css";
import ApplyForm from "../ApplyForm";

const API_URL = "http://localhost:3000";

function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);

  // Fetch job openings from the backend.
  useEffect(() => {
    fetch(`${API_URL}/api/jobs`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch jobs");
        }

        return response.json();
      })
      .then((data) => {
        setJobs(data);
      })
      .catch((error) => {
        console.error("Error fetching jobs:", error);
        setError("Could not load jobs. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="jobs-page">
      <section className="hero">
        <h1>Find Your Next Opportunity</h1>
        <p>
          Discover jobs that match your skills and ambitions.
        </p>
      </section>

      <main className="jobs-section">
        <h2>Latest Job Openings</h2>

        {loading && <p>Loading jobs...</p>}

        {error && <p className="error">{error}</p>}

        {!loading && !error && jobs.length === 0 && (
          <p>No jobs available right now.</p>
        )}

        <div className="job-list">
          {jobs.map((job) => (
            <article className="job-card" key={job.id}>
              <h3>{job.title}</h3>
              <p className="company">{job.company}</p>
              <p>📍 {job.location}</p>
              <p>{job.description}</p>

              <button
                type="button"
                onClick={() => setSelectedJob(job)}
              >
                Apply Now
              </button>
            </article>
          ))}
        </div>
      </main>

      {selectedJob && (
        <ApplyForm
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}

      <footer id="about">
        <p>© 2026 HireFlow ATS | Applicant Tracking System</p>
      </footer>
    </div>
  );
}

export default Jobs;
