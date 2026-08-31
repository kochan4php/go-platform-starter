package internal

import "testing"

func TestSpecRouteTableSupportsHeadAndDeprecation(t *testing.T) {
	routes, err := SpecRouteTable("rbac", `paths:
  /rbac/permissions/{name}:
    head:
      x-required-permission: permission:read:any
      x-deprecated-at: 1788134400
      x-sunset: Mon, 30 Nov 2026 00:00:00 GMT
      responses:
        "204": {description: exists}
`)
	if err != nil {
		t.Fatal(err)
	}
	if len(routes) != 1 || routes[0].Method != "HEAD" || routes[0].DeprecatedAt != 1788134400 || routes[0].Sunset == "" {
		t.Fatalf("route = %#v", routes)
	}
}
