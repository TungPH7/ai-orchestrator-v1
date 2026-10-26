// Checks the contract against its schemas and consistency rules (spec section 7).
// Usage: node scripts/validate-contract.mjs [contract-dir]
import { formatError, readContract, validateContract } from '../lib/contract.mjs';

const dir = process.argv[2] ?? 'contract';

try {
  const errors = validateContract(readContract(dir));
  if (errors.length === 0) {
    console.log(`Contract OK: ${dir}`);
  } else {
    for (const error of errors) console.error(formatError(error));
    console.error(`${errors.length} error(s) in ${dir}`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
