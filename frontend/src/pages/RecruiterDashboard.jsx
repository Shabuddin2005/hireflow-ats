
import { useEffect, useState } from "react";
import "../App.css";

const API_URL = "https://hireflow-ats-backend.onrender.com";

function RecruiterDashboard({ onLogout }) {
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applicationsError, setApplicationsError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedApplication, setSelectedApplication] = useState(null);

  function getAuthHeaders() {
    const token = sessionStorage.getItem("token");

    return {
      Authorization: `Bearer ${token}`,
    };
  }

  function handleUnauthorized() {
    sessionStorage.removeItem("token");
    onLogout();
  }

  // Fetch applications when the dashboard opens.
  useEffect(() => {
    let cancelled = false;

    async function fetchApplications() {
      setApplicationsLoading(true);
      setApplicationsError("");

      try {
        const response = await fetch(
          `${API_URL}/api/applications`,
          { headers: getAuthHeaders() }
        );

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch applications.");
        }

        const data = await response.json();

        if (!cancelled) {
          setApplications(data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching applications:", error);
          setApplicationsError(error.message);
        }
      } finally {
        if (!cancelled) {
          setApplicationsLoading(false);
        }
      }
    }

    fetchApplications();

    return () => {
      cancelled = true;
    };
  }, []);

  // Search and filter applications.
  const filteredApplications = applications.filter((application) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      (application.candidate_name || "")
        .toLowerCase()
        .includes(search) ||
      (application.email || "")
        .toLowerCase()
        .includes(search);

    const matchesStatus =
      statusFilter === "All" ||
      application.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Dashboard summary counts.
  const totalApplications = applications.length;

  const reviewingApplications = applications.filter(
    (application) => application.status === "Reviewing"
  ).length;

  const shortlistedApplications = applications.filter(
    (application) => application.status === "Shortlisted"
  ).length;

  const rejectedApplications = applications.filter(
    (application) => application.status === "Rejected"
  ).length;

  // Update application status.
  async function handleStatusChange(application, newStatus) {
    const previousStatus = application.status;

    try {
      const response = await fetch(
        `${API_URL}/api/applications/${application.id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to update application status.");
      }

      setApplications((previousApplications) =>
        previousApplications.map((item) =>
          item.id === application.id
            ? { ...item, status: newStatus }
            : item
        )
      );

      setSelectedApplication((selected) =>
        selected?.id === application.id
          ? { ...selected, status: newStatus }
          : selected
      );
    } catch (error) {
      console.error("Status update error:", error);

      alert(
        error.message || "Could not update application status."
      );

      setApplications((previousApplications) =>
        previousApplications.map((item) =>
          item.id === application.id
            ? { ...item, status: previousStatus }
            : item
        )
      );
    }
  }

  // Delete an application.
  async function handleDelete(application) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${application.candidate_name}'s application?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/api/applications/${application.id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to delete application.");
      }

      setApplications((previousApplications) =>
        previousApplications.filter(
          (item) => item.id !== application.id
        )
      );

      setSelectedApplication((selected) =>
        selected?.id === application.id ? null : selected
      );
    } catch (error) {
      console.error("Delete application error:", error);

      alert(
        error.message || "Could not delete the application."
      );
    }
  }

  // View a resume in a new browser tab.
  async function handleViewResume(application) {
    // Open the tab immediately to avoid popup blocking.
    const newTab = window.open("about:blank", "_blank");

    if (!newTab) {
      alert(
        "Please allow pop-ups for this website to view resumes."
      );
      return;
    }

    newTab.document.title = "Loading Resume...";

    let fileUrl = null;

    try {
      const response = await fetch(
        `${API_URL}/api/applications/${application.id}/resume/download`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.status === 401) {
        newTab.close();
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          "Could not open the resume. Please check whether the PDF exists."
        );
      }

      const blob = await response.blob();

      // Confirm the response contains a PDF.
      if (
        blob.type &&
        !blob.type.toLowerCase().includes("pdf")
      ) {
        throw new Error("The server did not return a PDF file.");
      }

      fileUrl = URL.createObjectURL(blob);

      // Display the PDF instead of downloading it.
      newTab.location.href = fileUrl;

      // Release the temporary URL when the tab is closed.
      const cleanup = () => {
        URL.revokeObjectURL(fileUrl);
      };

      newTab.addEventListener("pagehide", cleanup, {
        once: true,
      });
    } catch (error) {
      console.error("View resume error:", error);

      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }

      newTab.close();

      alert(error.message || "Could not open the resume.");
    }
  }

  return (
    <main className="applications-section" id="applications">
      <h2>Recruiter Dashboard</h2>
      <p>View all candidate applications.</p>

      {/* Dashboard summary cards */}
      <div className="dashboard-summary">
        <div className="summary-card">
          <h3>Total Applications</h3>
          <p>{totalApplications}</p>
        </div>

        <div className="summary-card">
          <h3>Reviewing</h3>
          <p>{reviewingApplications}</p>
        </div>

        <div className="summary-card">
          <h3>Shortlisted</h3>
          <p>{shortlistedApplications}</p>
        </div>

        <div className="summary-card">
          <h3>Rejected</h3>
          <p>{rejectedApplications}</p>
        </div>
      </div>

      {/* Search and status filters */}
      <div className="application-filters">
        <input
          type="text"
          placeholder="Search by candidate name or email..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Applied">Applied</option>
          <option value="Reviewing">Reviewing</option>
          <option value="Shortlisted">Shortlisted</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {applicationsLoading && (
        <p>Loading applications...</p>
      )}

      {applicationsError && (
        <p className="error">{applicationsError}</p>
      )}

      {!applicationsLoading &&
        !applicationsError &&
        applications.length === 0 && (
          <p>No applications received yet.</p>
        )}

      {!applicationsLoading &&
        !applicationsError &&
        applications.length > 0 &&
        filteredApplications.length === 0 && (
          <p>No applications match your search or filter.</p>
        )}

      {/* Applications table */}
      {!applicationsLoading &&
        !applicationsError &&
        applications.length > 0 && (
          <div className="applications-table-container">
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Email</th>
                  <th>Job Title</th>
                  <th>Company</th>
                  <th>Resume</th>
                  <th>Status</th>
                  <th>Applied Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredApplications.map((application) => (
                  <tr key={application.id}>
                    <td>{application.candidate_name}</td>
                    <td>{application.email}</td>
                    <td>{application.job_title}</td>
                    <td>{application.company}</td>

                    <td>
                      {application.resume_path ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleViewResume(application)
                          }
                        >
                          View Resume
                        </button>
                      ) : (
                        "No resume"
                      )}
                    </td>

                    <td>
                      <div
                        className={`status-cell status-${(
                          application.status || ""
                        ).toLowerCase()}`}
                      >
                        <span className="status-badge">
                          {application.status}
                        </span>

                        <select
                          value={application.status}
                          onChange={(event) =>
                            handleStatusChange(
                              application,
                              event.target.value
                            )
                          }
                        >
                          <option value="Applied">Applied</option>
                          <option value="Reviewing">Reviewing</option>
                          <option value="Shortlisted">
                            Shortlisted
                          </option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                    </td>

                    <td>
                      {new Date(
                        application.applied_at
                      ).toLocaleDateString()}
                    </td>

                    <td>
                      <div className="application-actions">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedApplication(application)
                          }
                        >
                          View Details
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() =>
                            handleDelete(application)
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Application details modal */}
      {selectedApplication && (
        <div className="application-details-overlay">
          <div className="application-details">
            <button
              type="button"
              className="close-details"
              onClick={() => setSelectedApplication(null)}
            >
              Close
            </button>

            <h2>Application Details</h2>

            <p>
              <strong>Candidate:</strong>{" "}
              {selectedApplication.candidate_name}
            </p>

            <p>
              <strong>Email:</strong>{" "}
              {selectedApplication.email}
            </p>

            <p>
              <strong>Job Title:</strong>{" "}
              {selectedApplication.job_title}
            </p>

            <p>
              <strong>Company:</strong>{" "}
              {selectedApplication.company}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {selectedApplication.status}
            </p>

            <p>
              <strong>Applied Date:</strong>{" "}
              {new Date(
                selectedApplication.applied_at
              ).toLocaleDateString()}
            </p>

            {selectedApplication.resume_path && (
              <button
                type="button"
                onClick={() =>
                  handleViewResume(selectedApplication)
                }
              >
                View Resume
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default RecruiterDashboard;
