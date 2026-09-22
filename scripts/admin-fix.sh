#!/bin/bash
echo "Fixing admin password..."
HASH=$(docker exec estimateos-api node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('Admin@123!', 12).then(h => console.log(h));
")

docker exec estimateos-postgres psql -U estimateos -d estimateos -c \
  "UPDATE users SET password_hash = '$HASH', status = 'active' WHERE email = 'admin@estimateos.com';"

echo "Done! Testing login..."
curl -s -X POST https://api.valuscop.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@estimateos.com","password":"Admin@123!"}' | python3 -m json.tool



