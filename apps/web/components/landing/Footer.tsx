"use client";

export function Footer() {
  return (
    <footer
      className="relative border-t border-white/6 px-5 py-12 lg:px-8"
      style={{ background: "#010a18" }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="mb-4 flex items-center gap-3">
              <svg width="32" height="32" viewBox="0 0 44 44" fill="none">
                <path d="M22 5C14 5 8 8 8 8v11c0 9 7 14 14 20 7-6 14-11 14-20V8s-6-3-14-3Z" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none" />
                <path d="M22 10.5C26.4 16.8 29.5 21 29.5 24.8a7.5 7.5 0 0 1-15 0c0-3.8 3.1-8 7.5-14.3Z" fill="#0096c7" />
                <path d="M22 17v6M19.5 21.5l2.5 2.5 2.5-2.5" stroke="#001a25" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-display text-lg font-bold text-white">AquaShield</span>
            </div>
            <p className="text-sm leading-relaxed text-white/35">
              Hyperlocal urban flood early-warning system for Delhi.
              Detect · Verify · Predict · Explain · Act.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {[
              {
                title: "Product",
                links: [
                  { label: "Live Map", href: "/map" },
                  { label: "Ops Dashboard", href: "/ops" },
                  { label: "Rain Simulator", href: "/map" },
                ],
              },
              {
                title: "AWS Services",
                links: [
                  { label: "Lambda + API Gateway", href: "#" },
                  { label: "DynamoDB", href: "#" },
                  { label: "Amazon Bedrock", href: "#" },
                ],
              },
              {
                title: "Track",
                links: [
                  { label: "Environmental Hacks 2026", href: "#" },
                  { label: "WeMakeDevs x AWS", href: "#" },
                  { label: "Demo Video", href: "#" },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
                  {col.title}
                </h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-white/45 transition-colors hover:text-white/80"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/6 pt-8 sm:flex-row">
          <p className="text-xs text-white/25">
            © 2026 AquaShield · Built for Delhi · WeMakeDevs x AWS Environmental Hacks
          </p>
          <div className="flex items-center gap-4">
            {["AWS", "Lambda", "DynamoDB", "Bedrock", "SNS"].map((tech) => (
              <span
                key={tech}
                className="text-[10px] font-semibold text-white/20"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
