### Problem
Double booking under contention.

### Acceptance
```gherkin
Given one open slot and three clients
When two of them book it within the same instant
Then exactly one booking record exists
```

### Seams
adds a promise

### Seams detail
what is promised: one booking per slot · who is told: the losing client, immediately
