
import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Database,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Upload,
  X,
  GitCompareArrows,
  Bot,
} from "lucide-react";
import "./Agent.css";

type AlertInfo = {
  id: string;
  sheet: string;
  cell: string;
  title: string;
  detail: string;
  severity: "critical" | "warning";
};

type SheetInfo = {
  name: string;
  rows: string[][];
  rowCount: number;
  columnCount: number;
  formulaCount: number;
  errors: { cell: string; value: string }[];
  alerts: AlertInfo[];
};

type MatchRecord = {
  sheet: string;
  row: number;
  id: string;
  name: string;
};

type MatchInfo = {
  id: string;
  type: string;
  confidence: string;
  records: MatchRecord[];
};

type ImportInfo = {
  name: string;
  date: string;
  size: string;
  sheets: number;
  rows: number;
};

type Dimension = {
  key: string;
  label: string;
  aliases: string[];
};

const DIMENSIONS: Dimension[] = [
  { key: "country", label: "Countries", aliases: ["country", "projectcountry", "locationcountry"] },
  { key: "nationality", label: "Nationalities", aliases: ["nationality", "citizenship"] },
  { key: "gender", label: "Gender", aliases: ["gender", "sex"] },
  { key: "status", label: "Project Status", aliases: ["status", "projectstatus", "currentstatus"] },
  { key: "sector", label: "Project Sectors", aliases: ["sector", "projectsector"] },
  { key: "funder", label: "Funders & Donors", aliases: ["funder", "donor", "fundingagency", "fundingsource"] },
  { key: "year", label: "Project Year", aliases: ["year", "projectyear", "startyear"] },
];

const COLORS = [
  "#4778d0", "#36a58b", "#e3a64c", "#8d70ca", "#dc727b",
  "#53a6bb", "#9b9da8", "#6c9b57", "#bd83a5", "#d17b43",
];

const NAVIGATION = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Excel Intelligence", icon: FileSpreadsheet },
  { name: "Project Matching", icon: GitCompareArrows },
  { name: "Data Validation", icon: ShieldCheck },
  { name: "Sheet Summary", icon: BarChart3 },
  { name: "Import History", icon: History },
  { name: "Settings", icon: Settings },
];

function normalize(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

function findColumn(headers: string[], aliases: string[]) {
  const normalized = headers.map(normalize);
  return normalized.findIndex((header) =>
    aliases.some((alias) => header === normalize(alias) || header.includes(normalize(alias)))
  );
}

function similarity(a: string, b: string) {
  const first = normalize(a);
  const second = normalize(b);

  if (!first || !second) return 0;
  if (first === second) return 1;
  if (first.length < 3 || second.length < 3) return 0;

  const pairs = (value: string) => {
    const result = new Set<string>();
    for (let i = 0; i < value.length - 1; i++) result.add(value.slice(i, i + 2));
    return result;
  };

  const aPairs = pairs(first);
  const bPairs = pairs(second);
  let intersection = 0;

  aPairs.forEach((pair) => {
    if (bPairs.has(pair)) intersection++;
  });

  return (2 * intersection) / (aPairs.size + bPairs.size);
}

function collectDimension(
  sheets: SheetInfo[],
  dimension: Dimension,
  selectedSheet?: string
) {
  const counts = new Map<string, number>();
  const targetSheets = selectedSheet
    ? sheets.filter((sheet) => sheet.name === selectedSheet)
    : sheets;

  let found = false;

  targetSheets.forEach((sheet) => {
    const column = findColumn(sheet.rows[0] || [], dimension.aliases);
    if (column === -1) return;

    found = true;

    sheet.rows.slice(1).forEach((row) => {
      const value = String(row[column] ?? "").trim();
      if (!value || value === "—") return;
      counts.set(value, (counts.get(value) || 0) + 1);
    });
  });

  return {
    found,
    data: Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
  };
}

function buildMatches(sheets: SheetInfo[]): MatchInfo[] {
  const records: MatchRecord[] = [];

  sheets.forEach((sheet) => {
    const headers = sheet.rows[0] || [];
    const idColumn = findColumn(headers, [
      "projectid", "projectcode", "projectnumber", "projectno",
    ]);
    const nameColumn = findColumn(headers, ["projectname", "projecttitle"]);

    if (idColumn === -1 && nameColumn === -1) return;

    sheet.rows.slice(1).forEach((row, index) => {
      const id = idColumn >= 0 ? String(row[idColumn] ?? "").trim() : "";
      const name = nameColumn >= 0 ? String(row[nameColumn] ?? "").trim() : "";
      if (!id && !name) return;

      records.push({ sheet: sheet.name, row: index + 2, id, name });
    });
  });

  const matches: MatchInfo[] = [];
  const used = new Set<string>();

  function addMatch(type: string, confidence: string, group: MatchRecord[]) {
    const unique = group.filter(
      (record, index, array) =>
        array.findIndex((item) => item.sheet === record.sheet && item.row === record.row) === index
    );

    if (unique.length < 2) return;

    const key = unique
      .map((record) => `${record.sheet}:${record.row}`)
      .sort()
      .join("|");

    if (used.has(key)) return;
    used.add(key);

    matches.push({
      id: `${type}-${matches.length}`,
      type,
      confidence,
      records: unique,
    });
  }

  const idGroups = new Map<string, MatchRecord[]>();
  records.forEach((record) => {
    if (!record.id) return;
    const key = normalize(record.id);
    idGroups.set(key, [...(idGroups.get(key) || []), record]);
  });
  idGroups.forEach((group) => addMatch("Exact Project ID", "High", group));

  const nameGroups = new Map<string, MatchRecord[]>();
  records.forEach((record) => {
    if (!record.name) return;
    const key = normalize(record.name);
    nameGroups.set(key, [...(nameGroups.get(key) || []), record]);
  });
  nameGroups.forEach((group) => addMatch("Exact Project Name", "High", group));

  const named = records.filter((record) => record.name).slice(0, 3000);

  for (let i = 0; i < named.length; i++) {
    for (let j = i + 1; j < named.length; j++) {
      if (normalize(named[i].name) === normalize(named[j].name)) continue;

      if (similarity(named[i].name, named[j].name) >= 0.88) {
        addMatch("Possible Similar Project Name", "Review", [named[i], named[j]]);
      }
    }
  }

  return matches;
}

function DonutChart({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: { label: string; value: number }[];
}) {
  const [selected, setSelected] = useState(-1);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let angle = 0;

  const segments = data.map((item, index) => {
    const start = angle;
    const end = start + (item.value / (total || 1)) * 360;
    angle = end;
    return `${COLORS[index % COLORS.length]} ${start}deg ${end}deg`;
  });

  return (
    <div className="agent-panel agent-chart-panel">
      <div className="agent-eyebrow">DATA DISTRIBUTION</div>
      <h3>{title}</h3>
      <p className="agent-muted">{description}</p>

      {!total ? (
        <div className="agent-empty">
          <Database size={25} />
          <strong>No available data</strong>
          <span>No matching column or populated values were found.</span>
        </div>
      ) : (
        <>
          <div className="agent-donut-wrap">
            <div
              className="agent-donut"
              style={{ background: `conic-gradient(${segments.join(", ")})` }}
            >
              <div className="agent-donut-center">
                <strong>{total.toLocaleString()}</strong>
                <span>Records</span>
              </div>
            </div>
          </div>

          <div className="agent-legend">
            {data.map((item, index) => (
              <button
                key={item.label}
                className={`agent-legend-row ${selected === index ? "selected" : ""}`}
                onClick={() => setSelected(selected === index ? -1 : index)}
              >
                <span
                  className="agent-legend-dot"
                  style={{ background: COLORS[index % COLORS.length] }}
                />
                <span className="agent-legend-label">{item.label}</span>
                <strong>{item.value.toLocaleString()}</strong>
                <small>{((item.value / total) * 100).toFixed(1)}%</small>
              </button>
            ))}
          </div>

          {selected >= 0 && (
            <div className="agent-selection-info">
              <strong>{data[selected].label}</strong>
              <span>
                {data[selected].value} records (
                {((data[selected].value / total) * 100).toFixed(1)}%).
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BarChart({
  title,
  data,
}: {
  title: string;
  data: { label: string; value: number }[];
}) {
  const maximum = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="agent-panel agent-chart-panel">
      <div className="agent-eyebrow">COMPARATIVE ANALYSIS</div>
      <h3>{title}</h3>

      {!data.length ? (
        <p className="agent-muted">No available data for this analysis.</p>
      ) : (
        <div className="agent-bars">
          {data.slice(0, 12).map((item, index) => (
            <div key={item.label}>
              <div className="agent-bar-label">
                <span>{item.label}</span>
                <strong>{item.value.toLocaleString()}</strong>
              </div>
              <div className="agent-bar-track">
                <div
                  className="agent-bar-fill"
                  style={{
                    width: `${(item.value / maximum) * 100}%`,
                    background: COLORS[index % COLORS.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentDashboard() {
  const [activePage, setActivePage] = useState("Overview");
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [history, setHistory] = useState<ImportInfo[]>([]);
  const [searchText, setSearchText] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const totalRows = sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0);
  const totalErrors = sheets.reduce((sum, sheet) => sum + sheet.errors.length, 0);
  const totalFormulas = sheets.reduce((sum, sheet) => sum + sheet.formulaCount, 0);
  const allAlerts = sheets.flatMap((sheet) => sheet.alerts);
  const totalAlerts = allAlerts.length;
  const currentSheet = sheets.find((sheet) => sheet.name === selectedSheet);

  const matches = useMemo(() => buildMatches(sheets), [sheets]);

  async function handleFile(file?: File) {
    if (!file) return;

    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setErrorMessage("Please select an Excel or CSV file.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage("File is too large. Maximum size is 20 MB.");
      return;
    }

    setSelectedFile(file);
    setSheets([]);
    setSelectedSheet("");
    setErrorMessage("");
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: "array",
        cellFormula: true,
        cellStyles: false,
      });

      const results: SheetInfo[] = workbook.SheetNames.map((name) => {
        const worksheet = workbook.Sheets[name];
        const range = worksheet["!ref"]
          ? XLSX.utils.decode_range(worksheet["!ref"])
          : null;

        const rows: string[][] = [];
        const errors: { cell: string; value: string }[] = [];
        const alerts: AlertInfo[] = [];
        let formulaCount = 0;

        const errorPattern =
          /^#(?:REF!|VALUE!|DIV\/0!|NAME\?|N\/A|NUM!|NULL!|SPILL!|CALC!|GETTING_DATA)$/i;

        if (range) {
          for (let r = range.s.r; r <= range.e.r; r++) {
            const currentRow: string[] = [];

            for (let c = range.s.c; c <= range.e.c; c++) {
              const address = XLSX.utils.encode_cell({ r, c });
              const cell = worksheet[address];

              if (cell?.f) formulaCount++;

              const value = cell
                ? String(cell.w ?? (cell.t === "e" ? cell.v : cell.v ?? "")).trim()
                : "";

              currentRow.push(value);

              if (cell?.t === "e" || errorPattern.test(value)) {
                errors.push({ cell: address, value: value || "Excel error" });
                alerts.push({
                  id: `${name}-${address}-excel`,
                  sheet: name,
                  cell: address,
                  title: "Excel Formula Error",
                  detail: `An Excel error was detected: ${value || "Excel error"}`,
                  severity: "critical",
                });
              }
            }

            rows.push(currentRow);
          }
        }

        const headers = rows[0] || [];
        const idColumn = findColumn(headers, [
          "projectid", "projectcode", "projectnumber", "projectno",
        ]);
        const nameColumn = findColumn(headers, ["projectname", "projecttitle"]);

        const idOccurrences = new Map<string, number[]>();
        const nameOccurrences = new Map<string, number[]>();

        rows.slice(1).forEach((row, index) => {
          if (!row.some((value) => value.trim())) return;

          const actualRow = (range?.s.r ?? 0) + index + 1;
          const rowNumber = actualRow + 1;

          if (idColumn !== -1) {
            const value = (row[idColumn] || "").trim();
            const cell = XLSX.utils.encode_cell({
              r: actualRow,
              c: (range?.s.c ?? 0) + idColumn,
            });

            if (!value) {
              alerts.push({
                id: `${name}-${cell}-missing-id`,
                sheet: name,
                cell,
                title: "Missing Project ID",
                detail: `Project ID is empty in row ${rowNumber}.`,
                severity: "warning",
              });
            } else {
              idOccurrences.set(normalize(value), [
                ...(idOccurrences.get(normalize(value)) || []),
                rowNumber,
              ]);
            }
          }

          if (nameColumn !== -1) {
            const value = (row[nameColumn] || "").trim();
            const cell = XLSX.utils.encode_cell({
              r: actualRow,
              c: (range?.s.c ?? 0) + nameColumn,
            });

            if (!value) {
              alerts.push({
                id: `${name}-${cell}-missing-name`,
                sheet: name,
                cell,
                title: "Missing Project Name",
                detail: `Project name is empty in row ${rowNumber}.`,
                severity: "warning",
              });
            } else {
              nameOccurrences.set(normalize(value), [
                ...(nameOccurrences.get(normalize(value)) || []),
                rowNumber,
              ]);
            }
          }
        });

        idOccurrences.forEach((occurrences, id) => {
          occurrences.slice(1).forEach((rowNumber) => {
            const cell = `Row ${rowNumber}`;
            alerts.push({
              id: `${name}-${cell}-duplicate-id`,
              sheet: name,
              cell,
              title: "Duplicate Project ID",
              detail: `Project ID "${id}" appears more than once. First occurrence: row ${occurrences[0]}.`,
              severity: "warning",
            });
          });
        });

        nameOccurrences.forEach((occurrences, projectName) => {
          occurrences.slice(1).forEach((rowNumber) => {
            const cell = `Row ${rowNumber}`;
            alerts.push({
              id: `${name}-${cell}-duplicate-name`,
              sheet: name,
              cell,
              title: "Possible Duplicate Project",
              detail: `Project name "${projectName}" appears more than once. First occurrence: row ${occurrences[0]}.`,
              severity: "warning",
            });
          });
        });

        return {
          name,
          rows,
          rowCount: Math.max(rows.length - 1, 0),
          columnCount: rows.reduce((max, row) => Math.max(max, row.length), 0),
          formulaCount,
          errors,
          alerts,
        };
      });

      setSheets(results);
      setSelectedSheet(results[0]?.name || "");

      const rowTotal = results.reduce((sum, sheet) => sum + sheet.rowCount, 0);

      setHistory((previous) => [
        {
          name: file.name,
          date: new Date().toLocaleString(),
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          sheets: results.length,
          rows: rowTotal,
        },
        ...previous,
      ]);

      setActivePage("Overview");
    } catch (error) {
      console.error("Excel processing error:", error);
      setErrorMessage(
        "The workbook could not be read. Please check that the file is valid and try again."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function removeFile() {
    setSelectedFile(null);
    setSheets([]);
    setSelectedSheet("");
    setErrorMessage("");
    setSearchText("");
    if (fileInput.current) fileInput.current.value = "";
  }

  function openAlert(alert: AlertInfo) {
    setSelectedSheet(alert.sheet);
    setActivePage("Excel Intelligence");
  }

  function UploadPanel() {
    return (
      <div className="agent-panel agent-upload-panel">
        <div className="agent-panel-heading">
          <div>
            <div className="agent-eyebrow">DATA INPUT</div>
            <h2>Upload your workbook</h2>
            <p>Select an OSP Excel database to begin analysis.</p>
          </div>
          <div className="agent-heading-icon"><Upload size={22} /></div>
        </div>

        <div
          className="agent-upload-area"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            handleFile(event.dataTransfer.files[0]);
          }}
          onClick={() => fileInput.current?.click()}
        >
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <div className="agent-upload-icon"><Upload size={25} /></div>
          <h3>{isProcessing ? "Reading your workbook..." : "Drop your file here"}</h3>
          <p>
            {isProcessing
              ? "Please wait while worksheets are processed"
              : "or click to browse your computer"}
          </p>
          <span className="agent-file-types">XLSX · XLS · CSV</span>
        </div>

        {selectedFile && (
          <div className="agent-selected-file">
            <FileSpreadsheet size={23} />
            <div>
              <strong>{selectedFile.name}</strong>
              <small>
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB ·
                {isProcessing ? " Processing..." : " Read successfully"}
              </small>
            </div>
            <button onClick={removeFile} aria-label="Remove file"><X size={18} /></button>
          </div>
        )}

        {errorMessage && <div className="agent-error-message">{errorMessage}</div>}

        <div className="agent-upload-footer">
          <span><span className="agent-secure-dot" /> Read-only processing</span>
          <span>Maximum file size: 20 MB</span>
        </div>
      </div>
    );
  }

  function Stats() {
    const stats = [
      ["WORKSHEETS READ", sheets.length, "Worksheets processed", FileSpreadsheet],
      ["DATA ROWS FOUND", totalRows.toLocaleString(), "Across all worksheets", Database],
      ["NOTIFICATIONS", totalAlerts, "Items requiring review", AlertTriangle],
      ["FORMULAS FOUND", totalFormulas.toLocaleString(), "Formula cells identified", Activity],
    ];

    return (
      <section className="agent-stats-grid">
        {stats.map(([label, value, note, Icon]) => {
          const StatIcon = Icon as typeof Activity;
          return (
            <div className="agent-stat-card" key={String(label)}>
              <div className="agent-stat-top">
                <span>{String(label)}</span>
                <StatIcon size={18} />
              </div>
              <div className="agent-stat-value">{String(value)}</div>
              <div className="agent-stat-note">{String(note)}</div>
            </div>
          );
        })}
      </section>
    );
  }

  function PageHeader({
    eyebrow,
    title,
    description,
    icon: Icon,
  }: {
    eyebrow: string;
    title: string;
    description: string;
    icon: typeof Activity;
  }) {
    return (
      <section className="agent-welcome">
        <div>
          <div className="agent-eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="agent-welcome-icon"><Icon size={28} /></div>
      </section>
    );
  }

  function renderOverview() {
    return (
      <>
        <PageHeader
          eyebrow="PROJECT INTELLIGENCE SYSTEM"
          title="Workbook Overview"
          description="A complete view of your OSP data, project records, demographics and validation results."
          icon={Bot}
        />
        <Stats />

        {!sheets.length ? (
          <div className="agent-content-grid">
            <UploadPanel />
            <div className="agent-panel agent-workflow-panel">
              <div className="agent-eyebrow">HOW IT WORKS</div>
              <h2>Intelligent data workflow</h2>
              <p className="agent-muted">Every workbook passes through controlled analysis stages.</p>
              {[
                ["01", "Workbook Analysis", "Read sheets, columns and values"],
                ["02", "Data Understanding", "Identify project and demographic fields"],
                ["03", "Data Validation", "Find duplicates and Excel errors"],
                ["04", "Human Approval", "Review proposed changes"],
                ["05", "Database Sync", "Future approved synchronization"],
              ].map((step) => (
                <div className="agent-workflow-step" key={step[0]}>
                  <span className="agent-step-number">{step[0]}</span>
                  <div><strong>{step[1]}</strong><small>{step[2]}</small></div>
                  <span className="agent-step-state">READY</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="agent-section-heading">
              <div>
                <div className="agent-eyebrow">WORKBOOK ANALYTICS</div>
                <h2>Data Distribution</h2>
                <p className="agent-muted">Combined analysis across all worksheets.</p>
              </div>
              <button className="agent-text-button" onClick={() => setActivePage("Sheet Summary")}>
                OPEN FULL ANALYSIS <ChevronRight size={15} />
              </button>
            </div>

            <div className="agent-chart-grid">
              {DIMENSIONS.map((dimension) => {
                const result = collectDimension(sheets, dimension);
                return (
                  <DonutChart
                    key={dimension.key}
                    title={dimension.label}
                    description="All available workbook records"
                    data={result.found ? result.data : []}
                  />
                );
              })}
            </div>

            <div className="agent-content-grid agent-overview-bottom">
              <div className="agent-panel">
                <div className="agent-eyebrow">WORKSHEET INVENTORY</div>
                <h2>Imported worksheets</h2>
                <div className="agent-sheet-list">
                  {sheets.map((sheet) => (
                    <button
                      key={sheet.name}
                      className="agent-sheet-card"
                      onClick={() => {
                        setSelectedSheet(sheet.name);
                        setActivePage("Excel Intelligence");
                      }}
                    >
                      <FileSpreadsheet size={19} />
                      <span><strong>{sheet.name}</strong><small>{sheet.rowCount} rows · {sheet.columnCount} columns</small></span>
                      {sheet.alerts.length > 0 && <em>{sheet.alerts.length} alerts</em>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="agent-panel">
                <div className="agent-eyebrow">SMART MONITORING</div>
                <h2>Notification Center</h2>
                {!allAlerts.length ? (
                  <div className="agent-empty">
                    <CheckCircle2 size={25} />
                    <strong>No supported issues detected</strong>
                    <span>There are no current validation alerts.</span>
                  </div>
                ) : (
                  <div className="agent-alert-list">
                    {allAlerts.slice(0, 8).map((alert) => (
                      <button key={alert.id} onClick={() => openAlert(alert)}>
                        <strong>{alert.title}</strong>
                        <small>{alert.sheet} · {alert.cell}</small>
                      </button>
                    ))}
                  </div>
                )}
                <button className="agent-text-button" onClick={() => setActivePage("Data Validation")}>
                  VIEW ALL RESULTS <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  function renderExcelIntelligence() {
    return (
      <>
        <PageHeader
          eyebrow="WORKBOOK EXPLORER"
          title="Excel Intelligence"
          description="Explore the complete contents of every imported worksheet."
          icon={FileSpreadsheet}
        />

        {!sheets.length ? <UploadPanel /> : (
          <>
            <div className="agent-panel">
              <div className="agent-section-heading">
                <div><h2>Worksheet Explorer</h2><p className="agent-muted">Select a worksheet to view its contents.</p></div>
                <span className="agent-status-label">READ ONLY</span>
              </div>
              <div className="agent-sheet-list">
                {sheets.map((sheet) => (
                  <button
                    key={sheet.name}
                    className={`agent-sheet-card ${selectedSheet === sheet.name ? "selected" : ""}`}
                    onClick={() => setSelectedSheet(sheet.name)}
                  >
                    <FileSpreadsheet size={19} />
                    <span><strong>{sheet.name}</strong><small>{sheet.rowCount} rows · {sheet.columnCount} columns</small></span>
                    {sheet.alerts.length > 0 && <em>{sheet.alerts.length} alerts</em>}
                  </button>
                ))}
              </div>
            </div>

            {currentSheet && (
              <div className="agent-panel agent-table-panel">
                <div className="agent-section-heading">
                  <div><h2>{currentSheet.name}</h2><p className="agent-muted">All worksheet rows and columns · Read-only</p></div>
                  <div className="agent-metrics">
                    <span>{currentSheet.rowCount} rows</span>
                    <span>{currentSheet.columnCount} columns</span>
                    <span>{currentSheet.formulaCount} formulas</span>
                  </div>
                </div>

                <div className="agent-search">
                  <Search size={17} />
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search within this worksheet..."
                  />
                </div>

                <div className="agent-table-scroll">
                  <table className="agent-table">
                    <tbody>
                      {currentSheet.rows.map((row, rowIndex) => {
                        const matchesSearch = !searchText || row.some((cell) =>
                          cell.toLowerCase().includes(searchText.toLowerCase())
                        );
                        if (!matchesSearch) return null;

                        return (
                          <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => rowIndex === 0 ? (
                              <th key={cellIndex}>{cell || `Column ${cellIndex + 1}`}</th>
                            ) : (
                              <td key={cellIndex}>{cell || "—"}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {currentSheet.errors.length > 0 && (
                  <div className="agent-detected-errors">
                    <h3>Detected Excel errors</h3>
                    {currentSheet.errors.map((error) => (
                      <div key={error.cell}><strong>{error.cell}</strong><span>{error.value}</span></div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </>
    );
  }

  function renderProjectMatching() {
    return (
      <>
        <PageHeader
          eyebrow="CROSS-WORKSHEET COMPARISON"
          title="Project Matching"
          description="Identify repeated project IDs and similar project names across all imported worksheets."
          icon={GitCompareArrows}
        />
        <section className="agent-stats-grid">
          {[
            ["MATCH GROUPS", matches.length, "Potential matches found"],
            ["RECORDS COMPARED", totalRows, "Across available project records"],
            ["WORKSHEETS", sheets.length, "Included in comparison"],
            ["AUTOMATIC MERGES", 0, "No source data is modified"],
          ].map((item) => (
            <div className="agent-stat-card" key={String(item[0])}>
              <div className="agent-stat-top"><span>{item[0]}</span></div>
              <div className="agent-stat-value">{item[1]}</div>
              <div className="agent-stat-note">{item[2]}</div>
            </div>
          ))}
        </section>

        <div className="agent-panel agent-results-panel">
          <div className="agent-eyebrow">MATCHING RESULTS</div>
          <h2>Detected project similarities</h2>
          <p className="agent-muted">Exact matches and possible name similarities are separated. Review every result before making a decision.</p>

          {!sheets.length ? (
            <div className="agent-empty"><strong>No workbook loaded</strong><span>Upload a workbook to start project comparison.</span></div>
          ) : !matches.length ? (
            <div className="agent-empty"><strong>No matching records detected</strong><span>Matching requires project ID or project name columns.</span></div>
          ) : (
            <div className="agent-match-list">
              {matches.map((match) => (
                <div className="agent-match-card" key={match.id}>
                  <div className="agent-section-heading">
                    <div><strong>{match.type}</strong><p className="agent-muted">Confidence: {match.confidence}</p></div>
                    <span className="agent-status-label">{match.records.length} RECORDS</span>
                  </div>
                  {match.records.map((record) => (
                    <div className="agent-match-record" key={`${record.sheet}-${record.row}`}>
                      <strong>{record.name || "Unnamed project"}</strong>
                      <span>ID: {record.id || "Not available"} · Sheet: {record.sheet} · Row: {record.row}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  function renderValidation() {
    const critical = allAlerts.filter((alert) => alert.severity === "critical").length;
    const warnings = allAlerts.filter((alert) => alert.severity === "warning").length;

    return (
      <>
        <PageHeader
          eyebrow="DATA QUALITY MONITORING"
          title="Data Validation"
          description="Review formula errors, missing project fields and duplicate records without changing the source workbook."
          icon={ShieldCheck}
        />
        <section className="agent-stats-grid">
          {[
            ["TOTAL ALERTS", totalAlerts, "All validation findings"],
            ["EXCEL ERRORS", totalErrors, "Formula or cell errors"],
            ["CRITICAL", critical, "Excel errors"],
            ["WARNINGS", warnings, "Missing or duplicate fields"],
          ].map((item) => (
            <div className="agent-stat-card" key={String(item[0])}>
              <div className="agent-stat-top"><span>{item[0]}</span></div>
              <div className="agent-stat-value">{item[1]}</div>
              <div className="agent-stat-note">{item[2]}</div>
            </div>
          ))}
        </section>

        <div className="agent-panel agent-results-panel">
          <div className="agent-eyebrow">VALIDATION REPORT</div>
          <h2>All detected issues</h2>
          {!sheets.length ? (
            <div className="agent-empty"><strong>No workbook loaded</strong><span>Upload a workbook to start validation.</span></div>
          ) : !allAlerts.length ? (
            <div className="agent-empty"><CheckCircle2 size={25} /><strong>No supported issues detected</strong><span>No matching validation issues were found by the current rules.</span></div>
          ) : (
            <div className="agent-alert-list agent-alert-list-large">
              {allAlerts.map((alert) => (
                <button key={alert.id} onClick={() => openAlert(alert)}>
                  <span className={`agent-alert-symbol ${alert.severity}`}>
                    {alert.severity === "critical" ? "●" : "▲"}
                  </span>
                  <span>
                    <strong>{alert.title}</strong>
                    <small>{alert.detail}</small>
                    <small>{alert.sheet} · {alert.cell}</small>
                  </span>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  function renderSheetSummary() {
    const summary = currentSheet
      ? DIMENSIONS.map((dimension) => ({
          dimension,
          result: collectDimension(sheets, dimension, selectedSheet),
        }))
      : [];

    return (
      <>
        <PageHeader
          eyebrow="ADVANCED WORKBOOK ANALYTICS"
          title="Sheet Summary"
          description="Compare the complete workbook or focus on one individual worksheet."
          icon={BarChart3}
        />

        {!sheets.length ? <UploadPanel /> : (
          <>
            <div className="agent-panel">
              <div className="agent-eyebrow">ANALYSIS SCOPE</div>
              <h2>Select worksheet</h2>
              <p className="agent-muted">Choose an individual worksheet for focused analysis.</p>
              <select
                className="agent-select"
                value={selectedSheet}
                onChange={(event) => setSelectedSheet(event.target.value)}
              >
                {sheets.map((sheet) => <option key={sheet.name} value={sheet.name}>{sheet.name}</option>)}
              </select>
            </div>

            <section className="agent-stats-grid">
              {[
                ["SELECTED SHEET ROWS", currentSheet?.rowCount || 0, "Data rows"],
                ["COLUMNS", currentSheet?.columnCount || 0, "Detected columns"],
                ["FORMULAS", currentSheet?.formulaCount || 0, "Formula cells"],
                ["VALIDATION ALERTS", currentSheet?.alerts.length || 0, "Items for review"],
              ].map((item) => (
                <div className="agent-stat-card" key={String(item[0])}>
                  <div className="agent-stat-top"><span>{item[0]}</span></div>
                  <div className="agent-stat-value">{item[1]}</div>
                  <div className="agent-stat-note">{item[2]}</div>
                </div>
              ))}
            </section>

            <div className="agent-chart-grid">
              {summary.map(({ dimension, result }) => (
                <DonutChart
                  key={dimension.key}
                  title={dimension.label}
                  description={`Analysis for ${selectedSheet}`}
                  data={result.found ? result.data : []}
                />
              ))}
            </div>

            {currentSheet && (
              <BarChart
                title={`Top categories in ${currentSheet.name}`}
                data={summary.flatMap((item) => item.result.data)
                  .sort((a, b) => b.value - a.value).slice(0, 10)}
              />
            )}
          </>
        )}
      </>
    );
  }

  function renderHistory() {
    return (
      <>
        <PageHeader
          eyebrow="WORKSPACE RECORDS"
          title="Import History"
          description="Review files processed during this browser session."
          icon={History}
        />
        <div className="agent-panel agent-results-panel">
          <div className="agent-eyebrow">RECENT IMPORTS</div>
          <h2>Workbook history</h2>
          {!history.length ? (
            <div className="agent-empty"><History size={25} /><strong>No import history yet</strong><span>Imported workbooks will appear here.</span></div>
          ) : (
            <div className="agent-table-scroll">
              <table className="agent-table">
                <thead><tr><th>File name</th><th>Date</th><th>Size</th><th>Worksheets</th><th>Rows</th></tr></thead>
                <tbody>
                  {history.map((item, index) => (
                    <tr key={`${item.name}-${index}`}>
                      <td>{item.name}</td><td>{item.date}</td><td>{item.size}</td>
                      <td>{item.sheets}</td><td>{item.rows.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  }

  function renderSettings() {
    const settings = [
      ["Source data modification", "Disabled"],
      ["Automatic project merging", "Disabled"],
      ["Automatic database synchronization", "Disabled"],
      ["Excel file size limit", "20 MB"],
      ["Supported file formats", "XLSX, XLS, CSV"],
      ["Analysis mode", "Browser-based processing"],
    ];

    return (
      <>
        <PageHeader
          eyebrow="SYSTEM CONFIGURATION"
          title="Settings"
          description="Current workspace configuration and system information."
          icon={Settings}
        />
        <div className="agent-panel agent-results-panel">
          <div className="agent-eyebrow">PROCESSING SETTINGS</div>
          <h2>Data protection</h2>
          {settings.map(([label, value]) => (
            <div className="agent-setting-row" key={label}>
              <strong>{label}</strong><span>{value}</span>
            </div>
          ))}
          <div className="agent-notice">
            <strong>Future integration</strong>
            <p>AI model integration, Supabase synchronization, user permissions and approval workflows are not connected yet. They will be implemented in separate development stages.</p>
          </div>
        </div>
      </>
    );
  }

  function renderActivePage() {
    switch (activePage) {
      case "Excel Intelligence": return renderExcelIntelligence();
      case "Project Matching": return renderProjectMatching();
      case "Data Validation": return renderValidation();
      case "Sheet Summary": return renderSheetSummary();
      case "Import History": return renderHistory();
      case "Settings": return renderSettings();
      default: return renderOverview();
    }
  }

  return (
    <div className="osp-agent-root">
      <div className="agent-app-shell">
        {mobileNavOpen && (
          <button
            className="agent-mobile-backdrop"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <aside className={`agent-sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
          <div className="agent-brand">
            <div className="agent-brand-icon">O</div>
            <div><h2>OSP <span>AI</span></h2><p>INTELLIGENCE AGENT</p></div>
            <button className="agent-mobile-close" onClick={() => setMobileNavOpen(false)}><X size={18} /></button>
          </div>

          <div className="agent-workspace-label">WORKSPACE</div>
          <nav className="agent-navigation">
            {NAVIGATION.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  className={`agent-nav-item ${activePage === item.name ? "active" : ""}`}
                  onClick={() => {
                    setActivePage(item.name);
                    setMobileNavOpen(false);
                  }}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                  {item.name === "Data Validation" && totalAlerts > 0 && (
                    <em>{totalAlerts}</em>
                  )}
                  {item.name === "Project Matching" && matches.length > 0 && (
                    <em>{matches.length}</em>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="agent-sidebar-bottom">
            <div className="agent-system-status">
              <span />
              <div><strong>System Online</strong><small>Independent Workspace</small></div>
            </div>
            <div className="agent-version">OSP AI Agent · Version 2.0</div>
          </div>
        </aside>

        <main className="agent-main-content">
          <header className="agent-topbar">
            <div className="agent-topbar-left">
              <button className="agent-menu-button" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button>
              <div><span>OSP / AI Workspace / </span><strong>{activePage}</strong></div>
            </div>
            <div className="agent-topbar-right">
              {totalAlerts > 0 && (
                <button className="agent-notification-button" onClick={() => setActivePage("Data Validation")}>
                  <AlertTriangle size={17} /><strong>{totalAlerts}</strong>
                </button>
              )}
              <span className="agent-environment">DEVELOPMENT</span>
              <div className="agent-avatar">A</div>
            </div>
          </header>

          <div className="agent-page-content">{renderActivePage()}</div>

          <footer className="agent-footer">
            <span>OSP AI Agent · Independent Intelligence Workspace</span>
            <span>Built for OSP Project Intelligence Hub</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

/**
 * Floating Agent widget.
 * Add <AgentWidget /> once in the main OSP application.
 */
export function AgentWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="osp-agent-widget">
      {isOpen && (
        <div className="agent-widget-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsOpen(false);
        }}>
          <section className="agent-widget-window" aria-label="OSP Intelligence Agent">
            <button
              className="agent-widget-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close OSP Agent"
            >
              <X size={20} />
            </button>
            <AgentDashboard />
          </section>
        </div>
      )}

      <button
        className={`agent-floating-button ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen((value) => !value)}
        aria-label={isOpen ? "Close OSP Agent" : "Open OSP Agent"}
        title="OSP Intelligence Agent"
      >
        {isOpen ? <X size={25} /> : <Bot size={26} />}
        {!isOpen && <span className="agent-floating-pulse" />}
      </button>
    </div>
  );
}

export default AgentWidget;
