#!/bin/bash
# Asks for one secret without showing it and writes it where the deployer reads it (docs/vps-setup.md section 11; plan
# decision 7). You run it in your own terminal through ssh -t, as root; the value never reaches the chat, a command
# line, the shell history or a log: read and printf are bash builtins, and caddy hash-password reads it from stdin.
#   bash /opt/ao/kit/vps/ao-secret.sh jira                         the read-only Jira token of the CI account
#   bash /opt/ao/kit/vps/ao-secret.sh basic-auth                   the password of the user ao on Development and Staging
#   bash /opt/ao/kit/vps/ao-secret.sh env <project> <environment> <NAME>   one variable of an app
set -euo pipefail
umask 077

# Creates `file` empty, root:aodeploy 0640, before any secret goes in.
private_file() {
  install -o root -g aodeploy -m 640 /dev/null "$1"
}

case "${1:-}" in
  jira)
    read -rsp 'Read-only Jira token: ' value; echo
    private_file /etc/ao/jira-read.token
    printf '%s' "$value" > /etc/ao/jira-read.token
    ;;
  basic-auth)
    read -rsp 'Basic auth password for the user ao: ' value; echo
    hash=$(printf '%s\n' "$value" | docker exec -i caddy caddy hash-password)
    private_file /etc/ao/caddy/basic-auth
    printf 'ao %s\n' "$hash" > /etc/ao/caddy/basic-auth
    ;;
  env)
    project="${2:-}"; environment="${3:-}"; name="${4:-}"
    [[ "$project" =~ ^[a-z][a-z0-9-]*$ ]] || { echo "a project name is like pilot" >&2; exit 1; }
    [[ "$environment" =~ ^(development|staging|production)$ ]] || { echo "the environment is development, staging or production" >&2; exit 1; }
    [[ "$name" =~ ^[A-Z_][A-Z0-9_]*$ ]] || { echo "a variable name is like DATABASE_URL" >&2; exit 1; }
    read -rsp "Value of $name for $project $environment: " value; echo
    dir="/etc/ao/secrets/$project"
    file="$dir/$environment.env"
    install -d -o root -g aodeploy -m 750 "$dir"
    [ -e "$file" ] || private_file "$file"
    private_file "$file.new"
    grep -v "^$name=" "$file" > "$file.new" || true
    printf '%s=%s\n' "$name" "$value" >> "$file.new"
    mv "$file.new" "$file"
    ;;
  *)
    echo "usage: ao-secret.sh jira | basic-auth | env <project> <environment> <NAME>" >&2
    exit 1
    ;;
esac
echo "Saved."
