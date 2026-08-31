variable "hcloud_token" {
  description = "Hetzner Cloud API token; pass through TF_VAR_hcloud_token."
  type        = string
  sensitive   = true
}

variable "name" {
  type    = string
  default = "go-platform-prod"
}

variable "location" {
  type    = string
  default = "fsn1"
}

variable "server_type" {
  type    = string
  default = "cx33"
}

variable "image" {
  type    = string
  default = "ubuntu-24.04"
}

variable "ssh_key_ids" {
  description = "Existing Hetzner SSH key IDs. Password login is disabled by bootstrap."
  type        = list(number)
}

variable "admin_ssh_public_keys" {
  description = "OpenSSH public keys installed for admin_user by cloud-init."
  type        = list(string)

  validation {
    condition     = length(var.admin_ssh_public_keys) > 0
    error_message = "admin_ssh_public_keys must contain at least one public key."
  }
}

variable "admin_cidrs" {
  description = "IPv4/IPv6 CIDRs allowed to connect to SSH. Never use 0.0.0.0/0."
  type        = list(string)

  validation {
    condition     = length(var.admin_cidrs) > 0 && !contains(var.admin_cidrs, "0.0.0.0/0") && !contains(var.admin_cidrs, "::/0")
    error_message = "admin_cidrs must contain at least one restricted network and must not expose SSH globally."
  }
}

variable "admin_user" {
  type    = string
  default = "platform"
}
