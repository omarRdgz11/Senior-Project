import { styles } from "./ProfilePage.styles"

export default function Omar() {
  return (
    <div className="mx-auto max-w-6xl p-6" style={styles.container}>
      {/* Card wrapper */}
      <article className="card bg-base-100 border border-base-200 shadow-xl" style={styles.card}>
        <div className="card-body gap-6">
          {/* Picture */}
          <header className="flex flex-col items-center text-center gap-4">
            <img
              src="/images/about-me/profile-pictures/omarProfilePicture.jpg" /* <- replace with your path */
              alt="Portrait of Omar Carmona"
              className="w-32 h-32 rounded-full shadow-md object-cover"
            />

            {/* Name & Role */}
            <div>
              <h1 className="text-3xl font-bold leading-tight" style={styles.title}>Omar Carmona</h1>
              <p className="text-base-content/70" style={styles.text}>Systems Architect • Full Stack Developer</p>
            </div>
          </header>

          {/* Summary */}
          <section aria-labelledby="about-summary" className="space-y-2">
            <h2 id="about-summary" className="text-xl font-semibold" style={styles.subtitle}>Summary</h2>
            <p className="text-base-content/80" style={styles.text}>
              Hi, I’m Omar Alexander Carmona Rodriguez. For this project I am the Systems Architect in charge of ensuring
              that our systems on the frontend and backend are working as intended and needed. 
              As well as a full stack developer for the website and in charge of version control
              on our Github. 
            </p>
          </section>

          {/* Experience */}
          <section aria-labelledby="about-experience" className="space-y-4">
            <h2 id="about-experience" className="text-xl font-semibold" style={styles.subtitle}>Experience</h2>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Internships */}
              <div className="rounded-2xl p-4">
                <h3 className="font-semibold mb-2" style={styles.subtitle}>Internships</h3>
                <ul className="list-disc list-inside space-y-1 text-base-content/80">
                  <li>
                    <span className="font-medium" style={styles.text}>Thornburg Investment Management</span> — Cybersecurity & IT Ops Intern
                  </li>
                </ul>
              </div>

              {/* Projects */}
              <div className="rounded-2xl p-4">
                <h3 className="font-semibold mb-2" style={styles.subtitle}>Projects</h3>
                <ul className="list-disc list-inside space-y-1 text-base-content/80" style={styles.text}>
                  <li>
                    <span className="font-bold">Senior Project</span> — Systems Architect on FIRMS App Integration - Docker + React + Flask + PostgreSQL
                  </li>
                  <li>
                    <span className="font-bold">Made‑to‑Order Business Portal</span> — Docker + Svelte + Flask + PostgreSQL
                  </li>
                  <li>
                    <span className="font-bold">Financial Analytics Dashboard</span> — Python: Pandas, Plotly - Docker + Svelte + Flask + PostgreSQL
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Hobbies */}
          <section aria-labelledby="about-hobbies" className="space-y-2">
            <h2 id="about-hobbies" className="text-xl font-semibold" style={styles.subtitle}>Hobbies</h2>
            <p className="text-base-content/80" style={styles.text}>
              Piano - Hiking - Reading - Writing - Movies - Crocheting - Gaming
            </p>
          </section>

          {/* Links */}
          <section aria-labelledby="about-links" className="space-y-3">
            <h2 id="about-links" className="text-xl font-semibold" style={styles.subtitle}>Find me</h2>
            <div className="flex flex-wrap gap-2">
              <a
                className="btn btn-outline btn-sm"
                href="https://github.com/your-handle"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub profile"
                style={styles.buttons}
              >
                GitHub
              </a>
              <a
                className="btn btn-ghost btn-sm"
                href="https://linkedin.com/in/your-handle"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn profile"
                style={styles.buttons}
              >
                LinkedIn
              </a>
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}

