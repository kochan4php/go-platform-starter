package main

import "testing"

func TestParseJobsValidatesConfiguration(t *testing.T) {
	jobs, err := parseJobs(`[{"name":"digest","every":"1m","stream":"mail.jobs","event":"digest.send","payload":{"kind":"daily"}}]`)
	if err != nil || len(jobs) != 1 || jobs[0].Name != "digest" {
		t.Fatalf("jobs=%#v err=%v", jobs, err)
	}
	if _, err := parseJobs(`[{"name":"bad","every":"0s"}]`); err == nil {
		t.Fatal("invalid job accepted")
	}
}
