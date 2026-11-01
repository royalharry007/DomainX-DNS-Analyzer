
const dns = require("dns").promises;

async function analyzeEmailSecurity(domain) {

    const results = {
        SPF: {
            found: false,
            record: null,
            message: ""
        },
        DMARC: {
            found: false,
            record: null,
            policy: null,
            message: ""
        }
    };

    // Check SPF at the root domain
    try {
        const txtRecords = await dns.resolveTxt(domain);

        const spfRecord = txtRecords
            .map(record => record.join(""))
            .find(record =>
                record.toLowerCase().startsWith("v=spf1")
            );

        if (spfRecord) {
            results.SPF.found = true;
            results.SPF.record = spfRecord;
            results.SPF.message = "SPF record detected.";
        } else {
            results.SPF.message = "No SPF record found.";
        }

    } catch (error) {
        results.SPF.message = "Unable to retrieve SPF records.";
    }

    // Check DMARC at _dmarc.domain
    try {
        const dmarcRecords = await dns.resolveTxt(
            `_dmarc.${domain}`
        );

        const dmarcRecord = dmarcRecords
            .map(record => record.join(""))
            .find(record =>
                record.toLowerCase().startsWith("v=dmarc1")
            );

        if (dmarcRecord) {
            const policyMatch = dmarcRecord.match(
                /(?:^|;)\s*p\s*=\s*(none|quarantine|reject)/i
            );

            results.DMARC.found = true;
            results.DMARC.record = dmarcRecord;
            results.DMARC.policy = policyMatch
                ? policyMatch[1].toLowerCase()
                : "unspecified";

            results.DMARC.message = "DMARC record detected.";

        } else {
            results.DMARC.message = "No DMARC record found.";
        }

    } catch (error) {
        results.DMARC.message = "Unable to retrieve DMARC records.";
    }

    return results;
}

module.exports = { analyzeEmailSecurity };
