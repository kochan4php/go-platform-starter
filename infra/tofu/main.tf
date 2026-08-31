resource "hcloud_firewall" "platform" {
  name = "${var.name}-edge"

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = var.admin_cidrs
    description = "Restricted administrative SSH"
  }

  dynamic "rule" {
    for_each = toset(["80", "443"])
    content {
      direction   = "in"
      protocol    = "tcp"
      port        = rule.value
      source_ips  = ["0.0.0.0/0", "::/0"]
      description = "Public web traffic"
    }
  }

  rule {
    direction   = "in"
    protocol    = "icmp"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "Path MTU and reachability"
  }
}

resource "hcloud_server" "platform" {
  name         = var.name
  location     = var.location
  server_type  = var.server_type
  image        = var.image
  ssh_keys     = var.ssh_key_ids
  firewall_ids = [hcloud_firewall.platform.id]
  backups      = true
  user_data = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    admin_user            = var.admin_user
    admin_ssh_public_keys = var.admin_ssh_public_keys
  })

  labels = {
    application = "go-platform"
    environment = "production"
    managed_by  = "opentofu"
  }

  lifecycle {
    prevent_destroy = true
  }
}
