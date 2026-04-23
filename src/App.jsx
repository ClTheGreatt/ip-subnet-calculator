import { useMemo, useState } from "react";

const presets = [
  { label: "192.168.1.25 /24", ip: "192.168.1.25", cidr: "24" },
  { label: "10.10.12.44 /26", ip: "10.10.12.44", cidr: "26" },
  { label: "172.16.8.140 /20", ip: "172.16.8.140", cidr: "20" },
];

function isValidIpv4(ip) {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    if (part === "" || !/^\d+$/.test(part)) return false;
    const value = Number(part);
    return value >= 0 && value <= 255;
  });
}

function ipToInt(ip) {
  return ip
    .split(".")
    .map(Number)
    .reduce((acc, octet) => ((acc << 8) | octet) >>> 0, 0);
}

function intToIp(int) {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255,
  ].join(".");
}

function prefixToMask(prefix) {
  if (prefix === 0) return 0;
  return (0xffffffff << (32 - prefix)) >>> 0;
}

function getIpClass(firstOctet) {
  if (firstOctet <= 127) return "Class A";
  if (firstOctet <= 191) return "Class B";
  if (firstOctet <= 223) return "Class C";
  if (firstOctet <= 239) return "Class D";
  return "Class E";
}

function getSubnetScale(prefix) {
  if (prefix >= 30) return "Point-to-point";
  if (prefix >= 24) return "Small subnet";
  if (prefix >= 16) return "Medium subnet";
  return "Large subnet";
}

function calculateSubnet(ip, cidr) {
  const prefix = Number(cidr);

  if (!isValidIpv4(ip)) {
    return { error: "Enter a valid IPv4 address." };
  }

  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return { error: "Prefix length must be between 0 and 32." };
  }

  const ipInt = ipToInt(ip);
  const maskInt = prefixToMask(prefix);
  const wildcardInt = (~maskInt) >>> 0;
  const networkInt = ipInt & maskInt;
  const broadcastInt = networkInt | wildcardInt;
  const firstOctet = Number(ip.split(".")[0]);

  let usableHosts = 0;
  let firstUsable = "N/A";
  let lastUsable = "N/A";

  if (prefix === 32) {
    usableHosts = 1;
    firstUsable = intToIp(networkInt);
    lastUsable = intToIp(networkInt);
  } else if (prefix === 31) {
    usableHosts = 2;
    firstUsable = intToIp(networkInt);
    lastUsable = intToIp(broadcastInt);
  } else {
    usableHosts = Math.max(2 ** (32 - prefix) - 2, 0);
    firstUsable = intToIp(networkInt + 1);
    lastUsable = intToIp(broadcastInt - 1);
  }

  return {
    ipAddress: ip,
    prefix,
    subnetMask: intToIp(maskInt),
    wildcardMask: intToIp(wildcardInt),
    networkAddress: intToIp(networkInt),
    broadcastAddress: intToIp(broadcastInt),
    firstUsable,
    lastUsable,
    totalAddresses: 2 ** (32 - prefix),
    usableHosts,
    ipClass: getIpClass(firstOctet),
    subnetScale: getSubnetScale(prefix),
    networkBits: prefix,
    hostBits: 32 - prefix,
    binaryMask: intToIp(maskInt)
      .split(".")
      .map((part) => Number(part).toString(2).padStart(8, "0"))
      .join("."),
  };
}

function ResultCard({ label, value, featured = false }) {
  return (
    <article className={`result-card${featured ? " result-card-featured" : ""}`}>
      <p className="result-label">{label}</p>
      <h3 className="result-value">{value}</h3>
    </article>
  );
}

export default function App() {
  const [ip, setIp] = useState("10.10.12.44");
  const [cidr, setCidr] = useState("26");

  const result = useMemo(() => calculateSubnet(ip, cidr), [ip, cidr]);

  return (
    <main className="app-shell">
      <div className="ambient ambient-blue" />
      <div className="ambient ambient-orange" />

      <section className="hero-grid">
        <div className="hero-copy panel">
          <span className="eyebrow">IPv4 Network Utility</span>
          <h1>IP Subnet Calculator</h1>
          <p className="hero-text">
            Calculate network address, broadcast address, subnet mask, host range, and
            address capacity from an IPv4 address and CIDR prefix.
          </p>

          <div className="preset-row">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="preset-chip"
                onClick={() => {
                  setIp(preset.ip);
                  setCidr(preset.cidr);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel input-panel">
          <div className="panel-header">
            <span className="eyebrow">Calculator</span>
            <h2>Subnet Details</h2>
          </div>

          <div className="input-grid">
            <label className="input-group">
              <span>IPv4 Address</span>
              <input
                type="text"
                value={ip}
                onChange={(event) => setIp(event.target.value)}
                placeholder="192.168.1.25"
              />
            </label>

            <label className="input-group">
              <span>CIDR Prefix</span>
              <input
                type="number"
                min="0"
                max="32"
                value={cidr}
                onChange={(event) => setCidr(event.target.value)}
                placeholder="24"
              />
            </label>
          </div>

          {result.error ? (
            <div className="message-box message-error">{result.error}</div>
          ) : (
            <div className="summary-bar">
              <div>
                <p className="summary-label">Subnet Scale</p>
                <strong>{result.subnetScale}</strong>
              </div>
              <div>
                <p className="summary-label">IP Class</p>
                <strong>{result.ipClass}</strong>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="content-grid">
        <div className="panel results-panel">
          <div className="section-header">
            <span className="eyebrow">Results</span>
            <h2>Subnet Breakdown</h2>
          </div>

          {result.error ? (
            <div className="empty-state">Enter a valid address and prefix to view results.</div>
          ) : (
            <div className="results-grid">
              <ResultCard label="Network Address" value={result.networkAddress} featured />
              <ResultCard label="Broadcast Address" value={result.broadcastAddress} />
              <ResultCard label="Subnet Mask" value={result.subnetMask} />
              <ResultCard label="Wildcard Mask" value={result.wildcardMask} />
              <ResultCard label="First Usable Host" value={result.firstUsable} />
              <ResultCard label="Last Usable Host" value={result.lastUsable} />
              <ResultCard label="Total Addresses" value={String(result.totalAddresses)} />
              <ResultCard label="Usable Hosts" value={String(result.usableHosts)} />
            </div>
          )}
        </div>

        <aside className="side-stack">
          <section className="panel side-card">
            <span className="eyebrow">Overview</span>
            <h3>
              {ip}/{cidr}
            </h3>
            {!result.error ? (
              <dl className="meta-list">
                <div>
                  <dt>Network bits</dt>
                  <dd>{result.networkBits}</dd>
                </div>
                <div>
                  <dt>Host bits</dt>
                  <dd>{result.hostBits}</dd>
                </div>
                <div>
                  <dt>IP class</dt>
                  <dd>{result.ipClass}</dd>
                </div>
                <div>
                  <dt>Scale</dt>
                  <dd>{result.subnetScale}</dd>
                </div>
              </dl>
            ) : (
              <p className="side-text">No valid result yet.</p>
            )}
          </section>

          <section className="panel side-card">
            <span className="eyebrow">Mask Format</span>
            {!result.error ? (
              <>
                <h3 className="mask-title">{result.subnetMask}</h3>
                <p className="mono-line">{result.binaryMask}</p>
              </>
            ) : (
              <p className="side-text">Binary subnet mask will appear here.</p>
            )}
          </section>

          <section className="panel side-card">
            <span className="eyebrow">Reference</span>
            <ul className="reference-list">
              <li>`/24` gives 256 total addresses.</li>
              <li>`/30` is commonly used for point-to-point links.</li>
              <li>`/32` represents a single host route.</li>
            </ul>
          </section>
        </aside>
      </section>
    </main>
  );
}
