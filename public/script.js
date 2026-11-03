
const analyzeBtn = document.getElementById("analyzeBtn");
const domainInput = document.getElementById("domainInput");
const message = document.getElementById("message");

let latestDNSData = null;

// Function to display colored messages
function showMessage(text, type) {
    message.textContent = text;

    if (type === "success") {
        message.style.color = "#16a34a";
    } 
    else if (type === "error") {
        message.style.color = "#dc2626";
    } 
    else if (type === "warning") {
        message.style.color = "#d97706";
    } 
    else {
        message.style.color = "#334155";
    }
}

analyzeBtn.addEventListener("click", analyzeDomain);

// Allow analysis by pressing Enter
domainInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        analyzeDomain();
    }
});

async function analyzeDomain() {
    const domain = domainInput.value.trim().toLowerCase();

    if (!domain) {
        showMessage("Please enter a domain name.", "warning");
        return;
    }

    analyzeBtn.textContent = "Analyzing...";
    analyzeBtn.disabled = true;

    showMessage("Fetching DNS records...", "");

    try {
        const response = await fetch(
            `/api/dns/${encodeURIComponent(domain)}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "DNS lookup failed.");
        }

        displayResults(result.data);

        const data = result.data;

        const recordTypes = ["A", "AAAA", "MX", "NS", "CNAME", "TXT"];

        const totalRecords = recordTypes.reduce(
            (total, type) => total + (data[type]?.length || 0),
            0
        );

        const totalErrors = data.errors?.length || 0;

        // Display the appropriate colored message
        if (totalRecords > 0) {
            showMessage(
                "DNS analysis completed successfully.",
                "success"
            );
        } else if (totalErrors > 0) {
            showMessage(
                "DNS lookup failed. Please verify the domain name.",
                "error"
            );
        } else {
            showMessage(
                "No DNS records were found for this domain.",
                "warning"
            );
        }

    } catch (error) {
        latestDNSData = null;

        document.getElementById("downloadReportBtn").disabled = true;

        showMessage(
            error.message || "Unable to analyze this domain.",
            "error"
        );

        document.getElementById("domainStatus").textContent = "Error";

        document.getElementById("diagnosticReport").textContent =
            "Unable to complete DNS analysis. Please check the domain name and try again.";

    } finally {
        analyzeBtn.textContent = "Analyze Domain";
        analyzeBtn.disabled = false;
    }
}


function displayResults(data) {

    // Store latest DNS results
    latestDNSData = data;

    // Enable PDF download
    document.getElementById("downloadReportBtn").disabled = false;

    // Safely get DNS record arrays
    const A = data.A || [];
    const AAAA = data.AAAA || [];
    const MX = data.MX || [];
    const NS = data.NS || [];
    const CNAME = data.CNAME || [];
    const TXT = data.TXT || [];
    const errors = data.errors || [];

    const records = [];

    // A records
    A.forEach(value => {
        records.push({
            type: "A",
            description: "IPv4 Address",
            value: value
        });
    });

    // AAAA records
    AAAA.forEach(value => {
        records.push({
            type: "AAAA",
            description: "IPv6 Address",
            value: value
        });
    });

    // MX records
    MX.forEach(value => {
        records.push({
            type: "MX",
            description: `Mail Server (Priority: ${value.priority})`,
            value: value.exchange
        });
    });

    // NS records
    NS.forEach(value => {
        records.push({
            type: "NS",
            description: "Nameserver",
            value: value
        });
    });

    // CNAME records
    CNAME.forEach(value => {
        records.push({
            type: "CNAME",
            description: "Canonical Name",
            value: value
        });
    });

    // TXT records
    TXT.forEach(value => {
        records.push({
            type: "TXT",
            description: "Text Record",
            value: value.join("")
        });
    });

    // Update dashboard statistics
    let status = "No records";

    if (records.length > 0) {
        status = "Active";
    } else if (errors.length > 0) {
        status = "Lookup failed";
    }

    document.getElementById("domainStatus").textContent = status;

    document.getElementById("recordsCount").textContent =
        records.length;

    document.getElementById("nameserverCount").textContent =
        NS.length;

    document.getElementById("errorCount").textContent =
        errors.length;

    // Display DNS records in table
    const tableBody = document.getElementById("recordsTable");
    tableBody.replaceChildren();

    if (records.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 3;
        cell.textContent = "No DNS records found.";

        row.appendChild(cell);
        tableBody.appendChild(row);
    }

    records.forEach(record => {
        const row = document.createElement("tr");

        const typeCell = document.createElement("td");
        typeCell.textContent = record.type;

        const descriptionCell = document.createElement("td");
        descriptionCell.textContent = record.description;

        const statusCell = document.createElement("td");
        statusCell.textContent = record.value;

        row.append(typeCell, descriptionCell, statusCell);
        tableBody.appendChild(row);
    });

    // Generate diagnostic report
    const report = document.getElementById("diagnosticReport");

    report.textContent =
        `Domain: ${data.domain}\n\n` +
        `A Records: ${A.length}\n` +
        `AAAA Records: ${AAAA.length}\n` +
        `MX Records: ${MX.length}\n` +
        `NS Records: ${NS.length}\n` +
        `CNAME Records: ${CNAME.length}\n` +
        `TXT Records: ${TXT.length}\n` +
        `Lookup Errors: ${errors.length}\n\n` +
        "DNS analysis completed.";

    // Display Email Security Results
    const security = data.emailSecurity || {};

    const SPF = security.SPF || {};
    const DMARC = security.DMARC || {};

    document.getElementById("spfStatus").textContent =
        SPF.found ? "SPF Detected" : "SPF Not Found";

    document.getElementById("spfRecord").textContent =
        SPF.record || "No SPF record available.";

    document.getElementById("dmarcStatus").textContent =
        DMARC.found ? "DMARC Detected" : "DMARC Not Found";

    document.getElementById("dmarcPolicy").textContent =
        "Policy: " + (DMARC.policy || "Unknown");

    document.getElementById("dmarcRecord").textContent =
        DMARC.record || "No DMARC record available.";
}


// Download PDF report
function downloadPDF() {

    if (!latestDNSData) {
        alert("Please analyze a domain first.");
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("PDF library not loaded. Check the browser console.");
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const data = latestDNSData;
        let y = 20;

        doc.setFontSize(20);
        doc.text("DomainX - DNS Diagnostic Report", 20, y);

        y += 15;

        doc.setFontSize(12);
        doc.text(`Domain: ${data.domain}`, 20, y);

        y += 12;

        doc.setFontSize(15);
        doc.text("DNS Records", 20, y);

        y += 10;
        doc.setFontSize(10);

        const recordTypes = ["A", "AAAA", "MX", "NS", "CNAME", "TXT"];

        recordTypes.forEach(type => {

            const records = data[type] || [];

            if (y > 275) {
                doc.addPage();
                y = 20;
            }

            doc.setFont(undefined, "bold");
            doc.text(`${type} Records (${records.length})`, 20, y);

            y += 7;
            doc.setFont(undefined, "normal");

            records.forEach(record => {

                let value;

                if (type === "MX") {
                    value = `${record.exchange} (Priority: ${record.priority})`;
                } else if (type === "TXT") {
                    value = record.join("");
                } else {
                    value = String(record);
                }

                const lines = doc.splitTextToSize(value, 165);

                if (y + lines.length * 5 > 275) {
                    doc.addPage();
                    y = 20;
                }

                doc.text(lines, 25, y);
                y += lines.length * 5 + 2;
            });

            y += 3;
        });

        // Email Security Analysis
        const security = data.emailSecurity || {};
        const SPF = security.SPF || {};
        const DMARC = security.DMARC || {};

        if (y + 20 > 275) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(15);
        doc.text("Email Security Analysis", 20, y);

        y += 10;
        doc.setFontSize(10);

        const securityLines = [
            `SPF: ${SPF.found ? "Detected" : "Not found"}`,
            `SPF Record: ${SPF.record || "Not available"}`,
            `DMARC: ${DMARC.found ? "Detected" : "Not found"}`,
            `DMARC Policy: ${DMARC.policy || "Unknown"}`,
            `DMARC Record: ${DMARC.record || "Not available"}`
        ];

        securityLines.forEach(line => {
            const lines = doc.splitTextToSize(line, 165);

            if (y + lines.length * 5 > 275) {
                doc.addPage();
                y = 20;
            }

            doc.text(lines, 20, y);
            y += lines.length * 5 + 2;
        });

        doc.save(`DomainX-${data.domain}-Report.pdf`);

    } catch (error) {
        console.error("PDF generation failed:", error);
        alert("Unable to generate PDF. Check the browser console.");
    }
}


document.getElementById("downloadReportBtn")
    .addEventListener("click", downloadPDF);


    
// ==============================
// ABOUT ME POPUP FUNCTIONALITY
// ==============================

const aboutBtn = document.getElementById("aboutBtn");
const aboutModal = document.getElementById("aboutModal");
const closeAboutBtn = document.getElementById("closeAboutBtn");

// Open About Me popup
if (aboutBtn && aboutModal) {
    aboutBtn.addEventListener("click", function () {
        aboutModal.classList.add("show");
    });
}

// Close using X button
if (closeAboutBtn && aboutModal) {
    closeAboutBtn.addEventListener("click", function () {
        aboutModal.classList.remove("show");
    });
}

// Close when clicking outside the card
if (aboutModal) {
    aboutModal.addEventListener("click", function (event) {
        if (event.target === aboutModal) {
            aboutModal.classList.remove("show");
        }
    });
}

// Close using Escape key
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && aboutModal) {
        aboutModal.classList.remove("show");
    }
});
