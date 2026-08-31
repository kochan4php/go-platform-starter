output "server_id" {
  value = hcloud_server.platform.id
}

output "ipv4_address" {
  value = hcloud_server.platform.ipv4_address
}

output "ipv6_address" {
  value = hcloud_server.platform.ipv6_address
}
