
const express = require("express");
const router = express.Router();

const { getBasicDNS } = require("../controllers/dnsController");

const { analyzeEmailSecurity} = require("../utils/emailSecurity");

// GET /api/dns/google.com
router.get("/:domain", async (req, res) => {

    try {

        const domain = req.params.domain.trim().toLowerCase();

        // Basic domain validation
        const domainPattern =
            /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

        if (!domainPattern.test(domain)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid domain name."
            });
        }

        const result = await getBasicDNS(domain);

        const emailSecurity = await analyzeEmailSecurity(domain);

        res.json({
    success: true,
    data: {
        ...result,
        emailSecurity
    }
});

    } catch (error) {

        res.status(500).json({
            success: false,
            message: "Unable to perform DNS lookup."
        });

    }

});

module.exports = router;
