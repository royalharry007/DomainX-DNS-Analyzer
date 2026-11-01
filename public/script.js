

const analyzeBtn = document.getElementById("analyzeBtn");
const domainInput = document.getElementById("domainInput");
const message = document.getElementById("message");
let latestDNSData = null;

analyzeBtn.addEventListener("click", analyzeDomain);

// Also allow analysis by pressing Enter
domainInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        analyzeDomain();
    }
});

async function analyzeDomain() {
    const domain = domainInput.value.trim().toLowerCase();

    if (!domain) {
        message.textContent = "Please enter a domain name.";
        return;
    }

    analyzeBtn.textContent = "Analyzing...";
    analyzeBtn.disabled = true;
    message.textContent = "Fetching DNS records...";

    try {
        const response = await fetch(
            `/api/dns/${encodeURIComponent(domain)}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "DNS lookup failed.");
        }

        displayResults(result.data);

        message.textContent = "DNS analysis completed successfully.";

    } catch (error) {
        message.textContent = error.message;
        document.getElementById("domainStatus").textContent = "Error";
        document.getElementById("diagnosticReport").textContent =
            "Unable to complete the DNS analysis. Check the domain name and try again.";
    } finally {
        analyzeBtn.textContent = "Analyze Domain";
        analyzeBtn.disabled = false;
    }
}


function displayResults(data) {
    // Store latest DNS results
    latestDNSData = data;

    // Enable PDF button
    document.getElementById("downloadReportBtn").disabled = false;

    const records = [];

  

    // A records
    data.A.forEach(value => {
        records.push({
            type: "A",
            description: "IPv4 Address",
            value: value
        });
    });

    // AAAA records
    data.AAAA.forEach(value => {
        records.push({
            type: "AAAA",
            description: "IPv6 Address",
            value: value
        });
    });

    // MX records
    data.MX.forEach(value => {
        records.push({
            type: "MX",
            description: `Mail Server (Priority: ${value.priority})`,
            value: value.exchange
        });
    });

    // NS records
    data.NS.forEach(value => {
        records.push({
            type: "NS",
            description: "Nameserver",
            value: value
        });
    });

    // CNAME records
    data.CNAME.forEach(value => {
        records.push({
            type: "CNAME",
            description: "Canonical Name",
            value: value
        });
    });

    // TXT records
    data.TXT.forEach(value => {
        records.push({
            type: "TXT",
            description: "Text Record",
            value: value.join("")
        });
    });

    // Update dashboard statistics
    document.getElementById("domainStatus").textContent =
        records.length > 0 ? "Active" : "No records";

    document.getElementById("recordsCount").textContent =
        records.length;

    document.getElementById("nameserverCount").textContent =
        data.NS.length;

    document.getElementById("errorCount").textContent =
        data.errors.length;

    // Display records in table
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
        `A Records: ${data.A.length}\n` +
        `AAAA Records: ${data.AAAA.length}\n` +
        `MX Records: ${data.MX.length}\n` +
        `NS Records: ${data.NS.length}\n` +
        `CNAME Records: ${data.CNAME.length}\n` +
        `TXT Records: ${data.TXT.length}\n` +
        `Lookup Errors: ${data.errors.length}\n\n` +
        "DNS analysis completed.";

        
    // Display Email Security Results
    const security = data.emailSecurity;

    document.getElementById("spfStatus").textContent =
        security.SPF.found ? "SPF Detected" : "SPF Not Found";

    document.getElementById("spfRecord").textContent =
        security.SPF.record || "No SPF record available.";

    document.getElementById("dmarcStatus").textContent =
        security.DMARC.found ? "DMARC Detected" : "DMARC Not Found";

    document.getElementById("dmarcPolicy").textContent =
        "Policy: " + (security.DMARC.policy || "Unknown");

    document.getElementById("dmarcRecord").textContent =
        security.DMARC.record || "No DMARC record available.";


    }



function downloadPDF() {

    console.log("Download PDF button clicked!");

    if (!latestDNSData) {
        alert("Please analyze a domain first.");
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("PDF library not loaded. Check your internet connection.");
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

        const security = data.emailSecurity || {};

        if (y + 20 > 275) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(15);
        doc.text("Email Security Analysis", 20, y);

        y += 10;
        doc.setFontSize(10);

        const securityLines = [
            `SPF: ${security.SPF?.found ? "Detected" : "Not found"}`,
            `SPF Record: ${security.SPF?.record || "Not available"}`,
            `DMARC: ${security.DMARC?.found ? "Detected" : "Not found"}`,
            `DMARC Policy: ${security.DMARC?.policy || "Unknown"}`,
            `DMARC Record: ${security.DMARC?.record || "Not available"}`
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

        console.log("PDF generated successfully!");

    } catch (error) {
        console.error("PDF generation failed:", error);
        alert("Unable to generate PDF. Check the browser console.");
    }
}


document.getElementById("downloadReportBtn")
    .addEventListener("click", downloadPDF);

