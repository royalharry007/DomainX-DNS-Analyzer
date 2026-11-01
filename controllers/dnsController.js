
const dns = require("dns").promises;

// Function to safely resolve DNS records
async function resolveRecord(domain, type, resolver) {
    try {
        return await resolver(domain);
    } catch (error) {
        return [];
    }
}

// Main DNS analysis function
async function getBasicDNS(domain) {

    const results = {
        domain: domain,
        A: [],
        AAAA: [],
        MX: [],
        NS: [],
        CNAME: [],
        TXT: [],
        errors: []
    };

    const recordTypes = [
        { type: "A", resolver: dns.resolve4 },
        { type: "AAAA", resolver: dns.resolve6 },
        { type: "MX", resolver: dns.resolveMx },
        { type: "NS", resolver: dns.resolveNs },
        { type: "CNAME", resolver: dns.resolveCname },
        { type: "TXT", resolver: dns.resolveTxt }
    ];

    for (const record of recordTypes) {
        try {
            results[record.type] =
                await record.resolver(domain);

        } catch (error) {
            results.errors.push({
                type: record.type,
                message: error.code || error.message
            });
        }
    }

    return results;
}

module.exports = { getBasicDNS };
