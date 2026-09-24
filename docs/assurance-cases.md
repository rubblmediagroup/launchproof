# Assurance Cases

An Assurance Case is a structured claim whose state derives from controls and evidence. States are VERIFIED, SUPPORTED, PARTIAL, UNSUPPORTED, FAILED and UNKNOWN.

Current cases cover authentication/authorization, tenant isolation, secret hygiene, dependency integrity, executable guarantees, production readiness, AI governance and analysis provenance.

`SUPPORTED` means deterministic evidence supports the claim. `VERIFIED` is stronger: an explicitly authorized deterministic verification capable of exercising the guarantee succeeded in an isolated runner. Static evidence alone never upgrades a runtime claim to VERIFIED.
