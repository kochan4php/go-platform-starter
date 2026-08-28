package platform

// AuthorizeResource centralizes own-vs-any checks for resource handlers.
func AuthorizeResource(actorID, ownerID string, permissions []string, ownPermission, anyPermission string) bool {
	for _, permission := range permissions {
		if permission == anyPermission || (actorID == ownerID && permission == ownPermission) {
			return true
		}
	}
	return false
}
