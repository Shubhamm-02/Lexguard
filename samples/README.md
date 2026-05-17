# LEXGUARD Samples

Use these files from the upload screen or from the CLI.

- `category-coverage-contract.txt`: stress-test contract that intentionally triggers every LEXGUARD practical risk and all 41 CUAD categories.
- `freelance-founder-red-flags.txt`: founder/freelancer demo focused on IP, payment, license, and confidentiality risk.
- `vendor-msa-red-flags.txt`: vendor demo focused on audit, compliance, uncapped liability, and termination asymmetry.
- `balanced-services-agreement.txt`: low-risk control file for showing that the analyzer can stay quiet when terms are balanced.
- `no-risk-employment-offer.txt`: employee-friendly offer letter with side-project and prior-invention carveouts.
- `no-risk-subscription-terms.txt`: consumer-friendly subscription terms with cancellation, refund, and data-use limits.
- `no-risk-vendor-mutual-msa.txt`: mutual vendor agreement with scoped review rights and background-IP protection.
- `employment-agreement.txt` and `subscription-terms.txt`: earlier role demos for employee and consumer review.

Run the deterministic coverage check:

```bash
npm run test:samples
```
