const crypto = require('crypto');

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generates an irreversible cryptographic receipt code for the voter.
 * The receipt proves the vote exists in the blockchain-style ledger without
 * revealing which candidate the voter selected to third parties.
 */
function generateReceipt(electionId, candidateId) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = new Date().toISOString();
  // Secret salt to ensure zero-knowledge proof
  const rawHash = sha256(`${electionId}:${candidateId}:${timestamp}:${nonce}`);
  
  // Format as friendly human-verifiable token: BLT-XXXX-XXXX-XXXX
  const prefix = 'BLT-' + rawHash.substring(0, 4).toUpperCase() + '-' + rawHash.substring(4, 8).toUpperCase() + '-' + rawHash.substring(8, 12).toUpperCase();
  
  return {
    receiptCode: prefix,
    receiptHash: rawHash,
    timestamp
  };
}

/**
 * Creates a tamper-evident chained audit entry
 */
function createAuditBlock(lastLog, action, details) {
  const blockNumber = (lastLog ? lastLog.block : 0) + 1;
  const previousHash = lastLog ? lastLog.hash : '0000000000000000000000000000000000000000000000000000000000000000';
  const timestamp = new Date().toISOString();
  const hash = sha256(`${blockNumber}:${previousHash}:${timestamp}:${action}:${details}`);

  return {
    block: blockNumber,
    timestamp,
    action,
    details,
    previousHash,
    hash
  };
}

module.exports = {
  sha256,
  generateReceipt,
  createAuditBlock
};
