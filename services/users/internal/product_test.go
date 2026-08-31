package internal

import (
	"context"
	"encoding/json"
	"testing"
	"time"
)

func TestValidateProductInputDefaults(t *testing.T) {
	input := ProductRecordInput{Kind: "notification", Name: "Build finished"}
	if err := validateProductInput(&input); err != nil {
		t.Fatal(err)
	}
	if input.Status != "active" || string(input.Payload) != "{}" {
		t.Fatalf("unexpected defaults: %#v", input)
	}
}

func TestValidateProductSemanticsRejectsUnsafeConfiguration(t *testing.T) {
	expires := time.Now().Add(31 * 24 * time.Hour)
	tests := []ProductRecordInput{
		{Kind: "webhook", Payload: json.RawMessage(`{"url":"http://127.0.0.1/hook"}`)},
		{Kind: "delegation", SubjectID: pointer(int64(7)), ExpiresAt: &expires, Payload: json.RawMessage(`{"permission":"user:read:any"}`)},
		{Kind: "retention", Payload: json.RawMessage(`{"days":0}`)},
		{Kind: "consumer_quota", Payload: json.RawMessage(`{"consumer":"7","requestsPerMinute":0}`)},
	}
	for _, input := range tests {
		if err := validateProductSemantics(input); err == nil {
			t.Fatalf("expected %s validation to fail", input.Kind)
		}
	}
}

func TestProductRecordsEnforceVisibilitySecretsAndSingletons(t *testing.T) {
	svc, db, _, _ := newUsersFixture(t)
	svc.UseProductSecret("test-secret")
	ctx := context.Background()
	for _, profile := range []Profile{
		profileBuilder(1, "admin@example.test"),
		profileBuilder(2, "member@example.test"),
	} {
		if err := db.Create(&profile).Error; err != nil {
			t.Fatal(err)
		}
	}
	subject := int64(2)
	notification, _, err := svc.CreateProductRecord(ctx, 1, ProductRecordInput{
		Kind: "notification", SubjectID: &subject, Name: "Ready", Payload: json.RawMessage(`{"message":"done"}`),
	})
	if err != nil {
		t.Fatal(err)
	}
	visible, err := svc.ListProductRecords(ctx, 2, false, "notification", "", "", 10)
	if err != nil || len(visible) != 1 || visible[0].ID != notification.ID {
		t.Fatalf("subject visibility = %#v, %v", visible, err)
	}
	if _, err := svc.UpdateProductRecord(ctx, 2, notification.ID, false, "read", notification.Payload); err != nil {
		t.Fatalf("mark notification read: %v", err)
	}
	_, secret, err := svc.CreateProductRecord(ctx, 1, ProductRecordInput{
		Kind: "api_key", Name: "automation", Payload: json.RawMessage(`{"scopes":["user:read:any"]}`),
	})
	if err != nil || len(secret) < 20 {
		t.Fatalf("one-time API key = %q, %v", secret, err)
	}
	for _, name := range []string{"First", "Second"} {
		if _, _, err := svc.CreateProductRecord(ctx, 1, ProductRecordInput{
			Kind: "branding", Name: name, Payload: json.RawMessage(`{"name":"Acme"}`),
		}); err != nil {
			t.Fatal(err)
		}
	}
	var branding int64
	if err := db.Table("users.product_records").Where("kind = 'branding'").Count(&branding).Error; err != nil || branding != 1 {
		t.Fatalf("branding records = %d, %v", branding, err)
	}
}

func pointer[T any](value T) *T { return &value }
