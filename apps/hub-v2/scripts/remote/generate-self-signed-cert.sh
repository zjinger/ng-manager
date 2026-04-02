#!/usr/bin/env bash
# 生成 Hub V2 自签名 HTTPS 证书（包含 SAN）
# 用法：
#   generate-self-signed-cert.sh [domain_or_ip]
# 示例：
#   /opt/ngm-hub-v2/bin/generate-self-signed-cert.sh 192.168.1.31

set -euo pipefail

APP_ROOT="/opt/ngm-hub-v2"
SHARED_DIR="$APP_ROOT/shared"
SSL_DIR="$SHARED_DIR/ssl"
TARGET="${1:-localhost}"

KEY_FILE="$SSL_DIR/tls.key"
CERT_FILE="$SSL_DIR/tls.crt"
CONF_FILE="$SSL_DIR/openssl-san.cnf"

mkdir -p "$SSL_DIR"

if [[ "$TARGET" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
  SAN="subjectAltName=IP:${TARGET},DNS:localhost"
else
  SAN="subjectAltName=DNS:${TARGET},DNS:localhost"
fi

cat > "$CONF_FILE" <<EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = ${TARGET}

[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
${SAN}
EOF

openssl req \
  -x509 \
  -nodes \
  -newkey rsa:2048 \
  -days 3650 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -config "$CONF_FILE"

chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

echo "[cert] generated"
echo "[cert] key : $KEY_FILE"
echo "[cert] cert: $CERT_FILE"

