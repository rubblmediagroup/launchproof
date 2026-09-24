# Deterministic Release Confidence

Release Confidence is deterministic and reproducible. It combines weighted LP-01..LP-20 outcomes, evaluated-control coverage, Assurance Case state and open-finding severity.

Control contribution values are PASS 100, PARTIAL 55, UNKNOWN 0 and FAIL 0. Control weights live in the versioned Build Standard. Assurance Cases and open findings apply bounded deterministic penalties.

Hard gates override the numeric score, including configured severity thresholds, critical findings, secret policy, authorization failures, required tenant isolation, required verified tests, failed Assurance Cases and required domain coverage.

The score is an explanation aid, not a security probability.
