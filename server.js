const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Import DNS routes
const dnsRoutes = require("./routes/dnsRoutes");

//middleware
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

// DNS API routes
app.use("/api/dns", dnsRoutes);

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "DomainX server is running!",
        project: "DomainX DNS Analyzer"
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`DomainX running at http://localhost:${PORT}`);
    });
}

module.exports = app;

