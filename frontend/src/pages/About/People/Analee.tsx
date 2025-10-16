export default function Analee() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Card wrapper */}
      <article className="card bg-base-100 border border-base-200 shadow-xl">
        <div className="card-body gap-6">
          {/* Picture */}
          <header className="flex flex-col items-center text-center gap-4">
            <img
              src="/images/about-me/profile-pictures/" /* <- replace with your path */
              alt="Portrait of Linh"
              className="w-32 h-32 rounded-full shadow-md object-cover"
            />

            {/* Name & Role */}
            <div>
              <h1 className="text-3xl font-bold leading-tight">Analee</h1>
              <p className="text-base-content/70">Full Stack Developer</p>
            </div>
          </header>

          {/* Summary */}
          <section aria-labelledby="about-summary" className="space-y-2">
            <h2 id="about-summary" className="text-xl font-semibold">Summary</h2>
            <p className="text-base-content/80">
              Hi! I’m Analee
            </p>
          </section>

          {/* Experience */}
          <section aria-labelledby="about-experience" className="space-y-4">
            <h2 id="about-experience" className="text-xl font-semibold">Experience</h2>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Internships */}
              <div className="rounded-2xl border border-base-200 p-4">
                <h3 className="font-semibold mb-2">Internships</h3>
                <ul className="list-disc list-inside space-y-1 text-base-content/80">
                  <li>
                    <span className="font-medium">Example Text</span>
                  </li>
                </ul>
              </div>

              {/* Projects */}
              <div className="rounded-2xl border border-base-200 p-4">
                <h3 className="font-semibold mb-2">Projects</h3>
                <ul className="list-disc list-inside space-y-1 text-base-content/80">
                  <li>
                    <span className="font-medium">Sample Text</span> - Sample Text
                  </li>
                  <li>
                    <span className="font-medium">Sample Text</span> — Sample Text
                  </li>
                  <li>
                    <span className="font-medium">Sample Text</span> — Sample Text
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Hobbies */}
          <section aria-labelledby="about-hobbies" className="space-y-2">
            <h2 id="about-hobbies" className="text-xl font-semibold">Hobbies</h2>
            <p className="text-base-content/80">
              Sample Text
            </p>
          </section>

          {/* Links */}
          <section aria-labelledby="about-links" className="space-y-3">
            <h2 id="about-links" className="text-xl font-semibold">Find me</h2>
            <div className="flex flex-wrap gap-2">
              <a
                className="btn btn-outline btn-sm"
                href="https://github.com/your-handle"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub profile"
              >
                GitHub
              </a>
              <a
                className="btn btn-ghost btn-sm"
                href="https://linkedin.com/in/your-handle"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn profile"
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
  