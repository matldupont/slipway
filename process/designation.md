# Designation — which model, how much effort

Read at intake (every issue's effort line) and by whoever launches the work.

**One question decides it: is there ground truth to check the answer against?** (L-31)

| | examples | allocate |
|---|---|---|
| **An oracle exists** | an inventory, audit, validation sweep, options memo, parity check; most implementation work with tests | the standard model, fan-out where breadth matters, mechanical verification, and one fresh-context reviewer |
| **No oracle** | a schema other work is built on, a set of principles, a definition of "correct" | the strongest model at high effort, no fan-out. A reviewer can critique the design you wrote; it cannot supply the one you never considered |

Whether the deliverable is a document or a diff does not decide it.

**Tier review by consequence.** Money, auth, schema and data deletion always get a fresh-context review
that refutes by default. Independent review pays best on the claims the author was most confident about (L-38).

**Check that a short security review is not a declined one.** Some models' safety filters decline security
analysis and return a short answer that reads as "nothing found". Use a model that performs security review,
and treat a thin result as unverified.
